#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import {
  collectAnnotationReceipts,
  publishAnnotationReceipts,
  sanitizeEvidence,
} from "./diagnostics/notion-annotation-relay.mjs";

const NOTION_API = "https://api.notion.com/v1";
const NOTION_VERSION = "2022-06-28";
const DEFAULT_FRESHNESS_MINUTES = 30;
const DEFAULT_NEAR_LIMIT_RATIO = 0.8;
const DEFAULT_HEARTBEAT_HOURS = 6;

function assert(condition, code) {
  if (!condition) throw new Error(code);
}

function ownerOf(repository) {
  return String(repository || "").split("/", 1)[0].toLowerCase();
}

function commentText(comment) {
  return (comment.rich_text || [])
    .map(item => item.plain_text || item.text?.content || "")
    .join("");
}

function chunkText(value, size = 1800) {
  const chars = Array.from(value);
  const chunks = [];
  for (let i = 0; i < chars.length; i += size) {
    chunks.push(chars.slice(i, i + size).join(""));
  }
  return chunks.length ? chunks : [""];
}

async function notionRequest(path, options = {}) {
  const token = options.token;
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const response = await fetchImpl(NOTION_API + path, {
    method: options.method || "GET",
    headers: {
      Authorization: "Bearer " + token,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json",
    },
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
  });
  if (!response.ok) {
    const error = new Error("NOTION_HTTP_" + response.status);
    error.status = response.status;
    throw error;
  }
  return response.json();
}

export async function listPageComments(pageId, token, fetchImpl = globalThis.fetch) {
  const results = [];
  let cursor = null;
  for (let page = 0; page < 1000; page += 1) {
    const query = new URLSearchParams({ block_id: pageId, page_size: "100" });
    if (cursor) query.set("start_cursor", cursor);
    const data = await notionRequest("/comments?" + query.toString(), { token, fetchImpl });
    assert(Array.isArray(data.results), "INVALID_NOTION_COMMENTS_RESPONSE");
    results.push(...data.results);
    if (!data.has_more || !data.next_cursor) return results;
    cursor = data.next_cursor;
  }
  throw new Error("NOTION_COMMENT_PAGINATION_LIMIT");
}

export function parseOwnerReports(comments) {
  const latest = new Map();
  for (const comment of [...comments].sort((a, b) =>
    String(a.created_time || "").localeCompare(String(b.created_time || "")))) {
    const text = commentText(comment);
    const markerAt = text.indexOf("UPW_QUOTA_OWNER_REPORTS_V1");
    if (markerAt < 0) continue;
    const jsonStart = text.indexOf("{", markerAt);
    const jsonEnd = text.lastIndexOf("}");
    if (jsonStart < 0 || jsonEnd <= jsonStart) continue;
    let payload;
    try {
      payload = JSON.parse(text.slice(jsonStart, jsonEnd + 1));
    } catch {
      continue;
    }
    if (payload?.schema_version !== 1 || !Array.isArray(payload.reports)) continue;
    for (const report of payload.reports) {
      const owner = String(report?.owner || "").trim();
      const state = String(report?.state || "");
      if (!owner || !["REPORTED_QUOTA_EXHAUSTED", "CLEARED"].includes(state)) continue;
      const key = owner.toLowerCase();
      const timestamp = report.reported_at || report.cleared_at || comment.created_time || "";
      const previous = latest.get(key);
      if (!previous || String(timestamp) >= String(previous.timestamp)) {
        latest.set(key, {
          owner,
          state,
          timestamp,
          source: report.source || "OWNER_REPORTED",
          reason: sanitizeEvidence(report.reason || ""),
        });
      }
    }
  }
  return Object.fromEntries(latest);
}

function budgetItems(account) {
  return Array.isArray(account?.budget?.items) ? account.budget.items : [];
}

function hardCapBudget(items, scope, entity = null) {
  return items.find(item => {
    if (item.status !== "HARD_CAP_REACHED" || item.prevent_further_usage !== true) return false;
    if (scope && String(item.scope).toLowerCase() !== scope) return false;
    if (entity && String(item.entity || "").toLowerCase() !== entity.toLowerCase()) return false;
    return true;
  }) || null;
}

