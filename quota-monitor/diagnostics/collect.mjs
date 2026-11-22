#!/usr/bin/env node
import { appendFile, readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { createGitHubApi, GitHubApiError } from "./github-api.mjs";
import { classifyJob, classifyRun, fieldState, sanitizeText } from "./classify.mjs";

function assert(condition, code) {
  if (!condition) throw new Error(code);
}

function validateEvent(event, repository) {
  assert(["requested", "in_progress", "completed"].includes(event?.action), "INVALID_EVENT_ACTION");
  assert(event?.repository?.full_name === repository, "EVENT_REPOSITORY_MISMATCH");

  const source = event.workflow_run;
  assert(source && typeof source === "object", "MISSING_WORKFLOW_RUN");
  assert(event.workflow && typeof event.workflow === "object", "MISSING_WORKFLOW_METADATA");
  assert(typeof event.workflow.name === "string" && event.workflow.name.length > 0, "MISSING_WORKFLOW_NAME");
  assert(typeof event.workflow.path === "string" && /^\.github\/workflows\/[A-Za-z0-9._/-]+\.ya?ml$/i.test(event.workflow.path), "INVALID_WORKFLOW_PATH");
  assert(!event.workflow.path.includes(".."), "INVALID_WORKFLOW_PATH");
  assert(source.path === event.workflow.path, "EVENT_WORKFLOW_PATH_MISMATCH");

  const runId = source.id;
  const attempt = source.run_attempt;
  const workflowId = source.workflow_id;
  assert(Number.isSafeInteger(runId) && runId > 0, "INVALID_RUN_ID");
  assert(Number.isSafeInteger(attempt) && attempt > 0, "INVALID_RUN_ATTEMPT");
  assert(Number.isSafeInteger(workflowId) && workflowId > 0, "INVALID_WORKFLOW_ID");
  assert(typeof source.head_sha === "string" && /^[a-f0-9]{40}$/i.test(source.head_sha), "INVALID_HEAD_SHA");
  assert(typeof source.head_branch === "string" && source.head_branch.length > 0, "MISSING_HEAD_BRANCH");

  const checkSuiteId = fieldState(source, "check_suite_id");
  if (checkSuiteId.state === "PRESENT") {
    assert(Number.isSafeInteger(checkSuiteId.value) && checkSuiteId.value > 0, "INVALID_CHECK_SUITE_ID");
  }

  return {
    repository,
    workflow: { id: workflowId, name: event.workflow.name, path: event.workflow.path },
    run_id: runId,
    run_attempt: attempt,
    check_suite_id: checkSuiteId,
    head_sha: source.head_sha,
    event: source.event ?? null,
    event_action: event.action,
    head_branch: source.head_branch,
    conclusion: source.conclusion ?? null,
    status: source.status ?? null,
    html_url: source.html_url ?? null,
    created_at: source.created_at ?? null,
    run_started_at: source.run_started_at ?? null,
    updated_at: source.updated_at ?? null,
  };
}

function validateRunDetails(run, source) {
  const checks = [
    [run?.id === source.run_id, "RUN_ID_MISMATCH"],
    [run?.run_attempt === source.run_attempt, "RUN_ATTEMPT_MISMATCH"],
    [run?.workflow_id === source.workflow.id, "WORKFLOW_ID_MISMATCH"],
    [run?.path === source.workflow.path, "WORKFLOW_PATH_MISMATCH"],
    [run?.head_sha === source.head_sha, "HEAD_SHA_MISMATCH"],
    [run?.head_branch === source.head_branch, "HEAD_BRANCH_MISMATCH"],
    [run?.event === source.event, "EVENT_TYPE_MISMATCH"],
    [run?.repository?.full_name === source.repository, "RUN_REPOSITORY_MISMATCH"],
  ];
  for (const [valid, code] of checks) assert(valid, code);
  if (source.conclusion !== null) assert(run?.conclusion === source.conclusion, "RUN_CONCLUSION_MISMATCH");
  if (source.check_suite_id.state === "PRESENT") {
    assert(run?.check_suite_id === source.check_suite_id.value, "CHECK_SUITE_ID_MISMATCH");
  }
}

function parseCheckRunUrl(value, repository, apiOrigin) {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    const [owner, repo] = repository.split("/");
    const prefix = "/repos/" + owner + "/" + repo + "/check-runs/";
    if (url.origin !== apiOrigin || !url.pathname.startsWith(prefix)) return null;
    const idText = url.pathname.slice(prefix.length);
    if (!/^\d+$/.test(idText) || Number(idText) <= 0) return null;
    if (url.search || url.hash) return null;
    return { id: Number(idText), url: url.toString() };
  } catch {
    return null;
  }
}

