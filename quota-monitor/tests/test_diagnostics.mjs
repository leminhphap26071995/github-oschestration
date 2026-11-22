import test from "node:test";
import assert from "node:assert/strict";
import { collectDiagnostics, renderSummary } from "../diagnostics/collect.mjs";
import { createGitHubApi } from "../diagnostics/github-api.mjs";
import { classifyJob } from "../diagnostics/classify.mjs";

const repository = "owner/repository";
const token = "temporary-test-token-must-never-appear";
const sha = "a".repeat(40);
const apiRoot = "https://api.github.com";

function jsonResponse(payload, status = 200, headers = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

function event(overrides = {}) {
  const source = {
    id: 700,
    run_attempt: 2,
    workflow_id: 50,
    path: ".github/workflows/quota-token-permission-audit.yml",
    head_sha: sha,
    head_branch: "main",
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
      name: "GitHub Actions Credential Read Audit",
      path: ".github/workflows/quota-token-permission-audit.yml",
    },
    workflow_run: source,
  };
}

function runDetails(overrides = {}) {
  return {
    id: 700,
    run_attempt: 2,
    workflow_id: 50,
    path: ".github/workflows/quota-token-permission-audit.yml",
    head_sha: sha,
    head_branch: "main",
    event: "push",
    conclusion: "failure",
    repository: { full_name: repository },
    ...overrides,
  };
}

function job(id, checkRunId, overrides = {}) {
  return {
    id,
    run_id: 700,
    run_attempt: 2,
    head_sha: sha,
    runner_id: 9000 + id,
    runner_name: "GitHub Actions runner",
    name: "test",
    status: "completed",
    conclusion: "failure",
    started_at: "2026-11-22T00:00:00Z",
    completed_at: "2026-11-22T00:01:00Z",
    steps: [{ number: 1, name: "Run tests", status: "completed", conclusion: "failure" }],
    check_run_url: `${apiRoot}/repos/owner/repository/check-runs/${checkRunId}`,
    ...overrides,
  };
}

test("collects exact run attempt, paginated jobs/annotations, and independent job/check/runner IDs", async () => {
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    const target = String(url);
    calls.push({ url: target, method: options.method, authorization: options.headers?.Authorization });
    if (target.endsWith("/actions/runs/700")) return jsonResponse(runDetails());
    if (target.endsWith("/attempts/2/jobs?per_page=100")) {
      return jsonResponse({ jobs: [job(101, 901), job(102, 902, { conclusion: "success", steps: [] })] }, 200, {
        link: `<${apiRoot}/repos/owner/repository/actions/runs/700/attempts/2/jobs?per_page=100&page=2>; rel="next"`,
      });
    }
    if (target.includes("/attempts/2/jobs?per_page=100&page=2")) {
      return jsonResponse({ jobs: [job(103, 903)] });
    }
    if (target.endsWith("/check-runs/901/annotations?per_page=100")) {
      return jsonResponse([{ path: "src/a.js", annotation_level: "failure", title: "Failure", message: "test failed" }], 200, {
        link: `<${apiRoot}/repos/owner/repository/check-runs/901/annotations?per_page=100&page=2>; rel="next"`,
      });
    }
    if (target.includes("/check-runs/901/annotations?per_page=100&page=2")) {
      return jsonResponse([{ path: "src/b.js", annotation_level: "warning", message: "second page" }]);
    }
    if (target.includes("/check-runs/902/annotations")) return jsonResponse([]);
    if (target.includes("/check-runs/903/annotations")) return jsonResponse([]);
    if (target.endsWith("/actions/jobs/101/logs")) {
      return new Response(null, { status: 302, headers: { location: "https://logs.example.test/signed?sig=secret" } });
    }
    if (target.startsWith("https://logs.example.test/")) {
      assert.equal(options.headers?.Authorization, undefined);
      return new Response("Run tests\nError: Process completed with exit code 1", { status: 200 });
    }
    if (target.endsWith("/actions/jobs/103/logs")) {
      return new Response(null, { status: 302, headers: { location: "https://logs.example.test/other" } });
    }
    if (target === "https://logs.example.test/other") return new Response("No matching failure detail", { status: 200 });
    throw new Error("Unexpected URL: " + target);
  };

  const record = await collectDiagnostics({
    event: event(),
    repository,
    token,
    fetchImpl,
    sleepImpl: async () => {},
    recordedAt: "2026-11-22T00:00:00Z",
  });

  assert.equal(record.source.run_attempt, 2);
  assert.equal(record.source.jobs_page_count, 2);
  assert.deepEqual(record.jobs.map(x => x.job_id.value), [101, 102, 103]);
  assert.equal(record.jobs[0].check_run.id, 901);
  assert.notEqual(record.jobs[0].job_id.value, record.jobs[0].check_run.id);
  assert.notEqual(record.jobs[0].runner_id.value, record.jobs[0].check_run.id);
  assert.equal(record.jobs[0].check_run.page_count, 2);
  assert.equal(record.jobs[0].check_run.annotation_count, 2);
  assert.equal(record.jobs[0].classification, "STEP_FAILURE");
  assert.equal(record.jobs[1].logs.status, "NOT_REQUESTED");
  assert.ok(calls.some(call => call.url.includes("/attempts/2/jobs")));
  assert.ok(calls.every(call => call.method === "GET"));
  assert.ok(calls.some(call => call.url.startsWith("https://logs.example.test/")));
  assert.ok(!JSON.stringify(record).includes(token));
  assert.ok(!JSON.stringify(record).includes("sig=secret"));
  assert.ok(renderSummary(record).includes("Attempt: 2"));
});