function nearLimitBudget(items, ratio, scope, entity = null) {
  return items.find(item => {
    if (item.prevent_further_usage !== true || item.status !== "HARD_CAP_NOT_REACHED") return false;
    if (scope && String(item.scope).toLowerCase() !== scope) return false;
    if (entity && String(item.entity || "").toLowerCase() !== entity.toLowerCase()) return false;
    const amount = Number(item.budget_amount);
    const spend = Number(item.observed_net_amount);
    return Number.isFinite(amount) && amount > 0 &&
      Number.isFinite(spend) && spend / amount >= ratio;
  }) || null;
}

function errorState(account, repo = null) {
  const errors = [
    repo?.error,
    account?.summary_error,
    account?.repository_list_error,
    account?.budget?.error,
  ].filter(Boolean);
  if (errors.includes("API_RATE_LIMITED")) return "API_RATE_LIMITED";
  if (errors.includes("PERMISSION_DENIED")) return "PERMISSION_DENIED";
  if (errors.includes("BILLING_TOKEN_NOT_CONFIGURED")) return "NOT_CONFIGURED";
  if (errors.includes("NOT_FOUND")) return "NOT_EXPOSED";
  return null;
}

function recentSuccessForRepo(receipts, repository, now, freshnessMs) {
  const candidates = receipts.filter(receipt =>
    receipt.receipt_type === "GITHUB_WORKFLOW_RUN_EVIDENCE" &&
    String(receipt.source?.repository || "").toLowerCase() === repository.toLowerCase() &&
    receipt.run?.conclusion === "success" &&
    receipt.run?.status === "completed"
  );
  const valid = candidates.map(receipt => ({
    run_id: receipt.run.id,
    run_attempt: receipt.run.attempt,
    workflow: receipt.run.path,
    event: receipt.run.event,
    head_sha: receipt.source.head_sha,
    completed_at: receipt.run.updated_at || receipt.run.created_at,
  })).filter(run => {
    const at = Date.parse(run.completed_at || "");
    return Number.isFinite(at) && at <= now.getTime() + 60_000 &&
      now.getTime() - at <= freshnessMs;
  }).sort((a, b) => Date.parse(b.completed_at) - Date.parse(a.completed_at));
  return valid[0] || null;
}

