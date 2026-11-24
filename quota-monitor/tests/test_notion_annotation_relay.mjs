import test from "node:test";
import assert from "node:assert/strict";
import { collectAnnotationReceipts, publishAnnotationReceipts, sanitizeEvidence } from "../diagnostics/notion-annotation-relay.mjs";

const SHA = "a".repeat(40);
const TARGETS = JSON.stringify({
  schema_version: 1,
  targets: [{
    id: "target-private",
    repository: "example/private-repo",
    branch: "main",
    expected_workflows: [{
      id: "workflow-ci",
      path: ".github/workflows/ci.yml",
      event: "push",
      expectation: "every_push",
      grace_minutes: 30
    }]
  }]
});

function jsonResponse(data, headers = {}) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { "content-type": "application/json", ...headers }
  });
}

test("collects exact-SHA check-run annotations and preserves distinct causes", async () => {
  const calls = [];
  const fetchImpl = async (url, init = {}) => {
    const parsed = new URL(url);
    calls.push({ url: parsed.toString(), method: init.method || "GET" });
    if (parsed.pathname.endsWith("/branches/main")) {
      return jsonResponse({ commit: { sha: SHA } });
    }
    if (parsed.pathname.endsWith("/actions/runs")) {
      assert.equal(parsed.searchParams.get("head_sha"), SHA);
      return jsonResponse({ workflow_runs: [{
        id: 77, run_attempt: 1, workflow_id: 9, check_suite_id: 700, name: "CI",
        path: ".github/workflows/ci.yml", event: "push", status: "completed",
        conclusion: "failure", head_sha: SHA
      }] });
    }
    if (parsed.pathname.endsWith("/check-runs")) {
      return jsonResponse({ check_runs: [
        {
          id: 101, head_sha: SHA, check_suite: { id: 700 }, name: "GitHub Actions", app: { slug: "github-actions" },
          status: "completed", conclusion: "failure", output: { annotations_count: 1 }
        },
        {
          id: 102, head_sha: SHA, check_suite: { id: 700 }, name: "GitHub Actions", app: { slug: "github-actions" },
          status: "completed", conclusion: "failure", output: {
            annotations_count: 0, title: "GitHub Actions", summary: "GitHub Actions billing quota exceeded"
          }
        },
        {
          id: 103, head_sha: SHA, check_suite: { id: 700 }, name: "Third-party check", app: { slug: "other-app" },
          status: "completed", conclusion: "failure", output: { annotations_count: 0, summary: "generic failure" }
        }
      ] });
    }
    if (parsed.pathname.endsWith("/check-runs/101/annotations")) {
      return jsonResponse([{
        path: ".github/workflows/ci.yml",
        start_line: 12, end_line: 12, annotation_level: "failure",
        title: "Invalid workflow file",
        message: "Could not parse as YAML: yaml: line 12: mapping values are not allowed",
        raw_details: "Parser diagnostic"
      }]);
    }
    if (parsed.pathname.endsWith("/check-runs/102/annotations") ||
        parsed.pathname.endsWith("/check-runs/103/annotations")) {
      return jsonResponse([]);
    }
    throw new Error("UNEXPECTED_GITHUB_REQUEST " + parsed.pathname);
  };

  const receipts = await collectAnnotationReceipts({
    targetsJson: TARGETS, githubToken: "ghs_test_token_12345678901234567890", fetchImpl,
    observedAt: "2026-11-22T12:00:00.000Z"
  });
  assert.equal(receipts.length, 2);
  assert.equal(receipts[0].classification, "WORKFLOW_YAML_OR_SCHEMA_ERROR");
  assert.equal(receipts[0].annotations_status, "RETRIEVED");
  assert.equal(receipts[0].annotations[0].message.includes("Could not parse as YAML"), true);
  assert.equal(receipts[1].classification, "ACTIONS_BILLING_QUOTA_EXHAUSTED");
  assert.equal(receipts[0].source.run_id, 77);
  assert.equal(receipts[0].source.run_attempt, 1);
  assert.equal(receipts[0].source.runner_sentinel, true);
  assert.equal(receipts[0].source.empty_steps_trigger, true);
  assert.equal(receipts[1].source.run_id, 77);
  assert.equal(receipts.some(item => item.source.repository === "example/private-repo" && item.check_run.id === 103), false);
  assert.equal(receipts.every(item => item.source.head_sha === SHA), true);
  assert.equal(calls.filter(call => call.url.includes("/annotations?")).length, 2);
});

