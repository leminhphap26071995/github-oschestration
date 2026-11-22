#!/usr/bin/env node
import { appendFile, readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { createGitHubApi, GitHubApiError } from "./github-api.mjs";
import { classifyJob, fieldState, sanitizeText } from "./classify.mjs";

const SOURCES = {
  "GitHub Actions Credential Read Audit": ".github/workflows/quota-token-permission-audit.yml",
  "Portable AI Workflow Conformance": ".github/workflows/conformance.yml",
};

function assert(condition, code) {
  if (!condition) throw new Error(code);
}

function validateEvent(event, repository) {
  assert(event?.action === "completed", "INVALID_EVENT_ACTION");
  assert(event?.repository?.full_name === repository, "EVENT_REPOSITORY_MISMATCH");

  const source = event.workflow_run;
  assert(source && typeof source === "object", "MISSING_WORKFLOW_RUN");
  assert(Object.hasOwn(SOURCES, event.workflow?.name), "UNSUPPORTED_SOURCE_WORKFLOW");

  const expectedPath = SOURCES[event.workflow.name];
  assert(event.workflow.path === expectedPath, "EVENT_WORKFLOW_PATH_MISMATCH");
  assert(source.path === expectedPath, "EVENT_RUN_PATH_MISMATCH");
  assert(source.head_branch === "main", "SOURCE_BRANCH_MISMATCH");
  assert(source.conclusion && source.conclusion !== "success", "SOURCE_RUN_NOT_FAILED");

  const runId = source.id;
  const attempt = source.run_attempt;
  const workflowId = source.workflow_id;
  assert(Number.isSafeInteger(runId) && runId > 0, "INVALID_RUN_ID");
  assert(Number.isSafeInteger(attempt) && attempt > 0, "INVALID_RUN_ATTEMPT");
  assert(Number.isSafeInteger(workflowId) && workflowId > 0, "INVALID_WORKFLOW_ID");
  assert(typeof source.head_sha === "string" && /^[a-f0-9]{40}$/i.test(source.head_sha), "INVALID_HEAD_SHA");

  return {
    repository,
    workflow: { id: workflowId, name: event.workflow.name, path: expectedPath },
    run_id: runId,
    run_attempt: attempt,
    head_sha: source.head_sha,
    event: source.event,
    head_branch: source.head_branch,
    conclusion: source.conclusion,
    status: source.status,
    html_url: source.html_url,
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
    [run?.conclusion === source.conclusion, "RUN_CONCLUSION_MISMATCH"],
    [run?.repository?.full_name === source.repository, "RUN_REPOSITORY_MISMATCH"],
  ];
  for (const [valid, code] of checks) assert(valid, code);
}

function parseCheckRunUrl(value, repository, apiOrigin) {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    const [owner, repo] = repository.split("/");
    const prefix = `/repos/${owner}/${repo}/check-runs/`;
    if (url.origin !== apiOrigin || !url.pathname.startsWith(prefix)) return null;
    const idText = url.pathname.slice(prefix.length);
    if (!/^\d+$/.test(idText) || Number(idText) <= 0) return null;
    if (url.search || url.hash) return null;
    return { id: Number(idText), url: url.toString() };
  } catch {
    return null;
  }
}

function summarizeAnnotation(annotation) {
  return {
    path: sanitizeText(annotation.path),
    start_line: annotation.start_line ?? null,
    end_line: annotation.end_line ?? null,
    annotation_level: sanitizeText(annotation.annotation_level),
    title: sanitizeText(annotation.title),
    message: sanitizeText(annotation.message),
    raw_details: sanitizeText(annotation.raw_details),
  };
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
  return { status: "API_ERROR", http_status: null, retry_after: null, code: "UNEXPECTED_API_ERROR" };
}

