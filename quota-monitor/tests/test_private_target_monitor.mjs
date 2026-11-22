import test from "node:test";
import assert from "node:assert/strict";
import { evaluateBillingEvidence, monitorPrivateTargets } from "../diagnostics/private-target-monitor.mjs";

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

const runtimeAuditStub = async () => ({
  status: "SUPPORTED",
  classification: "UNKNOWN",
  evidence_types: [],
});

async function monitor(options) {
  return monitorPrivateTargets({ runtimeAuditImpl: runtimeAuditStub, ...options });
}

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
  const record = await monitor({
    targetsJson: JSON.stringify(config),
    token: "",
    now,
  });
  assert.equal(record.coverage_status, "BLOCKED");
  assert.equal(record.blocker, "PRIVATE_MONITOR_TOKEN_NOT_CONFIGURED");
});

test("missing target configuration reports BLOCKED without exposing repository details", async () => {
  const record = await monitor({ token, targetsJson: "", now });
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
  const record = await monitor({
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
  const record = await monitor({
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
  const record = await monitor({
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
  const record = await monitor({
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
  const record = await monitor({
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
  const record = await monitor({
    targetsJson: JSON.stringify(invalid),
    token,
    now,
  });
  assert.equal(record.coverage_status, "BLOCKED");
  assert.equal(record.blocker, "PUSH_EXPECTATION_MUST_BE_EXPLICIT");
});


test("fresh organization Actions hard-cap evidence is authoritative for a matching private target", () => {
  const snapshotState = {
    status: "RETRIEVED",
    snapshot: {
      collected_at_utc: "2026-11-22T00:50:00.000Z",
      remaining_included_minutes: "NOT_EXPOSED_BY_USAGE_SUMMARY_API",
      accounts: [{
        scope: "organization",
        owner: "owner",
        status: "OK",
        summary_error: null,
        budget: {
          status: "HARD_CAP_REACHED",
          items: [{
            scope: "organization",
            entity: "owner",
            product_skus: ["Actions"],
            prevent_further_usage: true,
            status: "HARD_CAP_REACHED",
          }],
        },
      }],
    },
  };
  const result = evaluateBillingEvidence({
    snapshotState,
    target: { repository, billing_scope: "organization" },
    now,
    maxAgeMinutes: 60,
  });
  assert.equal(result.status, "HARD_CAP_REACHED");
  assert.equal(result.classification, "ACTIONS_BILLING_QUOTA_EXHAUSTED");
  assert.equal(result.evidence_type, "BILLING_HARD_CAP_SNAPSHOT");
});

test("personal included Actions minutes remain UNKNOWN because the usage summary API does not expose remaining allowance", () => {
  const result = evaluateBillingEvidence({
    snapshotState: {
      status: "RETRIEVED",
      snapshot: {
        collected_at_utc: "2026-11-22T00:50:00.000Z",
        remaining_included_minutes: "NOT_EXPOSED_BY_USAGE_SUMMARY_API",
        accounts: [{
          scope: "user",
          owner: "owner",
          status: "OK",
          summary_error: null,
          budget: { status: "NOT_APPLICABLE", items: [] },
        }],
      },
    },
    target: { repository, billing_scope: "user" },
    now,
    maxAgeMinutes: 60,
  });
  assert.equal(result.status, "PERSONAL_REMAINING_QUOTA_NOT_EXPOSED");
  assert.equal(result.classification, null);
});

test("stale billing snapshots never classify a private run as quota exhausted", () => {
  const result = evaluateBillingEvidence({
    snapshotState: {
      status: "RETRIEVED",
      snapshot: {
        collected_at_utc: "2026-11-20T00:00:00.000Z",
        accounts: [],
      },
    },
    target: { repository, billing_scope: "organization" },
    now,
    maxAgeMinutes: 60,
  });
  assert.equal(result.status, "STALE_SNAPSHOT");
  assert.equal(result.classification, null);
});

test("no run plus a fresh matching organization hard cap classifies quota; syntax evidence still takes precedence", async () => {
  const billingConfig = {
    ...structuredClone(config),
    targets: [{
      ...structuredClone(config.targets[0]),
      billing_scope: "organization",
    }],
    billing_snapshot: {
      repository: "owner/billing-collector",
      branch: "main",
      path: "ops/github-actions-usage/usage-latest.json",
      max_age_minutes: 60,
    },
  };
  const snapshot = {
    collected_at_utc: "2026-11-22T00:50:00.000Z",
    accounts: [{
      scope: "organization",
      owner: "owner",
      status: "OK",
      summary_error: null,
      budget: {
        status: "HARD_CAP_REACHED",
        items: [{
          scope: "organization",
          entity: "owner",
          product_skus: ["Actions"],
          prevent_further_usage: true,
          status: "HARD_CAP_REACHED",
        }],
      },
    }],
  };
  const fetchImpl = async url => {
    const targetUrl = String(url);
    if (targetUrl.includes("/repos/owner/billing-collector/contents/ops/github-actions-usage/usage-latest.json")) {
      return jsonResponse({ encoding: "base64", content: Buffer.from(JSON.stringify(snapshot)).toString("base64") });
    }
    if (targetUrl.endsWith("/branches/main")) return jsonResponse(branchResponse());
    if (targetUrl.includes("/actions/runs?branch=main")) return jsonResponse({ workflow_runs: [] });
    if (targetUrl.includes("/contents/.github/workflows/ci.yml?ref=")) {
      return jsonResponse({ encoding: "base64", content: Buffer.from("name: CI\non:\n  push:\njobs: {}\n").toString("base64") });
    }
    throw new Error("Unexpected URL: " + targetUrl);
  };
  const record = await monitor({
    targetsJson: JSON.stringify(billingConfig),
    token,
    fetchImpl,
    now,
    lintImpl: async () => ({ status: "VALID", diagnostic: "" }),
  });
  assert.equal(record.targets[0].classification, "ACTIONS_BILLING_QUOTA_EXHAUSTED");
  assert.equal(record.targets[0].billing_evidence_status, "HARD_CAP_REACHED");
  assert.ok(record.targets[0].evidence_types.includes("BILLING_HARD_CAP_SNAPSHOT"));
  assert.equal(record.billing_coverage_status, "OBSERVED");
  assert.equal(record.coverage_status, "OBSERVED");
  assert.ok(!JSON.stringify(record).includes("billing-collector"));
});


test("retired action runtime in an exact private workflow revision is a real configuration classification", async () => {
  const fetchImpl = async url => {
    const targetUrl = String(url);
    if (targetUrl.endsWith("/branches/main")) return jsonResponse(branchResponse());
    if (targetUrl.includes("/actions/runs?branch=main")) return jsonResponse({ workflow_runs: [] });
    if (targetUrl.includes("/contents/.github/workflows/ci.yml?ref=")) {
      return jsonResponse({ encoding: "base64", content: Buffer.from("name: CI\non:\n  push:\njobs: {}\n").toString("base64") });
    }
    throw new Error("Unexpected URL: " + targetUrl);
  };
  const record = await monitor({
    targetsJson: JSON.stringify(config),
    token,
    fetchImpl,
    now,
    lintImpl: async () => ({ status: "VALID", diagnostic: "" }),
    runtimeAuditImpl: async () => ({
      status: "DIAGNOSTIC",
      classification: "ACTION_RUNTIME_RETIRED_OR_UNSUPPORTED",
      evidence_types: ["ACTION_RUNTIME_RETIRED_OR_UNSUPPORTED"],
    }),
  });
  assert.equal(record.targets[0].classification, "ACTION_RUNTIME_RETIRED_OR_UNSUPPORTED");
  assert.ok(record.targets[0].evidence_types.includes("ACTION_RUNTIME_RETIRED_OR_UNSUPPORTED"));
});

test("retired action runtime is secondary when a real test step already executed and failed", async () => {
  const fetchImpl = async url => {
    const targetUrl = String(url);
    if (targetUrl.endsWith("/branches/main")) return jsonResponse(branchResponse());
    if (targetUrl.includes("/actions/runs?branch=main")) return jsonResponse({ workflow_runs: [sourceRun()] });
    if (targetUrl.includes("/contents/.github/workflows/ci.yml?ref=")) {
      return jsonResponse({ encoding: "base64", content: Buffer.from("name: CI\non:\n  push:\njobs: {}\n").toString("base64") });
    }
    if (targetUrl.endsWith("/actions/runs/700")) return jsonResponse(runDetails());
    if (targetUrl.endsWith("/attempts/1/jobs?per_page=100")) {
      return jsonResponse({
        jobs: [{
          id: 101,
          run_id: 700,
          run_attempt: 1,
          head_sha: sha,
          runner_id: 900,
          runner_name: "GitHub Actions runner",
          name: "test",
          status: "completed",
          conclusion: "failure",
          steps: [{ number: 1, name: "Run failing assertion", status: "completed", conclusion: "failure" }],
          check_run_url: "https://api.github.com/repos/owner/private-repository/check-runs/101",
        }],
      });
    }
    if (targetUrl.endsWith("/check-runs/101/annotations?per_page=100")) return jsonResponse([]);
    if (targetUrl.endsWith("/actions/jobs/101/logs")) {
      return new Response("AssertionError: expected 1 to equal 2\nProcess completed with exit code 1", { status: 200 });
    }
    if (targetUrl.endsWith("/check-suites/88/check-runs?per_page=100")) return jsonResponse({ check_runs: [] });
    throw new Error("Unexpected URL: " + targetUrl);
  };
  const record = await monitor({
    targetsJson: JSON.stringify(config),
    token,
    fetchImpl,
    now,
    lintImpl: async () => ({ status: "VALID", diagnostic: "" }),
    runtimeAuditImpl: async () => ({
      status: "DIAGNOSTIC",
      classification: "ACTION_RUNTIME_RETIRED_OR_UNSUPPORTED",
      evidence_types: ["ACTION_RUNTIME_RETIRED_OR_UNSUPPORTED"],
    }),
    sleepImpl: async () => {},
  });
  assert.equal(record.targets[0].classification, "STEP_IMPLEMENTATION_FAILURE");
  assert.ok(record.targets[0].classifications.includes("ACTION_RUNTIME_RETIRED_OR_UNSUPPORTED"));
});