test("publishes Notion comments with stable dedupe keys and skips existing receipts", async () => {
  const receipt = {
    dedupe_key: "gh-checkrun:example/private-repo:" + SHA + ":101",
    source: { repository: "example/private-repo", head_sha: SHA },
    annotations: [{ message: "Invalid workflow file" }]
  };
  const posted = [];
  let existing = [];
  const fetchImpl = async (url, init = {}) => {
    const parsed = new URL(url);
    if (init.method === "POST") {
      const body = JSON.parse(init.body);
      posted.push(body);
      const richText = body.rich_text.map(item => ({
        plain_text: item.text.content,
        text: { content: item.text.content }
      }));
      existing.push({ rich_text: richText });
      return jsonResponse({ id: "comment-" + posted.length });
    }
    if (parsed.pathname.endsWith("/comments")) return jsonResponse({
      results: existing, has_more: false, next_cursor: null
    });
    throw new Error("UNEXPECTED_NOTION_REQUEST");
  };

  const first = await publishAnnotationReceipts({
    receipts: [receipt], notionToken: "secret_notion_token", notionPageId: "page-id", fetchImpl
  });
  assert.equal(first.published, 1);
  assert.equal(first.skipped, 0);
  assert.equal(posted.length, 1);
  assert.equal(posted[0].parent.page_id, "page-id");
  assert.equal(posted[0].rich_text.map(item => item.text.content).join("").includes(receipt.dedupe_key), true);

  const second = await publishAnnotationReceipts({
    receipts: [receipt], notionToken: "secret_notion_token", notionPageId: "page-id", fetchImpl
  });
  assert.equal(second.published, 0);
  assert.equal(second.skipped, 1);
  assert.equal(posted.length, 1);
});

test("redacts bearer tokens and never treats missing secrets as evidence", () => {
  assert.equal(sanitizeEvidence("Authorization: Bearer ghp_abcdefghijklmnopqrstuvwxyz"), "Authorization: Bearer [REDACTED]");
});


test("collects exact-SHA annotations for same-repository open PR heads when enabled", async () => {
  const PR_SHA = "b".repeat(40);
  const calls = [];
  const fetchImpl = async (url, init = {}) => {
    const parsed = new URL(url);
    calls.push(parsed.toString());
    if (parsed.pathname.endsWith("/branches/main")) return jsonResponse({ commit: { sha: SHA } });
    if (parsed.pathname.endsWith("/pulls")) {
      assert.equal(parsed.searchParams.get("state"), "open");
      const page = parsed.searchParams.get("page") || "1";
      if (page === "1") {
        return jsonResponse([
          { number: 48, state: "open", head: { ref: "fork-change", sha: "c".repeat(40), repo: { full_name: "fork/private-repo" } } }
        ], {
          link: '<https://api.github.com/repos/example/private-repo/pulls?state=open&per_page=100&page=2>; rel="next"'
        });
      }
      assert.equal(page, "2");
      return jsonResponse([
        { number: 47, state: "open", head: { ref: "fix/annotation-relay", sha: PR_SHA, repo: { full_name: "example/private-repo" } } }
      ]);
    }
    if (parsed.pathname.endsWith("/actions/runs")) {
      const sha = parsed.searchParams.get("head_sha");
      if (sha === SHA) return jsonResponse({ workflow_runs: [] });
      assert.equal(sha, PR_SHA);
      return jsonResponse({ workflow_runs: [{
        id: 477, run_attempt: 2, workflow_id: 9, check_suite_id: 701, name: "CI",
        path: ".github/workflows/ci.yml", event: "pull_request", status: "completed",
        conclusion: "failure", head_sha: PR_SHA
      }] });
    }
    if (parsed.pathname.endsWith("/check-runs")) {
      const sha = parsed.pathname.split("/").at(-2);
      if (sha === SHA) return jsonResponse({ check_runs: [] });
      assert.equal(sha, PR_SHA);
      return jsonResponse({ check_runs: [{
        id: 4771, head_sha: PR_SHA, check_suite: { id: 701 }, name: "CI", app: { slug: "github-actions" },
        status: "completed", conclusion: "failure", output: { annotations_count: 1 }
      }] });
    }
    if (parsed.pathname.endsWith("/check-runs/4771/annotations")) {
      return jsonResponse([{
        path: ".github/workflows/ci.yml", annotation_level: "failure",
        title: "Workflow validation", message: "Invalid workflow configuration"
      }]);
    }
    throw new Error("UNEXPECTED_GITHUB_REQUEST " + parsed.pathname);
  };
  const config = JSON.parse(TARGETS);
  config.targets[0].include_open_pull_requests = true;
  const receipts = await collectAnnotationReceipts({
    targetsJson: JSON.stringify(config),
    githubToken: "ghs_test_token_12345678901234567890",
    fetchImpl
  });
  assert.equal(receipts.length, 1);
  assert.equal(receipts[0].source.branch, "fix/annotation-relay");
  assert.equal(receipts[0].source.source_ref_type, "OPEN_PULL_REQUEST");
  assert.equal(receipts[0].source.pull_request_number, 47);
  assert.equal(receipts[0].source.head_sha, PR_SHA);
  assert.equal(receipts[0].annotations_status, "RETRIEVED");
  assert.equal(receipts[0].source.pull_request_discovery_pages, 2);
  assert.equal(calls.some(url => new URL(url).pathname.endsWith("/pulls") && new URL(url).searchParams.get("page") === "2"), true);
});