async function collectJob({ api, job, source }) {
  const correlation = {
    run_id: fieldState(job, "run_id"),
    run_attempt: fieldState(job, "run_attempt"),
    head_sha: fieldState(job, "head_sha"),
  };
  const mismatch =
    (correlation.run_id.state === "PRESENT" && correlation.run_id.value !== source.run_id) ||
    (correlation.run_attempt.state === "PRESENT" && correlation.run_attempt.value !== source.run_attempt) ||
    (correlation.head_sha.state === "PRESENT" && correlation.head_sha.value !== source.head_sha);

  const result = {
    job_id: fieldState(job, "id"),
    run_id: correlation.run_id,
    run_attempt: correlation.run_attempt,
    head_sha: correlation.head_sha,
    runner_id: fieldState(job, "runner_id"),
    runner_name: fieldState(job, "runner_name"),
    name: sanitizeText(job.name),
    status: job.status ?? null,
    conclusion: job.conclusion ?? null,
    started_at: job.started_at ?? null,
    completed_at: job.completed_at ?? null,
    steps: (job.steps || []).map(summarizeStep),
    correlation_status: mismatch ? "MISMATCH" : "MATCHED_OR_FIELDS_MISSING",
    check_run: { status: "NOT_RESOLVED", id: null, url: null, annotation_count: 0, page_count: 0, annotations: [] },
    logs: { status: "NOT_REQUESTED", attempts: 0, http_status: null, retry_after: null },
    classification: "EXECUTION_EVIDENCE_MISSING",
    evidence: [],
  };

  if (mismatch) {
    result.correlation_status = "MISMATCH";
    result.check_run.status = "SKIPPED_CORRELATION_MISMATCH";
    result.logs.status = "SKIPPED_CORRELATION_MISMATCH";
    result.evidence.push({ source: "job_metadata", type: "IDENTITY_MISMATCH", message: "Job identity does not match the triggering run attempt and SHA." });
    return result;
  }

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
      const annotationsUrl = new URL(checkRun.url);
      annotationsUrl.pathname += "/annotations";
      annotationsUrl.searchParams.set("per_page", "100");
      const page = await api.paginate(annotationsUrl.toString(), null);
      result.check_run.status = "RETRIEVED";
      result.check_run.annotation_count = page.items.length;
      result.check_run.page_count = page.pageCount;
      result.check_run.annotations = page.items.map(summarizeAnnotation);
    } catch (error) {
      Object.assign(result.check_run, errorRecord(error));
    }
  }

  const isFailedJob = job.conclusion !== "success" && job.conclusion !== "skipped";
  let rawLogs = "";
  if (isFailedJob && Number.isSafeInteger(job.id) && job.id > 0) {
    const logs = await api.downloadJobLogs(job.id);
    rawLogs = logs.text;
    result.logs = {
      status: logs.status,
      attempts: logs.attempts,
      http_status: logs.http_status,
      retry_after: logs.retry_after,
    };
  }

  const annotationInputs = result.check_run.annotations || [];
  const classification = classifyJob({
    job,
    annotations: annotationInputs,
    logs: { status: result.logs.status, text: rawLogs },
  });
  result.classification = classification.classification;
  result.evidence = classification.evidence;
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
} = {}) {
  const source = validateEvent(event, repository);
  const api = createGitHubApi({ token, apiUrl, fetchImpl, sleepImpl });
  const [owner, repo] = repository.split("/");
  api.setRepository(owner, repo);

  const runUrl = `/repos/${owner}/${repo}/actions/runs/${source.run_id}`;
  const { data: run } = await api.getJson(runUrl);
  validateRunDetails(run, source);

  const jobsUrl = `/repos/${owner}/${repo}/actions/runs/${source.run_id}/attempts/${source.run_attempt}/jobs?per_page=100`;
  const jobsPage = await api.paginate(jobsUrl, "jobs");
  const jobs = [];
  for (const job of jobsPage.items) jobs.push(await collectJob({ api, job, source }));

  return {
    schema_version: 1,
    recorded_at: recordedAt,
    source: {
      ...source,
      jobs_page_count: jobsPage.pageCount,
    },
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
    `- Source workflow: ${record.source.workflow.name}`,
    `- Source run: [${record.source.run_id}](${record.source.html_url})`,
    `- Attempt: ${record.source.run_attempt}`,
    `- Source SHA: \`${record.source.head_sha}\``,
    `- Conclusion: ${record.source.conclusion}`,
    `- Jobs pages: ${record.source.jobs_page_count}`,
    "",
    "| Job ID | Runner ID | Check Run ID | Job conclusion | Annotations | Logs | Classification |",
    "| ---: | ---: | ---: | --- | ---: | --- | --- |",
  ];
  for (const job of record.jobs) {
    const runner = job.runner_id.state === "PRESENT" ? job.runner_id.value : job.runner_id.state;
    const check = job.check_run.id ?? job.check_run.status;
    lines.push(`| ${job.job_id.value ?? job.job_id.state} | ${runner} | ${check} | ${job.conclusion ?? "UNKNOWN"} | ${job.check_run.annotation_count} | ${job.logs.status} | ${job.classification} |`);
  }
  lines.push("", "Raw job logs are not persisted or uploaded. Evidence snippets are sanitized.");
  for (const job of record.jobs) {
    for (const item of job.evidence) {
      lines.push(`- Job ${job.job_id.value ?? "unknown"} (${item.type}, ${item.source}): ${item.message}`);
    }
  }
  return lines.join("\n") + "\n";
}

async function main() {
  const token = process.env.GITHUB_TOKEN;
  const repository = process.env.GITHUB_REPOSITORY;
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!eventPath) throw new Error("MISSING_GITHUB_EVENT_PATH");
  const event = JSON.parse(await readFile(eventPath, "utf8"));
  const record = await collectDiagnostics({
    event,
    repository,
    token,
    apiUrl: process.env.GITHUB_API_URL || "https://api.github.com",
    observerSha: process.env.OBSERVER_SHA || null,
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