test("rejects source run attempt mismatch before reading jobs", async () => {
  const fetchImpl = async url => {
    if (String(url).endsWith("/actions/runs/700")) return jsonResponse(runDetails({ run_attempt: 1 }));
    throw new Error("Jobs must not be requested");
  };
  await assert.rejects(
    () => collectDiagnostics({ event: event(), repository, token, fetchImpl }),
    /RUN_ATTEMPT_MISMATCH/,
  );
});

test("rejects source SHA mismatch before reading jobs", async () => {
  const fetchImpl = async url => {
    if (String(url).endsWith("/actions/runs/700")) return jsonResponse(runDetails({ head_sha: "b".repeat(40) }));
    throw new Error("Jobs must not be requested");
  };
  await assert.rejects(
    () => collectDiagnostics({ event: event(), repository, token, fetchImpl }),
    /HEAD_SHA_MISMATCH/,
  );
});

test("rejects annotations from a foreign check_run_url while keeping job-log retrieval independent", async () => {
  const calls = [];
  const fetchImpl = async url => {
    const target = String(url);
    calls.push(target);
    if (target.endsWith("/actions/runs/700")) return jsonResponse(runDetails());
    if (target.includes("/attempts/2/jobs")) {
      return jsonResponse({ jobs: [job(101, 901, { check_run_url: "https://evil.example/repos/owner/repository/check-runs/901" })] });
    }
    if (target.endsWith("/actions/jobs/101/logs")) {
      return new Response("Process completed with exit code 1", { status: 200 });
    }
    throw new Error("Unexpected URL: " + target);
  };
  const record = await collectDiagnostics({ event: event(), repository, token, fetchImpl });
  assert.equal(record.jobs[0].check_run.status, "INVALID_CHECK_RUN_URL");
  assert.ok(!calls.some(url => url.includes("/check-runs/901/annotations")));
});

test("does not classify collector API 403 as source permission denial or quota", async () => {
  const fetchImpl = async url => {
    const target = String(url);
    if (target.endsWith("/actions/runs/700")) return jsonResponse(runDetails());
    if (target.includes("/attempts/2/jobs")) return jsonResponse({ jobs: [job(101, 901, { steps: [] })] });
    if (target.includes("/check-runs/901/annotations")) {
      return jsonResponse({ message: "Resource not accessible by integration" }, 403);
    }
    if (target.endsWith("/actions/jobs/101/logs")) return jsonResponse({ message: "denied" }, 403);
    throw new Error("Unexpected URL: " + target);
  };
  const record = await collectDiagnostics({ event: event(), repository, token, fetchImpl });
  assert.equal(record.jobs[0].classification, "EXECUTION_EVIDENCE_MISSING");
  assert.equal(record.jobs[0].check_run.http_status, 403);
  assert.equal(record.jobs[0].logs.status, "API_ERROR");
});

test("retries transient log 404 and redacts secrets from evidence", async () => {
  const waits = [];
  let logCalls = 0;
  const api = createGitHubApi({
    token,
    sleepImpl: async ms => waits.push(ms),
    fetchImpl: async (url, options = {}) => {
      const target = String(url);
      if (target.endsWith("/actions/jobs/77/logs")) {
        logCalls++;
        if (logCalls < 3) return jsonResponse({ message: "BlobNotFound" }, 404);
        return new Response(null, { status: 302, headers: { location: "https://logs.example.test/log" } });
      }
      if (target === "https://logs.example.test/log") {
        assert.equal(options.headers?.Authorization, undefined);
        return new Response("Actions billing spending limit exceeded. Bearer ghp_abcdefghijklmnopqrstuvwxyz123456", { status: 200 });
      }
      throw new Error("Unexpected URL: " + target);
    },
  });
  api.setRepository("owner", "repository");
  const logs = await api.downloadJobLogs(77);
  assert.equal(logs.status, "RETRIEVED");
  assert.equal(logCalls, 3);
  assert.deepEqual(waits, [250, 500]);
  const classified = classifyJob({ job: job(77, 88), annotations: [], logs });
  assert.equal(classified.classification, "QUOTA_EXHAUSTED");
  assert.ok(!JSON.stringify(classified).includes("ghp_"));
  assert.ok(classified.evidence[0].message.includes("Bearer [REDACTED]"));
});