export function deriveQuotaSnapshot({
  report,
  discovery = {},
  receipts = [],
  ownerReports = {},
  now = new Date(),
  freshnessMinutes = DEFAULT_FRESHNESS_MINUTES,
  nearLimitRatio = DEFAULT_NEAR_LIMIT_RATIO,
  scanErrors = [],
} = {}) {
  assert(report && Array.isArray(report.accounts), "INVALID_USAGE_REPORT");
  const freshnessMs = freshnessMinutes * 60_000;
  const providerQuotaRepos = new Set();
  const providerQuotaOwners = new Set();
  const providerQuotaEvidence = [];
  for (const receipt of receipts) {
    if (receipt.receipt_type !== "GITHUB_CHECK_RUN_ANNOTATION" ||
        receipt.classification !== "ACTIONS_BILLING_QUOTA_EXHAUSTED" ||
        String(receipt.check_run?.app_slug || "").toLowerCase() !== "github-actions" ||
        receipt.check_run?.name !== "GitHub Actions") continue;
    const repository = receipt.source?.repository;
    if (!repository) continue;
    providerQuotaRepos.add(repository.toLowerCase());
    providerQuotaOwners.add(ownerOf(repository));
    providerQuotaEvidence.push({
      repository,
      head_sha: receipt.source.head_sha,
      run_id: receipt.source.run_id,
      run_attempt: receipt.source.run_attempt,
      run_ref: receipt.source.run_ref,
      check_suite_id: receipt.source.check_suite_id,
      check_run_id: receipt.check_run.id,
      annotations_reported: receipt.check_run.annotations_reported,
      observed_at: receipt.observed_at,
      dedupe_key: receipt.dedupe_key,
    });
  }

  const accounts = [];
  const knownOwners = new Set();
  for (const account of report.accounts) {
    const owner = String(account.owner || "");
    const ownerKey = owner.toLowerCase();
    knownOwners.add(ownerKey);
    const ownerReport = ownerReports[ownerKey] || null;
    const items = budgetItems(account);
    const orgHardCap = hardCapBudget(items, "organization") ||
      hardCapBudget(items, "enterprise");
    const orgNearLimit = nearLimitBudget(items, nearLimitRatio, "organization") ||
      nearLimitBudget(items, nearLimitRatio, "enterprise");
    const ownerProviderExhausted = providerQuotaOwners.has(ownerKey);
    const ownerReportedExhausted = ownerReport?.state === "REPORTED_QUOTA_EXHAUSTED";
    const ownerError = errorState(account);
    let ownerQuotaStatus = "UNKNOWN";
    if (ownerProviderExhausted || orgHardCap) ownerQuotaStatus = "QUOTA_EXHAUSTED";
    else if (ownerReportedExhausted) ownerQuotaStatus = "REPORTED_QUOTA_EXHAUSTED";
    else if (ownerError) ownerQuotaStatus = ownerError;
    else if (orgNearLimit) ownerQuotaStatus = "NEAR_LIMIT";

    const repositories = (account.repositories || []).map(repo => {
      const fullName = String(repo.full_name || "");
      const repoKey = fullName.toLowerCase();
      const repoBudget = hardCapBudget(items, "repository", fullName) ||
        hardCapBudget(items, "repository", fullName.split("/").at(-1));
      const repoNear = nearLimitBudget(items, nearLimitRatio, "repository", fullName) ||
        nearLimitBudget(items, nearLimitRatio, "repository", fullName.split("/").at(-1));
      const repoError = errorState(account, repo);
      const lastSuccess = recentSuccessForRepo(receipts, fullName, now, freshnessMs);
      let quotaStatus = "UNKNOWN";
      if (ownerProviderExhausted || orgHardCap || providerQuotaRepos.has(repoKey) || repoBudget) {
        quotaStatus = "QUOTA_EXHAUSTED";
      } else if (ownerReportedExhausted) {
        quotaStatus = "REPORTED_QUOTA_EXHAUSTED";
      } else if (repoNear || orgNearLimit) {
        quotaStatus = "NEAR_LIMIT";
      } else if (lastSuccess) {
        quotaStatus = "AVAILABLE_VERIFIED";
      } else if (repoError) {
        quotaStatus = repoError;
      } else if (ownerError) {
        quotaStatus = ownerError;
      }
      return {
        full_name: fullName,
        visibility: repo.visibility || "unknown",
        archived: Boolean(repo.archived),
        default_branch: repo.default_branch || null,
        usage_status: repo.status || "UNKNOWN",
        usage_totals: repo.totals || null,
        quota_status: quotaStatus,
        quota_evidence: repoBudget ? "REPOSITORY_HARD_CAP_REACHED" :
          providerQuotaRepos.has(repoKey) ? "PROVIDER_ANNOTATION" :
          ownerProviderExhausted ? "OWNER_PROVIDER_ANNOTATION" :
          ownerReportedExhausted ? "OWNER_REPORT" :
          repoNear ? "REPOSITORY_BUDGET_NEAR_LIMIT" :
          orgHardCap ? "ORGANIZATION_HARD_CAP_REACHED" :
          orgNearLimit ? "ORGANIZATION_BUDGET_NEAR_LIMIT" :
          lastSuccess ? "RECENT_SUCCESSFUL_WORKFLOW_RUN" :
          repoError || ownerError || "NO_RECENT_AVAILABILITY_EVIDENCE",
        last_successful_run: lastSuccess,
      };
    });

    accounts.push({
      owner,
      scope: account.scope,
      collection_status: account.status || "UNKNOWN",
      actions_usage_status: account.actions_usage_status || "UNKNOWN",
      usage_totals: account.totals || null,
      budget_status: account.budget?.status || "UNKNOWN",
      repository_inventory_status: account.repository_list_error || "VERIFIED",
      quota_status: ownerQuotaStatus,
      owner_report: ownerReport,
      repositories,
    });
  }

  for (const [ownerKey, ownerReport] of Object.entries(ownerReports)) {
    if (knownOwners.has(ownerKey) || ownerReport.state === "CLEARED") continue;
    accounts.push({
      owner: ownerReport.owner,
      scope: "organization",
      collection_status: "NOT_DISCOVERED",
      actions_usage_status: "NOT_CONFIGURED",
      usage_totals: null,
      budget_status: "UNKNOWN",
      repository_inventory_status: "NOT_DISCOVERED",
      quota_status: "REPORTED_QUOTA_EXHAUSTED",
      owner_report: ownerReport,
      repositories: [],
    });
  }

  const allRepos = accounts.flatMap(account =>
    account.repositories.map(repo => ({ owner: account.owner, ...repo }))
  );
  const statusCounts = {};
  for (const repo of allRepos) {
    statusCounts[repo.quota_status] = (statusCounts[repo.quota_status] || 0) + 1;
  }
  const eligible = allRepos.filter(repo =>
    repo.quota_status === "AVAILABLE_VERIFIED" && !repo.archived
  );
  const blockedOwners = accounts.filter(account =>
    ["QUOTA_EXHAUSTED", "REPORTED_QUOTA_EXHAUSTED"].includes(account.quota_status)
  ).map(account => ({ owner: account.owner, status: account.quota_status }));

  return {
    schema_version: 1,
    observed_at_utc: now.toISOString(),
    billing_period: report.billing_period || "UNKNOWN",
    freshness_minutes: freshnessMinutes,
    near_limit_ratio: nearLimitRatio,
    routing_policy: {
      eligible_statuses: ["AVAILABLE_VERIFIED"],
      blocked_statuses: ["QUOTA_EXHAUSTED", "REPORTED_QUOTA_EXHAUSTED"],
      unknown_is_eligible: false,
      stale_is_eligible: false,
      hard_cap_not_reached_proves_availability: false,
      availability_evidence_window_minutes: freshnessMinutes,
      requirement_repository_mapping_precedes_quota_selection: true,
    },
    excluded_organizations: report.excluded_organizations || [],
    discovery: {
      status: discovery.status || "UNKNOWN",
      discovered_installations: discovery.discovered_installations ?? null,
      excluded_installations: discovery.excluded_installations ?? null,
      organization_count: discovery.organization_count ?? null,
      token_count: discovery.token_count ?? null,
      installation_coverage: discovery.installation_coverage || [],
      installation_errors: discovery.installation_errors || [],
    },
    owner_reports: Object.values(ownerReports),
    accounts,
    repository_status_counts: statusCounts,
    eligible_repository_count: eligible.length,
    eligible_repositories: eligible.map(repo => ({
      repository: repo.full_name,
      owner: repo.owner,
      visibility: repo.visibility,
      last_successful_run: repo.last_successful_run,
    })),
    blocked_owners: blockedOwners,
    provider_quota_evidence: providerQuotaEvidence,
    annotation_scan_error_count: scanErrors.length,
    annotation_scan_errors: scanErrors.map(item => ({
      repository: item.repository,
      code: sanitizeEvidence(item.code),
    })),
  };
}

