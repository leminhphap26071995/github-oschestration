import test from "node:test";
import assert from "node:assert/strict";
import {
  parseOwnerReports,
  deriveQuotaSnapshot,
  publishQuotaSnapshot,
  runMonitor,
} from "../publish-notion.mjs";

function comment(text, createdAt = "2026-11-24T10:00:00.000Z") {
  return {
    created_time: createdAt,
    rich_text: [{ type: "text", plain_text: text, text: { content: text } }],
  };
}

test("latest explicit owner report controls routing until a later CLEARED record", () => {
  const comments = [
    comment("UPW_QUOTA_OWNER_REPORTS_V1\n{\"schema_version\":1,\"reports\":[{\"owner\":\"leminhphap-improvement\",\"state\":\"REPORTED_QUOTA_EXHAUSTED\",\"reported_at\":\"2026-11-22T10:00:00Z\"}]}"),
    comment("UPW_QUOTA_OWNER_REPORTS_V1\n{\"schema_version\":1,\"reports\":[{\"owner\":\"leminhphap-improvement\",\"state\":\"CLEARED\",\"cleared_at\":\"2026-11-24T09:00:00Z\"}]}",
      "2026-11-24T09:01:00.000Z"),
  ];
  const reports = parseOwnerReports(comments);
  assert.equal(reports["leminhphap-improvement"].state, "CLEARED");
});

test("owner report blocks every repository and UNKNOWN never becomes available", () => {
  const report = {
    billing_period: "2026-11",
    excluded_organizations: ["huyquanghan-apps"],
    accounts: [
      {
        owner: "leminhphap-improvement", scope: "organization", status: "PARTIAL",
        actions_usage_status: "OK", summary_error: null, repository_list_error: null,
        totals: { gross_minutes: 10, discounted_minutes: 0, net_minutes: 10, net_amount: 0.1 },
        budget: { status: "NO_ACTIONS_BUDGET", items: [] },
        repositories: [{
          full_name: "leminhphap-improvement/private-app", status: "OK",
          default_branch: "main", visibility: "private", archived: false,
          totals: { gross_minutes: 10, discounted_minutes: 0, net_minutes: 10, net_amount: 0.1 }
        }]
      },
      {
        owner: "LyonPro", scope: "organization", status: "PARTIAL",
        actions_usage_status: "OK", summary_error: null, repository_list_error: null,
        totals: { gross_minutes: 10, discounted_minutes: 0, net_minutes: 10, net_amount: 0.1 },
        budget: { status: "HARD_CAP_NOT_REACHED", items: [] },
        repositories: [{
          full_name: "LyonPro/available-app", status: "NO_USAGE_ROWS",
          default_branch: "main", visibility: "private", archived: false,
          totals: { gross_minutes: null, discounted_minutes: null, net_minutes: null, net_amount: null }
        }]
      },
      {
        owner: "lyon-game", scope: "organization", status: "UNKNOWN",
        actions_usage_status: "NOT_CONFIGURED", summary_error: "BILLING_TOKEN_NOT_CONFIGURED",
        repository_list_error: "BILLING_TOKEN_NOT_CONFIGURED",
        totals: { gross_minutes: null, discounted_minutes: null, net_minutes: null, net_amount: null },
        budget: { status: "UNKNOWN", items: [] }, repositories: []
      }
    ]
  };
  const receipts = [{
    receipt_type: "GITHUB_WORKFLOW_RUN_EVIDENCE",
    source: { repository: "LyonPro/available-app", head_sha: "a".repeat(40) },
    run: {
      id: 101, attempt: 1, path: ".github/workflows/ci.yml", event: "push",
      status: "completed", conclusion: "success", updated_at: "2026-11-24T17:00:00.000Z"
    }
  }];
  const snapshot = deriveQuotaSnapshot({
    report,
    receipts,
    ownerReports: {
      "leminhphap-improvement": {
        owner: "leminhphap-improvement", state: "REPORTED_QUOTA_EXHAUSTED",
        timestamp: "2026-11-22T10:00:00Z", source: "OWNER_REPORTED"
      }
    },
    now: new Date("2026-11-24T17:05:00.000Z"),
    freshnessMinutes: 30
  });
  const exhausted = snapshot.accounts.find(x => x.owner === "leminhphap-improvement");
  const available = snapshot.accounts.find(x => x.owner === "LyonPro");
  const unknown = snapshot.accounts.find(x => x.owner === "lyon-game");
  assert.equal(exhausted.quota_status, "REPORTED_QUOTA_EXHAUSTED");
  assert.equal(exhausted.repositories[0].quota_status, "REPORTED_QUOTA_EXHAUSTED");
  assert.equal(available.repositories[0].quota_status, "AVAILABLE_VERIFIED");
  assert.equal(unknown.repositories.length, 0);
  assert.equal(snapshot.eligible_repository_count, 1);
  assert.equal(snapshot.routing_policy.unknown_is_eligible, false);
  assert.equal(snapshot.routing_policy.hard_cap_not_reached_proves_availability, false);
  assert.deepEqual(snapshot.excluded_organizations, ["huyquanghan-apps"]);
});