test("captures successful workflow-run evidence without publishing it as an annotation receipt", async () => {
  const calls = [];
  const fetchImpl = async (url, init = {}) => {
    const parsed = new URL(url);
    calls.push({ path: parsed.pathname, method: init.method || "GET" });
    if (parsed.pathname.endsWith("/branches/main")) {
      return jsonResponse({ commit: { sha: SHA } });
    }
    if (parsed.pathname.endsWith("/actions/runs")) {
      return jsonResponse({ workflow_runs: [{
        id: 901, run_attempt: 2, workflow_id: 9, check_suite_id: 901, name: "CI",
        path: ".github/workflows/ci.yml", event: "push", status: "completed",
        conclusion: "success", head_sha: SHA,
        created_at: "2026-11-24T16:50:00.000Z",
        updated_at: "2026-11-24T16:55:00.000Z"
      }] });
    }
    if (parsed.pathname.endsWith("/actions/runs/901/attempts/2/jobs")) {
      return jsonResponse({ jobs: [{
        id: 9011, name: "test", status: "completed", conclusion: "success",
        runner_id: 42, runner_name: "GitHub Actions 42", labels: ["ubuntu-latest"],
        steps: [{ name: "test", status: "completed", conclusion: "success" }]
      }] });
    }
    if (parsed.pathname.endsWith("/check-runs")) return jsonResponse({ check_runs: [] });
    if (parsed.pathname.endsWith("/comments")) return jsonResponse({
      results: [], has_more: false, next_cursor: null
    });
    throw new Error("UNEXPECTED_REQUEST " + parsed.pathname);
  };
  const receipts = await collectAnnotationReceipts({
    targetsJson: TARGETS,
    githubToken: "ghs_test_token_12345678901234567890",
    fetchImpl,
    observedAt: "2026-11-24T17:00:00.000Z"
  });
  assert.equal(receipts.length, 1);
  assert.equal(receipts[0].receipt_type, "GITHUB_WORKFLOW_RUN_EVIDENCE");
  assert.equal(receipts[0].run.id, 901);
  assert.equal(receipts[0].run.github_hosted_runner_verified, true);
  const published = await publishAnnotationReceipts({
    receipts,
    notionToken: "secret_notion_token",
    notionPageId: "page-id",
    fetchImpl
  });
  assert.equal(published.published, 0);
  assert.equal(calls.some(call => call.path === "/comments" && call.method === "POST"), false);
});