export function buildQuotaSummary(snapshot) {
  const ownerStates = snapshot.accounts.map(account =>
    account.owner + "=" + account.quota_status
  ).join("; ");
  const repoStates = snapshot.accounts.flatMap(account =>
    account.repositories.map(repo => repo.full_name + "=" + repo.quota_status)
  ).join("; ");
  return [
    "observed=" + snapshot.observed_at_utc,
    "billing_period=" + snapshot.billing_period,
    "owners=[" + ownerStates + "]",
    "repositories=[" + repoStates + "]",
    "eligible=" + snapshot.eligible_repository_count,
    "excluded=[" + (snapshot.excluded_organizations || []).join(",") + "]",
    "policy=only AVAILABLE_VERIFIED is eligible; UNKNOWN/STALE/NOT_CONFIGURED are ineligible",
    "freshness_minutes=" + snapshot.freshness_minutes,
  ].join(" | ");
}

function snapshotDigest(snapshot) {
  const stable = {
    excluded_organizations: snapshot.excluded_organizations,
    discovery_status: snapshot.discovery?.status,
    accounts: snapshot.accounts.map(account => ({
      owner: account.owner,
      quota_status: account.quota_status,
      repositories: account.repositories.map(repo => ({
        full_name: repo.full_name,
        archived: repo.archived,
        quota_status: repo.quota_status,
        evidence: repo.quota_evidence,
      })).sort((a, b) => a.full_name.localeCompare(b.full_name)),
    })).sort((a, b) => a.owner.localeCompare(b.owner)),
    provider_quota_evidence: snapshot.provider_quota_evidence.map(item => ({
      repository: item.repository,
      check_run_id: item.check_run_id,
      head_sha: item.head_sha,
    })),
  };
  return createHash("sha256").update(JSON.stringify(stable)).digest("hex");
}