function summarizeAnnotation(annotation, includeRawDetails = false) {
  const record = {
    path: sanitizeText(annotation.path),
    start_line: annotation.start_line ?? null,
    end_line: annotation.end_line ?? null,
    annotation_level: sanitizeText(annotation.annotation_level),
    title: sanitizeText(annotation.title),
    message: sanitizeText(annotation.message),
  };
  if (includeRawDetails) record.raw_details = sanitizeText(annotation.raw_details);
  return record;
}

function summarizeStep(step) {
  return {
    number: step.number ?? null,
    name: sanitizeText(step.name),
    status: step.status ?? null,
    conclusion: step.conclusion ?? null,
    started_at: step.started_at ?? null,
    completed_at: step.completed_at ?? null,
  };
}

function errorRecord(error) {
  if (error instanceof GitHubApiError) {
    return { status: "API_ERROR", http_status: error.status, retry_after: error.retryAfter, code: error.code };
  }
  return { status: "API_ERROR", http_status: null, retry_after: null, code: sanitizeText(error?.message || "UNEXPECTED_API_ERROR") };
}

async function collectAnnotations({ api, repository, checkRunId }) {
  const url = "/repos/" + repository + "/check-runs/" + checkRunId + "/annotations?per_page=100";
  const page = await api.paginate(url, null);
  return { status: "RETRIEVED", annotation_count: page.items.length, page_count: page.pageCount, annotations: page.items.map(item => summarizeAnnotation(item)), raw: page.items };
}

async function collectCheckSuite({ api, source }) {
  if (source.check_suite_id.state !== "PRESENT") {
    return { status: "NOT_AVAILABLE", check_suite_id: source.check_suite_id, page_count: 0, check_runs: [] };
  }
  try {
    const url = "/repos/" + source.repository + "/check-suites/" + source.check_suite_id.value + "/check-runs?per_page=100";
    const page = await api.paginate(url, "check_runs");
    const checkRuns = [];
    for (const item of page.items) {
      const record = {
        id: fieldState(item, "id"),
        name: sanitizeText(item.name),
        status: item.status ?? null,
        conclusion: item.conclusion ?? null,
        started_at: item.started_at ?? null,
        completed_at: item.completed_at ?? null,
        app_slug: sanitizeText(item.app?.slug),
        output: {
          title: sanitizeText(item.output?.title),
          summary: sanitizeText(item.output?.summary),
          text: sanitizeText(item.output?.text),
        },
        annotations_status: "NOT_REQUESTED",
        annotation_count: 0,
        annotation_page_count: 0,
        annotations: [],
      };
      if (record.id.state === "PRESENT" && Number.isSafeInteger(record.id.value) && record.id.value > 0) {
        try {
          const annotations = await collectAnnotations({ api, repository: source.repository, checkRunId: record.id.value });
          record.annotations_status = annotations.status;
          record.annotation_count = annotations.annotation_count;
          record.annotation_page_count = annotations.page_count;
          record.annotations = annotations.raw.map(item => summarizeAnnotation(item, true));
        } catch (error) {
          Object.assign(record, { annotations_status: "API_ERROR", annotations_error: errorRecord(error) });
        }
      }
      checkRuns.push(record);
    }
    return { status: "RETRIEVED", check_suite_id: source.check_suite_id, page_count: page.pageCount, check_runs: checkRuns };
  } catch (error) {
    return { status: "API_ERROR", check_suite_id: source.check_suite_id, page_count: 0, check_runs: [], error: errorRecord(error) };
  }
}