test("honors Retry-After for log API 429 and retries without sending the bearer token to the signed URL", async () => {
  const waits = [];
  let apiCalls = 0;
  const api = createGitHubApi({
    token,
    sleepImpl: async ms => waits.push(ms),
    fetchImpl: async (url, options = {}) => {
      const target = String(url);
      if (target.endsWith("/actions/jobs/77/logs")) {
        apiCalls++;
        if (apiCalls === 1) return jsonResponse({ message: "rate limit" }, 429, { "retry-after": "2" });
        return new Response(null, { status: 302, headers: { location: "https://logs.example.test/log" } });
      }
      if (target === "https://logs.example.test/log") {
        assert.equal(options.headers?.Authorization, undefined);
        return new Response("log text", { status: 200 });
      }
      throw new Error("Unexpected URL: " + target);
    },
    maxLogAttempts: 2,
  });
  api.setRepository("owner", "repository");
  const logs = await api.downloadJobLogs(77);
  assert.equal(logs.status, "RETRIEVED");
  assert.equal(logs.http_status, 200);
  assert.equal(logs.attempts, 2);
  assert.deepEqual(waits, [2000]);
});

test("bounded log 404 remains LOG_PUBLICATION_PENDING and never quota", async () => {
  const api = createGitHubApi({
    token,
    sleepImpl: async () => {},
    fetchImpl: async () => jsonResponse({ message: "BlobNotFound" }, 404),
    maxLogAttempts: 2,
  });
  api.setRepository("owner", "repository");
  const logs = await api.downloadJobLogs(77);
  assert.equal(logs.status, "LOG_PUBLICATION_PENDING");
  assert.equal(classifyJob({ job: job(77, 88, { steps: [] }), logs }).classification, "LOG_PUBLICATION_PENDING");
});

test("runner_id zero, empty steps, generic 403 and 429 are not quota evidence", () => {
  const result = classifyJob({
    job: job(77, 88, { runner_id: 0, steps: [] }),
    annotations: [],
    logs: { status: "API_ERROR", http_status: 429, text: "" },
  });
  assert.equal(result.classification, "EXECUTION_EVIDENCE_MISSING");
  assert.notEqual(result.classification, "QUOTA_EXHAUSTED");
});

test("explicit source-job permission and runner evidence are classified independently", () => {
  assert.equal(classifyJob({
    job: job(77, 88, { steps: [] }),
    annotations: [{ message: "Resource not accessible by integration" }],
    logs: { status: "RETRIEVED", text: "" },
  }).classification, "PERMISSION_DENIED");
  assert.equal(classifyJob({
    job: job(77, 88, { steps: [] }),
    annotations: [],
    logs: { status: "RETRIEVED", text: "No hosted runner available for this job" },
  }).classification, "RUNNER_UNAVAILABLE");
});

test("validates supported source workflow and failed conclusion", async () => {
  const badPath = event();
  badPath.workflow.path = ".github/workflows/other.yml";
  await assert.rejects(
    () => collectDiagnostics({ event: badPath, repository, token, fetchImpl: async () => { throw new Error("not called"); } }),
    /EVENT_WORKFLOW_PATH_MISMATCH/,
  );
  const success = event({ conclusion: "success" });
  await assert.rejects(
    () => collectDiagnostics({ event: success, repository, token, fetchImpl: async () => { throw new Error("not called"); } }),
    /SOURCE_RUN_NOT_FAILED/,
  );
});

test("rejects cross-origin pagination links", async () => {
  const api = createGitHubApi({
    token,
    fetchImpl: async () => jsonResponse({ jobs: [job(1, 2)] }, 200, {
      link: '<https://evil.example/steal>; rel="next"',
    }),
  });
  await assert.rejects(
    () => api.paginate("/repos/owner/repository/actions/runs/700/jobs", "jobs"),
    /UNTRUSTED_GITHUB_API_URL/,
  );
});