export async function publishQuotaSnapshot({
  snapshot,
  notionToken,
  quotaPageId,
  existingComments = null,
  heartbeatHours = DEFAULT_HEARTBEAT_HOURS,
  fetchImpl = globalThis.fetch,
  now = new Date(),
} = {}) {
  if (!notionToken || !quotaPageId) {
    return { status: "NOT_CONFIGURED", property_updated: false, comment_published: false };
  }
  const comments = existingComments || await listPageComments(quotaPageId, notionToken, fetchImpl);
  const digest = snapshotDigest(snapshot);
  const marker = "UPW_QUOTA_SNAPSHOT_V1 digest=" + digest;
  const previous = [...comments].reverse().find(comment =>
    commentText(comment).includes("UPW_QUOTA_SNAPSHOT_V1 digest="));
  const previousText = previous ? commentText(previous) : "";
  const previousDigest = previousText.match(/UPW_QUOTA_SNAPSHOT_V1 digest=([a-f0-9]{64})/)?.[1] || null;
  const previousAt = Date.parse(previous?.created_time || "");
  const heartbeatDue = !Number.isFinite(previousAt) ||
    now.getTime() - previousAt >= heartbeatHours * 60 * 60_000;
  const propertyText = buildQuotaSummary(snapshot);
  const richText = chunkText(propertyText).map(content => ({
    type: "text", text: { content },
  }));
  await notionRequest("/pages/" + quotaPageId, {
    token: notionToken,
    method: "PATCH",
    body: {
      properties: {
        "Quota Routing Snapshot": { rich_text: richText },
      },
    },
    fetchImpl,
  });
  let commentPublished = false;
  if (previousDigest !== digest || heartbeatDue) {
    const content = [
      marker,
      "Observed at: " + snapshot.observed_at_utc,
      "Billing period: " + snapshot.billing_period,
      "Only AVAILABLE_VERIFIED repositories are eligible. UNKNOWN, STALE, NOT_CONFIGURED, PERMISSION_DENIED and API_RATE_LIMITED are not eligible.",
      JSON.stringify(snapshot, null, 2),
    ].join("\n");
    await notionRequest("/comments", {
      token: notionToken,
      method: "POST",
      body: {
        parent: { page_id: quotaPageId },
        rich_text: chunkText(content).map(part => ({
          type: "text", text: { content: part },
        })),
      },
      fetchImpl,
    });
    commentPublished = true;
  }
  return {
    status: "PUBLISHED",
    property_updated: true,
    comment_published: commentPublished,
    digest,
    eligible_repositories: snapshot.eligible_repository_count,
  };
}