test("provider-owned Actions quota annotation overrides owner report as VERIFIED exhaustion", () => {
  const report = {
    billing_period: "2026-11",
    accounts: [{
      owner: "example-org", scope: "organization", status: "OK",
      actions_usage_status: "OK", summary_error: null, repository_list_error: null,
      budget: { status: "NO_ACTIONS_BUDGET", items: [] },
      repositories: [{
        full_name: "example-org/app", status: "OK", default_branch: "main",
        visibility: "private", archived: false, totals: {}
      }]
    }]
  };
  const receipts = [{
    receipt_type: "GITHUB_CHECK_RUN_ANNOTATION",
    classification: "ACTIONS_BILLING_QUOTA_EXHAUSTED",
    observed_at: "2026-11-24T17:00:00.000Z",
    source: { repository: "example-org/app", head_sha: "b".repeat(40) },
    check_run: {
      id: 77, name: "GitHub Actions", app_slug: "github-actions",
      annotations_reported: 1
    }
  }];
  const snapshot = deriveQuotaSnapshot({
    report, receipts,
    ownerReports: {
      "example-org": { owner: "example-org", state: "REPORTED_QUOTA_EXHAUSTED" }
    },
    now: new Date("2026-11-24T17:05:00.000Z")
  });
  assert.equal(snapshot.accounts[0].quota_status, "QUOTA_EXHAUSTED");
  assert.equal(snapshot.accounts[0].repositories[0].quota_status, "QUOTA_EXHAUSTED");
  assert.equal(snapshot.provider_quota_evidence.length, 1);
});

test("Notion publisher updates the current property and deduplicates unchanged snapshots", async () => {
  const snapshot = {
    schema_version: 1, observed_at_utc: "2026-11-24T17:00:00.000Z",
    billing_period: "2026-11", freshness_minutes: 30,
    accounts: [{ owner: "LyonPro", quota_status: "UNKNOWN", repositories: [] }],
    eligible_repository_count: 0, eligible_repositories: [],
    excluded_organizations: ["huyquanghan-apps"],
    discovery: { status: "PARTIAL" }, provider_quota_evidence: []
  };
  const calls = [];
  let existingComments = [];
  const fetchImpl = async (url, init = {}) => {
    const parsed = new URL(url);
    calls.push({ path: parsed.pathname, method: init.method || "GET", body: init.body });
    if (init.method === "PATCH") return new Response(JSON.stringify({ id: "page-1" }), { status: 200 });
    if (init.method === "POST") {
      const body = JSON.parse(init.body);
      const text = body.rich_text.map(x => x.text.content).join("");
      existingComments.push(comment(text, "2026-11-24T17:00:00.000Z"));
      return new Response(JSON.stringify({ id: "comment-1" }), { status: 200 });
    }
    throw new Error("UNEXPECTED_REQUEST");
  };
  const first = await publishQuotaSnapshot({
    snapshot, notionToken: "notion-secret", quotaPageId: "page-1",
    existingComments, fetchImpl, now: new Date("2026-11-24T17:00:00.000Z")
  });
  assert.equal(first.property_updated, true);
  assert.equal(first.comment_published, true);
  assert.ok(calls.some(x => x.path === "/v1/pages/page-1" && x.method === "PATCH"));
  assert.ok(calls.some(x => x.path === "/v1/comments" && x.method === "POST"));

  const before = calls.length;
  const second = await publishQuotaSnapshot({
    snapshot, notionToken: "notion-secret", quotaPageId: "page-1",
    existingComments, fetchImpl, now: new Date("2026-11-24T17:10:00.000Z")
  });
  assert.equal(second.property_updated, true);
  assert.equal(second.comment_published, false);
  assert.equal(calls.length, before + 1);
});