async function collectJob({ api, job, source }) {
  const correlation = {
    run_id: fieldState(job, "run_id"),
    run_attempt: fieldState(job, "run_attempt"),
    head_sha: fieldState(job, "head_sha"),
  };
  const jobId = fieldState(job, "id");
  const mismatch =
    (correlation.run_id.state === "PRESENT" && correlation.run_id.value !== source.run_id) ||
    (correlation.run_attempt.state === "PRESENT" && correlation.run_attempt.value !== source.run_attempt) ||
    (correlation.head_sha.state === "PRESENT" && correlation.head_sha.value !== source.head_sha);
  const incompleteIdentity =
    correlation.run_id.state !== "PRESENT" ||
    correlation.head_sha.state !== "PRESENT" ||
    jobId.state !== "PRESENT" ||
    !Number.isSafeInteger(jobId.value) ||
    jobId.value <= 0;

  const result = {
    job_id: jobId,
    run_id: correlation.run_id,
    run_attempt: correlation.run_attempt,
    head_sha: correlation.head_sha,
    runner_id: fieldState(job, "runner_id"),
    runner_name: fieldState(job, "runner_name"),
    steps_state: fieldState(job, "steps"),
    name: sanitizeText(job.name),
    status: job.status ?? null,
    conclusion: job.conclusion ?? null,
    started_at: job.started_at ?? null,
    completed_at: job.completed_at ?? null,
    steps: (Array.isArray(job.steps) ? job.steps : []).map(summarizeStep),
    correlation_status: mismatch ? "MISMATCH" : incompleteIdentity ? "INCOMPLETE" : "MATCHED",
    check_run: { status: "NOT_RESOLVED", id: null, url: null, annotation_count: 0, page_count: 0, annotations: [] },
    logs: { status: "NOT_REQUESTED", attempts: 0, http_status: null, retry_after: null },
    classification: "UNKNOWN",
    primary_classification: "UNKNOWN",
    classifications: ["UNKNOWN"],
    evidence: [],
    evidence_gap: true,
  };

  if (mismatch || incompleteIdentity) {
    result.check_run.status = mismatch ? "SKIPPED_CORRELATION_MISMATCH" : "SKIPPED_INCOMPLETE_IDENTITY";
    result.logs.status = mismatch ? "SKIPPED_CORRELATION_MISMATCH" : "SKIPPED_INCOMPLETE_IDENTITY";
    result.evidence.push({
      source: "job_metadata",
      type: mismatch ? "IDENTITY_MISMATCH" : "IDENTITY_INCOMPLETE",
      message: mismatch
        ? "Job identity does not match the triggering run attempt and SHA."
        : "Job run_id, head_sha, or job_id is missing; source evidence was not fetched.",
    });
    return result;
  }

  let rawAnnotations = [];
  const checkRun = parseCheckRunUrl(job.check_run_url, source.repository, api.apiOrigin);
  if (!checkRun) {
    result.check_run.status = "INVALID_CHECK_RUN_URL";
  } else {
    result.check_run = {
      status: "PENDING",
      id: checkRun.id,
      url: checkRun.url,
      annotation_count: 0,
      page_count: 0,
      annotations: [],
    };
    try {
      const annotations = await collectAnnotations({ api, repository: source.repository, checkRunId: checkRun.id });
      rawAnnotations = annotations.raw;
      result.check_run.status = annotations.status;
      result.check_run.annotation_count = annotations.annotation_count;
      result.check_run.page_count = annotations.page_count;
      result.check_run.annotations = annotations.annotations;
    } catch (error) {
      Object.assign(result.check_run, errorRecord(error));
    }
  }

  const isTerminalFailure = job.status === "completed" &&
    job.conclusion !== "success" && job.conclusion !== "skipped";
  let rawLogs = "";
  if (isTerminalFailure) {
    const logs = await api.downloadJobLogs(job.id);
    rawLogs = logs.text;
    result.logs = {
      status: logs.status,
      attempts: logs.attempts,
      http_status: logs.http_status,
      retry_after: logs.retry_after,
    };
  }

  const classification = classifyJob({
    job,
    annotations: rawAnnotations,
    logs: { status: result.logs.status, text: rawLogs },
  });
  result.classification = classification.classification;
  result.primary_classification = classification.primary_classification;
  result.classifications = classification.classifications;
  result.evidence = classification.evidence;
  result.evidence_gap = classification.evidence_gap;
  return result;
}