test("recent-run mode scans all branches and correlates annotations to exact run attempt", async () => {
  const recentTargets = JSON.stringify({
    schema_version: 1,
    targets: [{
      repository: "example/private-repo",
      scan_recent_runs: true,
      lookback_days: 7,
      expected_workflows: []
    }]
  });
  const calls = [];
  const fetchImpl = async (url, init = {}) => {
    const parsed = new URL(url);
    calls.push(parsed.toString());
    if (parsed.pathname.endsWith("/actions/runs")) {
      assert.ok(parsed.searchParams.get("created").startsWith(">="));
      return jsonResponse({ workflow_runs: [{
        id: 902, run_attempt: 3, workflow_id: 9, check_suite_id: 9020,
        name: "CI", path: ".github/workflows/ci.yml", event: "push",
        status: "completed", conclusion: "failure", head_branch: "feature/usage",
        head_sha: SHA, created_at: "2026-11-24T16:00:00Z",
        updated_at: "2026-11-24T16:01:00Z"
      }] });
    }
    if (parsed.pathname.endsWith("/actions/runs/902/attempts/3/jobs")) {
      return jsonResponse({ jobs: [{
        id: 9022, name: "build", status: "completed", conclusion: "failure",
        runner_id: 0, runner_name: null, labels: [], steps: []
      }] });
    }
    if (parsed.pathname.endsWith("/check-runs")) {
      return jsonResponse({ check_runs: [{
        id: 9021, head_sha: SHA, check_suite: { id: 9020 },
        name: "GitHub Actions", app: { slug: "github-actions" },
        status: "completed", conclusion: "failure",
        output: { annotations_count: 1 }
      }] });
    }
    if (parsed.pathname.endsWith("/check-runs/9021/annotations")) {
      return jsonResponse([{
        path: ".github/workflows/ci.yml", annotation_level: "failure",
        title: "Quota failure", message: "Actions included minutes exhausted"
      }]);
    }
    throw new Error("UNEXPECTED_GITHUB_REQUEST " + parsed.pathname);
  };
  const receipts = await collectAnnotationReceipts({
    targetsJson: recentTargets,
    githubToken: "ghs_test_token_12345678901234567890",
    fetchImpl,
    observedAt: "2026-11-24T17:00:00.000Z"
  });
  assert.equal(receipts.length, 1);
  assert.equal(receipts[0].receipt_type, "GITHUB_CHECK_RUN_ANNOTATION");
  assert.equal(receipts[0].source.run_id, 902);
  assert.equal(receipts[0].source.run_attempt, 3);
  assert.equal(receipts[0].source.run_ref, "feature/usage");
  assert.equal(receipts[0].source.runner_sentinel, true);
  assert.equal(receipts[0].source.empty_steps_trigger, true);
  assert.equal(receipts[0].check_run.id, 9021);
  assert.equal(receipts[0].classification, "ACTIONS_BILLING_QUOTA_EXHAUSTED");
  assert.equal(calls.some(url => new URL(url).pathname.endsWith("/branches/")), false);
});

test("does not publish a check-run annotation when exact run correlation is unavailable", async () => {
  const recentTargets = JSON.stringify({
    schema_version: 1,
    targets: [{
      repository: "example/private-repo",
      scan_recent_runs: true,
      lookback_days: 7,
      expected_workflows: []
    }]
  });
  const fetchImpl = async url => {
    const parsed = new URL(url);
    if (parsed.pathname.endsWith("/actions/runs")) return jsonResponse({ workflow_runs: [{
      id: 903, run_attempt: 1, check_suite_id: 9030, head_sha: SHA,
      head_branch: "feature/unmatched", status: "completed", conclusion: "failure"
    }] });
    if (parsed.pathname.endsWith("/actions/runs/903/attempts/1/jobs")) {
      return jsonResponse({ jobs: [{
        id: 9032, name: "build", status: "completed", conclusion: "failure",
        runner_id: 0, runner_name: null, labels: [], steps: []
      }] });
    }
    if (parsed.pathname.endsWith("/check-runs")) return jsonResponse({ check_runs: [{
      id: 9031, head_sha: SHA, check_suite: { id: 9999 },
      name: "GitHub Actions", app: { slug: "github-actions" },
      output: { annotations_count: 1 }
    }] });
    throw new Error("UNEXPECTED_GITHUB_REQUEST " + parsed.pathname);
  };
  const receipts = await collectAnnotationReceipts({
    targetsJson: recentTargets,
    githubToken: "ghs_test_token_12345678901234567890",
    fetchImpl,
    observedAt: "2026-11-24T17:00:00.000Z"
  });
  assert.equal(receipts.length, 1);
  assert.equal(receipts[0].receipt_type, "GITHUB_CHECK_RUN_UNMATCHED");
  assert.equal(receipts[0].reason, "CHECK_RUN_RUN_CORRELATION_UNRESOLVED");
  assert.equal(receipts[0].annotations_status, "RETRIEVED");
  assert.equal(receipts[0].annotations.length, 1);
  assert.equal(receipts[0].source.runner_sentinel, true);
  assert.equal(receipts[0].source.empty_steps_trigger, true);
});