export async function runMonitor({
  report,
  discovery = {},
  config,
  userBillingToken = "",
  orgTokens = {},
  notionToken = "",
  fetchImpl = globalThis.fetch,
  now = new Date(),
} = {}) {
  assert(config && config.quota_page_id && config.annotation_page_id, "INVALID_NOTION_TARGET_CONFIG");
  if (!notionToken) return { status: "NOTION_NOT_CONFIGURED", snapshot: null };
  const existingComments = await listPageComments(config.quota_page_id, notionToken, fetchImpl);
  const ownerReports = parseOwnerReports(existingComments);
  const receipts = [];
  const scanErrors = [];

  for (const account of report.accounts || []) {
    const token = account.scope === "user" ? userBillingToken : orgTokens[account.owner];
    if (!token) continue;
    for (const repo of account.repositories || []) {
      if (repo.archived) continue;
      const targetsJson = JSON.stringify({
        schema_version: 1,
        targets: [{
          repository: repo.full_name,
          scan_recent_runs: true,
          lookback_days: 7,
          expected_workflows: [],
        }],
      });
      try {
        const found = await collectAnnotationReceipts({
          targetsJson,
          githubToken: token,
          fetchImpl,
          observedAt: now.toISOString(),
        });
        for (const receipt of found) {
          if (receipt.receipt_type === "GITHUB_CHECK_RUN_UNMATCHED") {
            scanErrors.push({
              repository: repo.full_name,
              code: "CHECK_RUN_RUN_CORRELATION_UNRESOLVED",
            });
          } else {
            receipts.push(receipt);
          }
        }
      } catch (error) {
        scanErrors.push({
          repository: repo.full_name,
          code: sanitizeEvidence(error.message || "ANNOTATION_SCAN_FAILED"),
        });
      }
    }
  }

  const annotationResult = await publishAnnotationReceipts({
    receipts,
    notionToken,
    notionPageId: config.annotation_page_id,
    fetchImpl,
  });
  const snapshot = deriveQuotaSnapshot({
    report,
    discovery,
    receipts,
    ownerReports,
    now,
    freshnessMinutes: config.freshness_minutes ?? DEFAULT_FRESHNESS_MINUTES,
    nearLimitRatio: config.near_limit_ratio ?? DEFAULT_NEAR_LIMIT_RATIO,
    scanErrors,
  });
  const published = await publishQuotaSnapshot({
    snapshot,
    notionToken,
    quotaPageId: config.quota_page_id,
    existingComments,
    heartbeatHours: config.heartbeat_hours ?? DEFAULT_HEARTBEAT_HOURS,
    fetchImpl,
    now,
  });
  return {
    status: published.status,
    snapshot,
    annotation_receipts_found: receipts.filter(r => r.receipt_type === "GITHUB_CHECK_RUN_ANNOTATION").length,
    run_evidence_count: receipts.filter(r => r.receipt_type === "GITHUB_WORKFLOW_RUN_EVIDENCE").length,
    annotation_comments_published: annotationResult.published,
    annotation_comments_skipped: annotationResult.skipped,
    quota_comment_published: published.comment_published,
    property_updated: published.property_updated,
  };
}

async function main() {
  const args = process.argv.slice(2);
  const value = name => {
    const index = args.indexOf(name);
    if (index < 0 || !args[index + 1]) throw new Error("MISSING_ARGUMENT_" + name);
    return args[index + 1];
  };
  const report = JSON.parse(await readFile(value("--report"), "utf8"));
  const discovery = JSON.parse(await readFile(value("--discovery"), "utf8"));
  const config = JSON.parse(await readFile(value("--config"), "utf8"));
  const result = await runMonitor({
    report,
    discovery,
    config,
    userBillingToken: process.env.USER_BILLING_TOKEN || "",
    orgTokens: JSON.parse(process.env.ORG_BILLING_TOKENS_JSON || "{}"),
    notionToken: process.env.NOTION_API_TOKEN || "",
  });
  process.stdout.write("QUOTA_MONITOR_STATUS=" + result.status +
    " owners=" + (result.snapshot?.accounts.length ?? 0) +
    " repositories=" + (result.snapshot?.accounts.reduce((sum, a) => sum + a.repositories.length, 0) ?? 0) +
    " eligible=" + (result.snapshot?.eligible_repository_count ?? 0) +
    " annotation_receipts=" + (result.annotation_receipts_found ?? 0) +
    " notion_updated=" + Boolean(result.property_updated) + "\n");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    process.stderr.write("QUOTA_MONITOR_FAILED: " + sanitizeEvidence(error.message) + "\n");
    process.exitCode = 1;
  });
}