test("runMonitor discovers recent runs without per-repository branch configuration and publishes to Notion", async () => {
  const sha = "c".repeat(40);
  const calls = [];
  const ownerReportText = "UPW_QUOTA_OWNER_REPORTS_V1
" +
    JSON.stringify({ schema_version: 1, reports: [] });
  const fetchImpl = async (url, init = {}) => {
    const parsed = new URL(url);
    const method = init.method || "GET";
    calls.push({ url: parsed.toString(), method, body: init.body });
    if (parsed.hostname === "api.notion.com" && parsed.pathname === "/v1/comments" && method === "GET") {
      if (parsed.searchParams.get("block_id") === "quota-page") {
        return new Response(JSON.stringify({
          results: [{
            created_time: "2026-11-24T16:00:00.000Z",
            rich_text: [{ plain_text: ownerReportText, text: { content: ownerReportText } }]
          }],
          has_more: false, next_cursor: null
        }), { status: 200 });
      }
      return new Response(JSON.stringify({ results: [], has_more: false, next_cursor: null }), { status: 200 });
    }
    if (parsed.hostname === "api.github.com" && parsed.pathname.endsWith("/actions/runs")) {
      assert.ok(parsed.searchParams.get("created").startsWith(">="));
      return new Response(JSON.stringify({ workflow_runs: [{
        id: 904, run_attempt: 1, workflow_id: 9, check_suite_id: 9040,
        name: "CI", path: ".github/workflows/ci.yml", event: "push",
        status: "completed", conclusion: "success", head_branch: "release/next",
        head_sha: sha, created_at: "2026-11-24T16:55:00.000Z",
        updated_at: "2026-11-24T16:56:00.000Z"
      }] }), { status: 200 });
    }
    if (parsed.hostname === "api.github.com" && parsed.pathname.endsWith("/check-runs")) {
      return new Response(JSON.stringify({ check_runs: [] }), { status: 200 });
    }
    if (parsed.hostname === "api.notion.com" && parsed.pathname === "/v1/pages/quota-page" && method === "PATCH") {
      return new Response(JSON.stringify({ id: "quota-page" }), { status: 200 });
    }
    if (parsed.hostname === "api.notion.com" && parsed.pathname === "/v1/comments" && method === "POST") {
      return new Response(JSON.stringify({ id: "snapshot-comment" }), { status: 200 });
    }
    throw new Error("UNEXPECTED_REQUEST " + method + " " + parsed.pathname);
  };
  const result = await runMonitor({
    report: {
      billing_period: "2026-11",
      excluded_organizations: ["huyquanghan-apps"],
      accounts: [{
        owner: "example-org", scope: "organization", status: "OK",
        actions_usage_status: "OK", summary_error: null, repository_list_error: null,
        totals: { gross_minutes: 10, discounted_minutes: 0, net_minutes: 10, net_amount: 0.1 },
        budget: { status: "NO_ACTIONS_BUDGET", items: [] },
        repositories: [{
          full_name: "example-org/new-repo", status: "OK", default_branch: "main",
          visibility: "private", archived: false,
          totals: { gross_minutes: 10, discounted_minutes: 0, net_minutes: 10, net_amount: 0.1 }
        }]
      }]
    },
    discovery: { status: "OK", organization_count: 1, token_count: 1,
      installation_coverage: [{ organization: "example-org", repository_selection: "all" }],
      installation_errors: [] },
    config: {
      quota_page_id: "quota-page", annotation_page_id: "annotation-page",
      freshness_minutes: 30, near_limit_ratio: 0.8, heartbeat_hours: 6
    },
    orgTokens: { "example-org": "installation-token" },
    notionToken: "notion-token",
    fetchImpl,
    now: new Date("2026-11-24T17:00:00.000Z")
  });
  assert.equal(result.status, "PUBLISHED");
  assert.equal(result.run_evidence_count, 1);
  assert.equal(result.snapshot.eligible_repository_count, 1);
  assert.equal(result.snapshot.eligible_repositories[0].repository, "example-org/new-repo");
  const runsCall = calls.find(x => x.url.includes("/actions/runs"));
  assert.ok(runsCall);
  assert.equal(new URL(runsCall.url).searchParams.has("head_sha"), false);
  assert.equal(calls.some(x => x.url.includes("/branches/")), false);
  assert.ok(calls.some(x => x.method === "PATCH" && x.url.endsWith("/v1/pages/quota-page")));
  assert.ok(calls.some(x => x.method === "POST" && x.url.endsWith("/v1/comments")));
});