export async function collectDiagnostics({
  event,
  repository,
  token,
  apiUrl = "https://api.github.com",
  fetchImpl = globalThis.fetch,
  sleepImpl,
  observerSha = null,
  recordedAt = new Date().toISOString(),
  workflowDiagnostic = "",
  workflowDiagnosticStatus = "NOT_PROVIDED",
  lifecyclePolls = 0,
  lifecyclePollDelayMs = 15000,
} = {}) {
  const source = validateEvent(event, repository);
  const api = createGitHubApi({ token, apiUrl, fetchImpl, sleepImpl });
  const [owner, repo] = repository.split("/");
  api.setRepository(owner, repo);

  const runUrl = "/repos/" + owner + "/" + repo + "/actions/runs/" + source.run_id;
  const jobsUrl = "/repos/" + owner + "/" + repo + "/actions/runs/" + source.run_id +
    "/attempts/" + source.run_attempt + "/jobs?per_page=100";
  let { data: run } = await api.getJson(runUrl);
  validateRunDetails(run, source);

  async function fetchJobs() {
    try {
      return { status: "RETRIEVED", page: await api.paginate(jobsUrl, "jobs") };
    } catch (error) {
      return { status: "API_ERROR", page: { items: [], pageCount: 0, error: errorRecord(error) } };
    }
  }
  let jobsResult = await fetchJobs();
  let jobsPage = jobsResult.page;
  let jobsStatus = jobsResult.status;
  let lifecyclePollCount = 0;
  let lifecyclePollError = null;
  const wait = sleepImpl || (milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds)));
  const hasRunnerOrSteps = items => items.some(job =>
    (Number.isSafeInteger(job.runner_id) && job.runner_id > 0) ||
    (Array.isArray(job.steps) && job.steps.length > 0)
  );

  while (
    source.event_action === "requested" &&
    lifecyclePollCount < lifecyclePolls &&
    jobsStatus === "RETRIEVED" &&
    run.status !== "completed" &&
    !hasRunnerOrSteps(jobsPage.items)
  ) {
    await wait(lifecyclePollDelayMs);
    lifecyclePollCount += 1;
    try {
      const refreshed = await api.getJson(runUrl);
      validateRunDetails(refreshed.data, source);
      run = refreshed.data;
      jobsResult = await fetchJobs();
      jobsPage = jobsResult.page;
      jobsStatus = jobsResult.status;
      if (jobsStatus !== "RETRIEVED") {
        lifecyclePollError = jobsPage.error ?? { status: "API_ERROR", code: "JOBS_REFRESH_FAILED" };
        break;
      }
    } catch (error) {
      lifecyclePollError = errorRecord(error);
      break;
    }
  }

  const lifecycleObservation = {
    requested_event_poll_count: lifecyclePollCount,
    poll_delay_ms: lifecyclePollDelayMs,
    final_run_status: run.status ?? null,
    runner_or_steps_observed: hasRunnerOrSteps(jobsPage.items),
    jobs_status: jobsStatus,
    poll_error: lifecyclePollError,
  };

  const jobs = [];
  for (const job of jobsPage.items) jobs.push(await collectJob({ api, job, source }));
  if (source.check_suite_id.state !== "PRESENT" && Number.isSafeInteger(run.check_suite_id) && run.check_suite_id > 0) {
    source.check_suite_id = { state: "PRESENT", value: run.check_suite_id };
  }
  const checkSuite = await collectCheckSuite({ api, source });
  const runClassification = classifyRun({
    source: { ...source, status: run.status ?? source.status, conclusion: run.conclusion ?? source.conclusion },
    jobs,
    jobsStatus,
    checkSuite,
    workflowDiagnostic,
    workflowDiagnosticStatus,
    lifecyclePolls: Number(process.env.LIFECYCLE_POLL_COUNT || 0),
    lifecyclePollDelayMs: Number(process.env.LIFECYCLE_POLL_DELAY_MS || 15000),
  });
  for (const checkRun of checkSuite.check_runs || []) {
    for (const annotation of checkRun.annotations || []) delete annotation.raw_details;
  }

  return {
    schema_version: 2,
    recorded_at: recordedAt,
    source: {
      ...source,
      status: run.status ?? source.status,
      conclusion: run.conclusion ?? source.conclusion,
      check_suite_id: source.check_suite_id,
      jobs_status: jobsStatus,
      jobs_page_count: jobsPage.pageCount,
      job_count: jobsStatus === "RETRIEVED" ? jobsPage.items.length : null,
      jobs_error: jobsPage.error ?? null,
    },
    workflow_definition: {
      status: workflowDiagnosticStatus,
      diagnostic: sanitizeText(workflowDiagnostic),
    },
    check_suite: checkSuite,
    lifecycle_observation: lifecycleObservation,
    run_classification: runClassification,
    collector: {
      workflow_sha: observerSha,
      api_version: "2026-03-10",
      mode: "READ_ONLY",
      raw_logs_persisted: false,
      token_emitted: false,
    },
    jobs,
  };
}

