import test from "node:test";
import assert from "node:assert/strict";
import { monitorPrivateTargets } from "../diagnostics/private-target-monitor.mjs";

const token = "private-monitor-token-that-must-not-leak";
const repository = "owner/private-repository";
const sha = "a".repeat(40);
const now = new Date("2026-11-22T01:00:00.000Z");
const config = {
  schema_version: 1,
  targets: [{
    id: "target-01",
    repository,
    branch: "main",
    expected_workflows: [{
      id: "workflow-ci",
      path: ".github/workflows/ci.yml",
      event: "push",
      expectation: "every_push",
      grace_minutes: 10,
    }],
  }],
};

function jsonResponse(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function branchResponse() {
  return {
    name: "main",
    commit: {
      sha,
      commit: { committer: { date: "2026-11-22T00:00:00.000Z" } },
    },
  };
}

function sourceRun(overrides = {}) {
  return {
    id: 700,
    name: "CI",
    workflow_id: 50,
    path: ".github/workflows/ci.yml",
    head_sha: sha,
    head_branch: "main",
    event: "push",
    status: "completed",
    conclusion: "failure",
    run_attempt: 1,
    check_suite_id: 88,
    html_url: "https://github.com/owner/private-repository/actions/runs/700",
    created_at: "2026-11-22T00:30:00.000Z",
    ...overrides,
  };
}

function runDetails(overrides = {}) {
  return {
    ...sourceRun(),
    repository: { full_name: repository },
    ...overrides,
  };
}

test("missing external credentials report BLOCKED, never a healthy zero", async () => {
  const record = await monitorPrivateTargets({
    targetsJson: JSON.stringify(config),
    token: "",
    now,
  });
  assert.equal(record.coverage_status, "BLOCKED");
  assert.equal(record.blocker, "PRIVATE_MONITOR_TOKEN_NOT_CONFIGURED");
});

test("missing target configuration reports BLOCKED without exposing repository details", async () => {
  const record = await monitorPrivateTargets({ token, targetsJson: "", now });
  assert.equal(record.coverage_status, "BLOCKED");
  assert.equal(record.blocker, "PRIVATE_TARGETS_JSON_NOT_CONFIGURED");
  assert.ok(!JSON.stringify(record).includes(repository));
});

test("no observed run plus an actual parser diagnostic classifies workflow syntax failure", async () => {
  const fetchImpl = async url => {
    const target = String(url);
    if (target.endsWith("/branches/main")) return jsonResponse(branchResponse());
    if (target.includes("/actions/runs?branch=main")) return jsonResponse({ workflow_runs: [] });
    if (target.includes("/contents/.github/workflows/ci.yml?ref=")) {
      return jsonResponse({ encoding: "base64", content: Buffer.from("name: bad\non: [push\n").toString("base64") });
    }
    throw new Error("Unexpected URL: " + target);
  };
  const record = await monitorPrivateTargets({
    targetsJson: JSON.stringify(config),
    token,
    fetchImpl,
    now,
    lintImpl: async () => ({
      status: "DIAGNOSTIC",
      diagnostic: "workflow:workflow-ci:3:0: could not parse as YAML: yaml: line 3: did not find expected ',' or ']'",
    }),
  });
  assert.equal(record.targets[0].status, "NO_RUN_OBSERVED");
  assert.equal(record.targets[0].classification, "WORKFLOW_YAML_SYNTAX_ERROR");
  assert.ok(!JSON.stringify(record).includes(repository));
  assert.ok(!JSON.stringify(record).includes(sha));
});

test("no observed run with a valid workflow remains UNKNOWN, not quota", async () => {
  const fetchImpl = async url => {
    const target = String(url);
    if (target.endsWith("/branches/main")) return jsonResponse(branchResponse());
    if (target.includes("/actions/runs?branch=main")) return jsonResponse({ workflow_runs: [] });
    if (target.includes("/contents/.github/workflows/ci.yml?ref=")) {
      return jsonResponse({ encoding: "base64", content: Buffer.from("name: CI\non:\n  push:\njobs: {}\n").toString("base64") });
    }
    throw new Error("Unexpected URL: " + target);
  };
  const record = await monitorPrivateTargets({
    targetsJson: JSON.stringify(config),
    token,
    fetchImpl,
    now,
    lintImpl: async () => ({ status: "VALID", diagnostic: "" }),
  });
  assert.equal(record.targets[0].status, "NO_RUN_OBSERVED");
  assert.equal(record.targets[0].classification, "UNKNOWN");
  assert.notEqual(record.targets[0].classification, "ACTIONS_BILLING_QUOTA_EXHAUSTED");
});

test("an explicit provider billing message from a private workflow check suite is quota evidence", async () => {
  const fetchImpl = async url => {
    const target = String(url);
    if (target.endsWith("/branches/main")) return jsonResponse(branchResponse());
    if (target.includes("/actions/runs?branch=main")) return jsonResponse({ workflow_runs: [sourceRun()] });
    if (target.includes("/contents/.github/workflows/ci.yml?ref=")) {
      return jsonResponse({ encoding: "base64", content: Buffer.from("name: CI\non:\n  push:\njobs: {}\n").toString("base64") });
    }
    if (target.endsWith("/actions/runs/700")) return jsonResponse(runDetails());
    if (target.endsWith("/attempts/1/jobs?per_page=100")) return jsonResponse({ jobs: [] });
    if (target.endsWith("/check-suites/88/check-runs?per_page=100")) {
      return jsonResponse({
        check_runs: [{
          id: 901,
          name: "GitHub Actions",
          status: "completed",
          conclusion: "failure",
          output: {
            title: "Workflow not started",
            summary: "The job was not started because your account is currently over its spending limit or has exceeded its included usage for GitHub Actions.",
            text: "",
          },
        }],
      });
    }
    if (target.endsWith("/check-runs/901/annotations?per_page=100")) return jsonResponse([]);
    throw new Error("Unexpected URL: " + target);
  };
  const record = await monitorPrivateTargets({
    targetsJson: JSON.stringify(config),
    token,
    fetchImpl,
    now,
    lintImpl: async () => ({ status: "VALID", diagnostic: "" }),
    sleepImpl: async () => {},
  });
  assert.equal(record.targets[0].status, "RUN_OBSERVED");
  assert.equal(record.targets[0].classification, "ACTIONS_BILLING_QUOTA_EXHAUSTED");
  assert.ok(!JSON.stringify(record).includes(repository));
});

test("runner_id zero and missing logs from a private run remain unknown, not quota", async () => {
  const fetchImpl = async url => {
    const target = String(url);
    if (target.endsWith("/branches/main")) return jsonResponse(branchResponse());
    if (target.includes("/actions/runs?branch=main")) return jsonResponse({ workflow_runs: [sourceRun()] });
    if (target.includes("/contents/.github/workflows/ci.yml?ref=")) {
      return jsonResponse({ encoding: "base64", content: Buffer.from("name: CI\non:\n  push:\njobs: {}\n").toString("base64") });
    }
    if (target.endsWith("/actions/runs/700")) return jsonResponse(runDetails());
    if (target.endsWith("/attempts/1/jobs?per_page=100")) {
      return jsonResponse({
        jobs: [{
          id: 101,
          run_id: 700,
          run_attempt: 1,
          head_sha: sha,
          runner_id: 0,
          runner_name: null,
          name: "validate",
          status: "completed",
          conclusion: "failure",
          steps: [],
          check_run_url: "https://api.github.com/repos/owner/private-repository/check-runs/101",
        }],
      });
    }
    if (target.endsWith("/check-runs/101/annotations?per_page=100")) return jsonResponse([]);
    if (target.endsWith("/actions/jobs/101/logs")) return jsonResponse({ message: "BlobNotFound" }, 404);
    if (target.endsWith("/check-suites/88/check-runs?per_page=100")) return jsonResponse({ check_runs: [] });
    throw new Error("Unexpected URL: " + target);
  };
  const record = await monitorPrivateTargets({
    targetsJson: JSON.stringify(config),
    token,
    fetchImpl,
    now,
    lintImpl: async () => ({ status: "VALID", diagnostic: "" }),
    sleepImpl: async () => {},
  });
  assert.equal(record.targets[0].classification, "UNKNOWN");
  assert.ok(record.targets[0].evidence_types.includes("EVIDENCE_GAP"));
  assert.notEqual(record.targets[0].classification, "ACTIONS_BILLING_QUOTA_EXHAUSTED");
});

test("generic private API 403 is a collector access error, not source permission or quota", async () => {
  const fetchImpl = async url => {
    const target = String(url);
    if (target.endsWith("/branches/main")) return jsonResponse({ message: "Resource not accessible by integration" }, 403);
    throw new Error("Unexpected URL: " + target);
  };
  const record = await monitorPrivateTargets({
    targetsJson: JSON.stringify(config),
    token,
    fetchImpl,
    now,
  });
  assert.equal(record.targets[0].status, "TARGET_API_ERROR");
  assert.equal(record.targets[0].classification, "UNKNOWN");
  assert.notEqual(record.targets[0].classification, "PERMISSION_OR_POLICY_DENIED");
  assert.notEqual(record.targets[0].classification, "ACTIONS_BILLING_QUOTA_EXHAUSTED");
});

test("push expectation must be explicitly every_push to avoid false missing-run alerts", async () => {
  const invalid = structuredClone(config);
  invalid.targets[0].expected_workflows[0].expectation = "path_filtered";
  const record = await monitorPrivateTargets({
    targetsJson: JSON.stringify(invalid),
    token,
    now,
  });
  assert.equal(record.coverage_status, "BLOCKED");
  assert.equal(record.blocker, "PUSH_EXPECTATION_MUST_BE_EXPLICIT");
});
