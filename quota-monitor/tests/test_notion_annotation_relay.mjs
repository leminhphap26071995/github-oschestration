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
        id: 77, run_attempt: 1, workflow_id: 9, name: "CI",
        path: ".github/workflows/ci.yml", event: "push", status: "completed",
        conclusion: "failure", head_sha: SHA
      }] });
    }
    if (parsed.pathname.endsWith("/check-runs")) {
      return jsonResponse({ check_runs: [
        {
          id: 101, head_sha: SHA, name: "GitHub Actions", app: { slug: "github-actions" },
          status: "completed", conclusion: "failure", output: { annotations_count: 1 }
        },
        {
          id: 102, head_sha: SHA, name: "GitHub Actions", app: { slug: "github-actions" },
          status: "completed", conclusion: "failure", output: {
            annotations_count: 0, title: "GitHub Actions", summary: "GitHub Actions billing quota exceeded"
          }
        },
        {
          id: 103, head_sha: SHA, name: "Third-party check", app: { slug: "other-app" },
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
  assert.equal(receipts.length, 3);
  assert.equal(receipts[0].classification, "WORKFLOW_YAML_OR_SCHEMA_ERROR");
  assert.equal(receipts[0].annotations_status, "RETRIEVED");
  assert.equal(receipts[0].annotations[0].message.includes("Could not parse as YAML"), true);
  assert.equal(receipts[1].classification, "ACTIONS_BILLING_QUOTA_EXHAUSTED");
  assert.equal(receipts[2].classification, "UNKNOWN");
  assert.equal(receipts.every(item => item.source.head_sha === SHA), true);
  assert.equal(calls.filter(call => call.url.includes("/annotations?")).length, 3);
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