export function renderSummary(record) {
  const lines = [
    "# GitHub Actions run diagnostics",
    "",
    "- Source workflow: " + record.source.workflow.name,
    "- Source path: " + record.source.workflow.path,
    "- Source run: [" + record.source.run_id + "](" + (record.source.html_url || "") + ")",
    "- Event action: " + record.source.event_action,
    "- Attempt: " + record.source.run_attempt,
    "- Source SHA: " + record.source.head_sha,
    "- Status / conclusion: " + (record.source.status || "UNKNOWN") + " / " + (record.source.conclusion || "UNKNOWN"),
    "- Check suite: " + (record.source.check_suite_id.value ?? record.source.check_suite_id.state),
    "- Jobs collection: " + record.source.jobs_status + " (" + (record.source.job_count ?? "UNKNOWN") + " jobs)",
    "- Requested-event polls: " + record.lifecycle_observation.requested_event_poll_count +
      "; runner/steps observed: " + record.lifecycle_observation.runner_or_steps_observed,
    "- Run classification: " + record.run_classification.classification,
    "- All classifications: " + record.run_classification.classifications.join(", "),
    "- Workflow definition evidence: " + record.workflow_definition.status,
    "- Check suite evidence: " + record.check_suite.status,
    "",
    "| Job ID | Runner ID | Steps field | Check Run ID | Conclusion | Annotations | Logs | Classification |",
    "| ---: | ---: | --- | ---: | --- | ---: | --- | --- |",
  ];
  for (const job of record.jobs) {
    const runner = job.runner_id.state === "PRESENT" ? job.runner_id.value : job.runner_id.state;
    const check = job.check_run.id ?? job.check_run.status;
    const steps = job.steps_state.state === "PRESENT"
      ? (Array.isArray(job.steps_state.value) ? job.steps_state.value.length : "NOT_ARRAY")
      : job.steps_state.state;
    lines.push("| " + (job.job_id.value ?? job.job_id.state) + " | " + runner + " | " + steps +
      " | " + check + " | " + (job.conclusion ?? "UNKNOWN") + " | " +
      job.check_run.annotation_count + " | " + job.logs.status + " | " +
      job.primary_classification + " |");
  }
  lines.push("", "Raw job logs are not persisted. Only sanitized evidence snippets and provider metadata are retained.");
  for (const item of record.run_classification.evidence) {
    lines.push("- Run evidence (" + item.type + ", " + item.source + "): " + item.message);
  }
  for (const job of record.jobs) {
    for (const item of job.evidence) {
      lines.push("- Job " + (job.job_id.value ?? "unknown") + " (" + item.type + ", " + item.source + "): " + item.message);
    }
  }
  lines.push("", "A missing job, runner_id=0, empty steps, unavailable logs, or API error is not quota proof.");
  return lines.join("\n") + "\n";
}

async function main() {
  const token = process.env.GITHUB_TOKEN;
  const repository = process.env.GITHUB_REPOSITORY;
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!eventPath) throw new Error("MISSING_GITHUB_EVENT_PATH");
  const event = JSON.parse(await readFile(eventPath, "utf8"));
  let workflowDiagnostic = "";
  let workflowDiagnosticStatus = process.env.WORKFLOW_DIAGNOSTIC_STATUS || "NOT_PROVIDED";
  if (process.env.WORKFLOW_DIAGNOSTIC_PATH) {
    try {
      workflowDiagnostic = await readFile(process.env.WORKFLOW_DIAGNOSTIC_PATH, "utf8");
      if (workflowDiagnosticStatus === "NOT_PROVIDED") workflowDiagnosticStatus = "RETRIEVED";
    } catch {
      workflowDiagnosticStatus = "UNAVAILABLE";
    }
  }
  const record = await collectDiagnostics({
    event,
    repository,
    token,
    apiUrl: process.env.GITHUB_API_URL || "https://api.github.com",
    observerSha: process.env.OBSERVER_SHA || null,
    workflowDiagnostic,
    workflowDiagnosticStatus,
  });
  process.stdout.write(JSON.stringify(record) + "\n");
  if (process.env.GITHUB_STEP_SUMMARY) {
    await appendFile(process.env.GITHUB_STEP_SUMMARY, renderSummary(record), "utf8");
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    process.stderr.write("ACTIONS_DIAGNOSTICS_FAILED: " + sanitizeText(error.message) + "\n");
    process.exitCode = 1;
  });
}
