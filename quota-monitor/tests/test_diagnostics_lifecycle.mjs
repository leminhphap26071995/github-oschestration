import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { classifyJob, classifyRun } from "../diagnostics/classify.mjs";
import { collectDiagnostics } from "../diagnostics/collect.mjs";

const repository = "owner/repository";
const token = "test-token-that-must-not-be-serialized";
const sha = "a".repeat(40);
const root = "https://api.github.com";

function jsonResponse(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function event(overrides = {}) {
  const source = {
    id: 700,
    run_attempt: 2,
    workflow_id: 50,
    check_suite_id: 88,
    path: ".github/workflows/failing.yml",
    head_sha: sha,
    head_branch: "feature/diagnostics",
    event: "push",
    conclusion: "failure",
    status: "completed",
    html_url: "https://github.com/owner/repository/actions/runs/700",
    ...overrides,
  };
  return {
    action: "completed",
    repository: { full_name: repository },
    workflow: {
      id: 50,
      name: "Failing workflow",
      path: ".github/workflows/failing.yml",
    },
    workflow_run: source,
  };
}

function runDetails(overrides = {}) {
  return {
    id: 700,
    run_attempt: 2,
    workflow_id: 50,
    check_suite_id: 88,
    path: ".github/workflows/failing.yml",
    head_sha: sha,
    head_branch: "feature/diagnostics",
    event: "push",
    conclusion: "failure",
    status: "completed",
    repository: { full_name: repository },
    ...overrides,
  };
}

test("a real actionlint parser diagnostic classifies a zero-job run as workflow syntax failure", async () => {
  const calls = [];
  const fetchImpl = async url => {
    const target = String(url);
    calls.push(target);
    if (target.endsWith("/actions/runs/700")) return jsonResponse(runDetails());
    if (target.endsWith("/attempts/2/jobs?per_page=100")) return jsonResponse({ jobs: [] });
    if (target.endsWith("/check-suites/88/check-runs?per_page=100")) return jsonResponse({ check_runs: [] });
    throw new Error("Unexpected URL: " + target);
  };
  const record = await collectDiagnostics({
    event: event(),
    repository,
    token,
    fetchImpl,
    workflowDiagnostic: ".github/workflows/failing.yml:3:0: could not parse as YAML: yaml: line 3: did not find expected ',' or ']' [syntax-check]",
    workflowDiagnosticStatus: "RETRIEVED",
  });
  assert.equal(record.source.job_count, 0);
  assert.equal(record.run_classification.classification, "WORKFLOW_YAML_SYNTAX_ERROR");
  assert.ok(calls.some(url => url.includes("/check-suites/88/check-runs")));
  assert.ok(!JSON.stringify(record).includes(token));
});

test("an explicit provider billing message in a workflow-level check run classifies quota exhaustion", async () => {
  const fetchImpl = async url => {
    const target = String(url);
    if (target.endsWith("/actions/runs/700")) return jsonResponse(runDetails());
    if (target.endsWith("/attempts/2/jobs?per_page=100")) return jsonResponse({ jobs: [] });
    if (target.endsWith("/check-suites/88/check-runs?per_page=100")) {
      return jsonResponse({
        check_runs: [{
          id: 901,
          name: "GitHub Actions",
          app: { slug: "github-actions" },
          status: "completed",
          conclusion: "failure",
          output: {
            title: "Workflow run was not started",
            summary: "The job was not started because your account is currently over its spending limit or has exceeded its included usage for GitHub Actions.",
            text: "",
          },
        }],
      });
    }
    if (target.endsWith("/check-runs/901/annotations?per_page=100")) return jsonResponse([]);
    throw new Error("Unexpected URL: " + target);
  };
  const record = await collectDiagnostics({ event: event(), repository, token, fetchImpl });
  assert.equal(record.source.job_count, 0);
  assert.equal(record.run_classification.classification, "ACTIONS_BILLING_QUOTA_EXHAUSTED");
  assert.equal(record.check_suite.check_runs[0].id.value, 901);
});

test("zero jobs, runner_id absence and unavailable logs never imply quota", async () => {
  const fetchImpl = async url => {
    const target = String(url);
    if (target.endsWith("/actions/runs/700")) return jsonResponse(runDetails());
    if (target.endsWith("/attempts/2/jobs?per_page=100")) return jsonResponse({ jobs: [] });
    if (target.endsWith("/check-suites/88/check-runs?per_page=100")) return jsonResponse({ check_runs: [] });
    throw new Error("Unexpected URL: " + target);
  };
  const record = await collectDiagnostics({ event: event(), repository, token, fetchImpl });
  assert.equal(record.run_classification.classification, "UNKNOWN");
  assert.equal(record.run_classification.evidence_gap, true);
  assert.notEqual(record.run_classification.classification, "ACTIONS_BILLING_QUOTA_EXHAUSTED");
});

test("a jobs API failure is not normalized into a zero-job source run", async () => {
  const fetchImpl = async url => {
    const target = String(url);
    if (target.endsWith("/actions/runs/700")) return jsonResponse(runDetails());
    if (target.endsWith("/attempts/2/jobs?per_page=100")) return jsonResponse({ message: "Resource not accessible by integration" }, 403);
    if (target.endsWith("/check-suites/88/check-runs?per_page=100")) return jsonResponse({ check_runs: [] });
    throw new Error("Unexpected URL: " + target);
  };
  const record = await collectDiagnostics({ event: event(), repository, token, fetchImpl });
  assert.equal(record.source.jobs_status, "API_ERROR");
  assert.equal(record.source.job_count, null);
  assert.equal(record.run_classification.classification, "UNKNOWN");
  assert.ok(record.source.jobs_error.http_status === 403);
});

test("generic 403, 429, runner_id zero and empty steps are not quota or source permission proof", () => {
  const result = classifyJob({
    job: { id: 12, status: "completed", conclusion: "failure", runner_id: 0, steps: [] },
    annotations: [],
    logs: { status: "API_ERROR", http_status: 403, text: "" },
  });
  assert.equal(result.primary_classification, "UNKNOWN");
  assert.notEqual(result.classifications[0], "ACTIONS_BILLING_QUOTA_EXHAUSTED");
  assert.notEqual(result.classifications[0], "PERMISSION_OR_POLICY_DENIED");
});

test("step logs and workflow annotations cannot manufacture Actions billing quota evidence", () => {
  const result = classifyJob({
    job: {
      id: 12,
      status: "completed",
      conclusion: "failure",
      steps: [{ name: "Run tests", conclusion: "failure" }],
    },
    annotations: [{
      title: "Billing gate",
      message: "Actions billing spending limit exceeded.",
    }],
    logs: { status: "RETRIEVED", text: "Actions included minutes exhausted.\nAssertionError: expected 1 to equal 2\nProcess completed with exit code 1" },
  });
  assert.ok(!result.classifications.includes("ACTIONS_BILLING_QUOTA_EXHAUSTED"));
  assert.ok(result.classifications.includes("STEP_IMPLEMENTATION_FAILURE"));
});

test("quota classification requires the trusted GitHub Actions provider check-run output, not annotations or third-party checks", () => {
  const syntheticAnnotation = classifyRun({
    source: { status: "completed", conclusion: "failure" },
    jobs: [],
    jobsStatus: "RETRIEVED",
    checkSuite: {
      status: "RETRIEVED",
      check_runs: [{
        id: 901,
        name: "GitHub Actions",
        app_slug: "github-actions",
        output: { summary: "Workflow failed before any job could start." },
        annotations: [{ title: "Billing gate", message: "Actions billing spending limit exceeded." }],
      }],
    },
  });
  const thirdPartyOutput = classifyRun({
    source: { status: "completed", conclusion: "failure" },
    jobs: [],
    jobsStatus: "RETRIEVED",
    checkSuite: {
      status: "RETRIEVED",
      check_runs: [{
        id: 902,
        name: "Billing diagnostic",
        app_slug: "third-party-app",
        output: { summary: "Actions billing spending limit exceeded." },
        annotations: [],
      }],
    },
  });
  assert.equal(syntheticAnnotation.classification, "UNKNOWN");
  assert.equal(thirdPartyOutput.classification, "UNKNOWN");
});

test("a queued job without a runner is lifecycle state, not quota exhaustion", () => {
  const result = classifyJob({
    job: { id: 12, status: "queued", conclusion: null, runner_id: null, steps: [] },
    annotations: [],
    logs: { status: "NOT_REQUESTED", text: "" },
  });
  assert.equal(result.primary_classification, "RUNNER_NOT_ASSIGNED_YET");
  assert.notEqual(result.primary_classification, "ACTIONS_BILLING_QUOTA_EXHAUSTED");
});

test("workflow-level quota classification requires an explicit Actions billing message", () => {
  const positive = classifyRun({
    source: { status: "completed", conclusion: "failure" },
    jobs: [],
    jobsStatus: "RETRIEVED",
    checkSuite: {
      status: "RETRIEVED",
      check_runs: [{
        name: "GitHub Actions",
        app_slug: "github-actions",
        output: { summary: "GitHub Actions included minutes exhausted; further usage is blocked." },
        annotations: [],
      }],
    },
  });
  const negative = classifyRun({
    source: { status: "completed", conclusion: "failure" },
    jobs: [],
    jobsStatus: "RETRIEVED",
    checkSuite: {
      status: "RETRIEVED",
      check_runs: [{
        output: { summary: "Workflow failed. BlobNotFound. HTTP 403." },
        annotations: [],
      }],
    },
  });
  assert.equal(positive.classification, "ACTIONS_BILLING_QUOTA_EXHAUSTED");
  assert.equal(negative.classification, "UNKNOWN");
});


test("one scheduled quota monitor replaces workflow-run observer fan-out", async () => {
  const directory = ".github/workflows";
  const files = (await readdir(directory)).filter(name => /\.ya?ml$/i.test(name));
  const workflow = await readFile(directory + "/github-actions-quota-monitor.yml", "utf8");
  assert.match(workflow, /cron:\s*["']?\*\/15 \* \* \* \*["']?/);
  assert.match(workflow, /monitor:\s*\n\s+if:\s*github\.event_name == 'schedule'/);
  assert.match(workflow, /quota-monitor\/prepare_app_tokens\.mjs/);
  assert.match(workflow, /quota-monitor\/collect\.py/);
  assert.match(workflow, /quota-monitor\/publish-notion\.mjs/);
  assert.doesNotMatch(workflow, /workflow_run:/);
  assert.doesNotMatch(workflow, /workflow_dispatch:/);
  assert.ok(!files.includes("actions-run-diagnostics.yml"));
  assert.ok(!files.includes("github-api-usage-monitor-smoke.yml"));
  assert.ok(!files.includes("quota-token-permission-audit.yml"));
  assert.ok(!files.includes("annotation-cli-synthetic-failure.yml"));
  assert.ok(!files.includes("annotation-cli-synthetic-failure-observer.yml"));
  assert.ok(!files.includes("no-runner-annotation-observer.yml"));
  assert.ok(!files.includes("no-runner-annotation-readback.yml"));
});


test("retired action runtime and Actions admission policy are separate from quota", () => {
  const runtime = classifyJob({
    job: { id: 21, status: "completed", conclusion: "failure", steps: [{ name: "Workflow quality gate", conclusion: "failure" }] },
    annotations: [],
    logs: { status: "RETRIEVED", text: "The following actions use Node.js 20 runtime which is deprecated and no longer supported." },
  });
  const admission = classifyJob({
    job: { id: 22, status: "completed", conclusion: "failure", steps: [] },
    annotations: [{ title: "Policy", message: "GitHub Actions is disabled for this repository by organization policy." }],
    logs: { status: "NOT_REQUESTED", text: "" },
  });
  assert.ok(runtime.classifications.includes("ACTION_RUNTIME_RETIRED_OR_UNSUPPORTED"));
  assert.ok(admission.classifications.includes("ACTIONS_ADMISSION_BLOCKED"));
  assert.ok(!admission.classifications.includes("ACTIONS_BILLING_QUOTA_EXHAUSTED"));
});


test("requested event polls admission until a runner is assigned and preserves the lifecycle state", async () => {
  const requested = event({ status: "queued", conclusion: null });
  requested.action = "requested";
  let runReads = 0;
  let jobReads = 0;
  const fetchImpl = async url => {
    const target = String(url);
    if (target.endsWith("/actions/runs/700")) {
      runReads += 1;
      return jsonResponse(runReads === 1
        ? runDetails({ status: "queued", conclusion: null })
        : runDetails({ status: "in_progress", conclusion: null }));
    }
    if (target.endsWith("/attempts/2/jobs?per_page=100")) {
      jobReads += 1;
      return jsonResponse(jobReads === 1 ? { jobs: [] } : {
        jobs: [{
          id: 201,
          run_id: 700,
          run_attempt: 2,
          head_sha: sha,
          runner_id: 9001,
          runner_name: "GitHub Actions runner",
          name: "build",
          status: "in_progress",
          conclusion: null,
          steps: [],
          check_run_url: "https://api.github.com/repos/owner/repository/check-runs/901",
        }],
      });
    }
    if (target.endsWith("/check-runs/901/annotations?per_page=100")) return jsonResponse([]);
    if (target.endsWith("/check-suites/88/check-runs?per_page=100")) return jsonResponse({ check_runs: [] });
    throw new Error("Unexpected URL: " + target);
  };
  const record = await collectDiagnostics({
    event: requested,
    repository,
    token,
    fetchImpl,
    sleepImpl: async () => {},
    lifecyclePolls: 3,
    lifecyclePollDelayMs: 1,
  });
  assert.equal(record.lifecycle_observation.requested_event_poll_count, 1);
  assert.equal(record.lifecycle_observation.runner_or_steps_observed, true);
  assert.equal(record.run_classification.classification, "RUNNER_ASSIGNED");
  assert.equal(record.jobs[0].runner_id.value, 9001);
});

test("a queued run that never receives a runner remains an observation gap, not quota", async () => {
  const requested = event({ status: "queued", conclusion: null });
  requested.action = "requested";
  const fetchImpl = async url => {
    const target = String(url);
    if (target.endsWith("/actions/runs/700")) return jsonResponse(runDetails({ status: "queued", conclusion: null }));
    if (target.endsWith("/attempts/2/jobs?per_page=100")) return jsonResponse({ jobs: [] });
    if (target.endsWith("/check-suites/88/check-runs?per_page=100")) return jsonResponse({ check_runs: [] });
    throw new Error("Unexpected URL: " + target);
  };
  const record = await collectDiagnostics({
    event: requested,
    repository,
    token,
    fetchImpl,
    sleepImpl: async () => {},
    lifecyclePolls: 2,
    lifecyclePollDelayMs: 1,
  });
  assert.equal(record.lifecycle_observation.requested_event_poll_count, 2);
  assert.equal(record.run_classification.classification, "OBSERVATION_WINDOW_IN_PROGRESS");
  assert.notEqual(record.run_classification.classification, "ACTIONS_BILLING_QUOTA_EXHAUSTED");
});


test("a source quality-gate parser annotation is classified as workflow syntax, not a generic step failure", () => {
  const result = classifyJob({
    job: {
      id: 33,
      status: "completed",
      conclusion: "failure",
      steps: [{ name: "Workflow quality gate", conclusion: "failure" }],
    },
    annotations: [{
      path: ".github/workflows/zz-real-invalid-workflow.yml",
      start_line: 4,
      title: "actionlint",
      message: "could not parse as YAML: yaml: line 4: did not find expected ',' or ']'",
    }],
    logs: { status: "RETRIEVED", text: "Process completed with exit code 1" },
  });
  assert.equal(result.primary_classification, "WORKFLOW_YAML_SYNTAX_ERROR");
  assert.ok(result.classifications.includes("STEP_FAILURE"));
});


test("static-analysis warnings remain distinct from YAML syntax and step execution failures", () => {
  const result = classifyJob({
    job: {
      id: 34,
      status: "completed",
      conclusion: "failure",
      steps: [{ name: "Parse every committed workflow definition", conclusion: "failure" }],
    },
    annotations: [{
      path: ".github/workflows/workflow-cleanup.yml",
      start_line: 51,
      title: "actionlint",
      message: "shellcheck reported issue in this script: SC2034:warning:17:1: attempt appears unused",
    }],
    logs: { status: "RETRIEVED", text: "Process completed with exit code 1" },
  });
  assert.ok(result.classifications.includes("STATIC_ANALYSIS_WARNING"));
  assert.ok(result.classifications.includes("STEP_FAILURE"));
  assert.ok(!result.classifications.includes("ACTIONS_BILLING_QUOTA_EXHAUSTED"));
});


test("private billing credentials are isolated to the scheduled monitor and no public artifacts are produced", async () => {
  const workflow = await readFile(".github/workflows/github-actions-quota-monitor.yml", "utf8");
  const validateMatch = workflow.match(/^  validate:\\r?\\n([\\s\\S]*?)^  monitor:\\r?\\n/m);
  const monitorMatch = workflow.match(/^  monitor:\\r?\\n([\\s\\S]*)$/m);
  assert.ok(validateMatch && monitorMatch, "central workflow must expose validate and monitor jobs");
  const validateJob = validateMatch[1];
  const monitorJob = monitorMatch[1];
  assert.ok(monitorJob.includes("GITHUB_APP_ID: " + "$" + "{{ secrets.GITHUB_APP_ID }}"));
  assert.ok(monitorJob.includes("GITHUB_APP_PRIVATE_KEY: " + "$" + "{{ secrets.GITHUB_APP_PRIVATE_KEY }}"));
  assert.ok(monitorJob.includes("USER_BILLING_TOKEN: " + "$" + "{{ secrets.USER_BILLING_TOKEN }}"));
  assert.ok(monitorJob.includes("NOTION_API_TOKEN: " + "$" + "{{ secrets.NOTION_API_TOKEN }}"));
  assert.ok(!validateJob.includes("secrets."));
  assert.ok(!workflow.includes("workflow_run:"));
  assert.ok(!workflow.includes("hesreallyhim/github-api-usage-monitor"));
  assert.ok(!workflow.includes("upload-artifact"));
  assert.ok(monitorJob.includes("persist-credentials: false"));
  assert.ok(monitorJob.includes("permissions:\n      contents: read"));
});


test("disabled scheduled workflow state is an admission block, not quota exhaustion", () => {
  const result = classifyJob({
    job: {
      id: 35,
      status: "completed",
      conclusion: "failure",
      steps: [{ name: "Verify diagnostics observer workflow is enabled", conclusion: "failure" }],
    },
    annotations: [],
    logs: { status: "RETRIEVED", text: "Diagnostics observer workflow state: disabled_inactivity\nProcess completed with exit code 1" },
  });
  assert.ok(result.classifications.includes("ACTIONS_ADMISSION_BLOCKED"));
  assert.ok(!result.classifications.includes("ACTIONS_BILLING_QUOTA_EXHAUSTED"));
});
