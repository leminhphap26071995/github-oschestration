#!/usr/bin/env node
import { pathToFileURL } from "node:url";

const GITHUB_API = "https://api.github.com";
const NOTION_API = "https://api.notion.com/v1";
const NOTION_VERSION = "2022-06-28";

function assert(condition, code) {
  if (!condition) throw new Error(code);
}

export function sanitizeEvidence(value) {
  return String(value ?? "")
    .replace(/Authorization:\s*Bearer\s+\S+/gi, "Authorization: Bearer [REDACTED]")
    .replace(/Bearer\s+[A-Za-z0-9_./+=-]{12,}/g, "Bearer [REDACTED]")
    .replace(/\b(?:gh[pousr]_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/g, "[REDACTED_TOKEN]")
    .replace(/(token|secret|password|api[_-]?key|private[_-]?key)\s*[:=]\s*[^,\s;]+/gi, "$1=[REDACTED]")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, " ")
    .trim()
    .slice(0, 60000);
}

function validateTargets(raw) {
  const config = JSON.parse(raw);
  assert(config && config.schema_version === 1 && Array.isArray(config.targets), "INVALID_TARGETS_SCHEMA");
  for (const target of config.targets) {
    assert(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(target.repository || ""), "INVALID_TARGET_REPOSITORY");
    assert(/^[A-Za-z0-9._/-]+$/.test(target.branch || "") && !target.branch.includes(".."), "INVALID_TARGET_BRANCH");
    assert(Array.isArray(target.expected_workflows), "INVALID_EXPECTED_WORKFLOWS");
  }
  return config.targets;
}

async function requestJson(url, { token, notion = false, method = "GET", body, fetchImpl = globalThis.fetch } = {}) {
  const headers = notion
    ? { Authorization: "Bearer " + token, "Notion-Version": NOTION_VERSION, "Content-Type": "application/json" }
    : { Authorization: "Bearer " + token, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" };
  const response = await fetchImpl(url, {
    method,
    headers,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  if (!response.ok) {
    const error = new Error((notion ? "NOTION" : "GITHUB") + "_HTTP_" + response.status);
    error.status = response.status;
    error.retryAfter = response.headers.get("retry-after");
    throw error;
  }
  return { data: await response.json(), response };
}

async function paginate(url, { token, notion = false, collection, fetchImpl = globalThis.fetch } = {}) {
  const items = [];
  let next = new URL(url);
  let pages = 0;
  while (next) {
    assert(++pages <= 1000, "PAGINATION_LIMIT_EXCEEDED");
    const { data, response } = await requestJson(next, { token, notion, fetchImpl });
    const pageItems = collection ? data?.[collection] : data;
    assert(Array.isArray(pageItems), "INVALID_PAGINATION_RESPONSE");
    items.push(...pageItems);
    const link = response.headers.get("link") || "";
    const match = link.match(/<([^>]+)>;\s*rel="next"/);
    if (!match) {
      if (notion && data.has_more && data.next_cursor) {
        next = new URL(url);
        next.searchParams.set("start_cursor", data.next_cursor);
      } else {
        next = null;
      }
    } else {
      next = new URL(match[1]);
    }
  }
  return { items, pageCount: pages };
}

function classifyCheckRun(checkRun, annotations) {
  const app = String(checkRun.app?.slug || "").toLowerCase();
  const output = [checkRun.output?.title, checkRun.output?.summary, checkRun.output?.text].filter(Boolean).join("\n");
  const annotationText = annotations.map(item => [item.path, item.title, item.message, item.raw_details].filter(Boolean).join(" ")).join("\n");
  const parserPattern = /could not parse as yaml|yaml: line \d+:|invalid workflow file|workflow is not valid|unexpected value|unrecognized function|required property/i;
  const quotaPattern = /actions.{0,80}(?:billing|minutes|quota|spending limit)|(?:included minutes|spending limit).{0,80}(?:exhausted|reached|exceeded)|payment method.{0,80}(?:required|failed)|billing.{0,80}(?:hard cap|limit reached)/i;
  const workflowAnnotation = annotations.some(item => /^\.github\/workflows\/.+\.ya?ml$/i.test(item.path || ""));
  if (workflowAnnotation && parserPattern.test(annotationText)) return "WORKFLOW_YAML_OR_SCHEMA_ERROR";
  // Only the provider-owned top-level GitHub Actions check can establish quota from its output.
  if (app === "github-actions" && checkRun.name === "GitHub Actions" &&
      (quotaPattern.test(output) || quotaPattern.test(annotationText))) {
    return "ACTIONS_BILLING_QUOTA_EXHAUSTED";
  }
  if (annotations.length > 0) return "ANNOTATION_PRESENT_CAUSE_REQUIRES_INTERPRETATION";
  if (checkRun.conclusion && !["success", "skipped", "neutral"].includes(checkRun.conclusion)) return "UNKNOWN";
  return "NO_FAILURE_EVIDENCE";
}

function annotationRecord(item) {
  return {
    path: sanitizeEvidence(item.path),
    start_line: item.start_line ?? null,
    end_line: item.end_line ?? null,
    start_column: item.start_column ?? null,
    end_column: item.end_column ?? null,
    level: sanitizeEvidence(item.annotation_level),
    title: sanitizeEvidence(item.title),
    message: sanitizeEvidence(item.message),
    raw_details: sanitizeEvidence(item.raw_details),
  };
}

export async function collectAnnotationReceipts({
  targetsJson,
  githubToken,
  githubApi = GITHUB_API,
  fetchImpl = globalThis.fetch,
  observedAt = new Date().toISOString(),
} = {}) {
  assert(githubToken, "MISSING_GITHUB_TOKEN");
  const targets = validateTargets(targetsJson);
  const receipts = [];
  for (const target of targets) {
    const base = githubApi.replace(/\/$/, "");
    const branchUrl = base + "/repos/" + target.repository + "/branches/" + encodeURIComponent(target.branch);
    const { data: branch } = await requestJson(branchUrl, { token: githubToken, fetchImpl });
    const headSha = branch?.commit?.sha;
    assert(/^[a-f0-9]{40}$/i.test(headSha || ""), "TARGET_HEAD_SHA_UNAVAILABLE");

    const runsUrl = new URL(base + "/repos/" + target.repository + "/actions/runs");
    runsUrl.searchParams.set("head_sha", headSha);
    runsUrl.searchParams.set("per_page", "100");
    const runPage = await paginate(runsUrl, { token: githubToken, collection: "workflow_runs", fetchImpl });
    const runs = runPage.items.filter(run => run.head_sha === headSha).map(run => ({
      id: run.id,
      run_attempt: run.run_attempt ?? null,
      workflow_id: run.workflow_id ?? null,
      name: sanitizeEvidence(run.name),
      path: sanitizeEvidence(run.path),
      event: run.event ?? null,
      status: run.status ?? null,
      conclusion: run.conclusion ?? null,
      created_at: run.created_at ?? null,
      updated_at: run.updated_at ?? null,
      head_sha: run.head_sha,
    }));

    const checkRunsUrl = new URL(base + "/repos/" + target.repository + "/commits/" + headSha + "/check-runs");
    checkRunsUrl.searchParams.set("filter", "all");
    checkRunsUrl.searchParams.set("per_page", "100");
    const checkPage = await paginate(checkRunsUrl, { token: githubToken, collection: "check_runs", fetchImpl });
    const checkRuns = checkPage.items.filter(item => item.head_sha === headSha);
    for (const checkRun of checkRuns) {
      const annotationCount = Number(checkRun.output?.annotations_count ?? 0);
      const failed = checkRun.conclusion && !["success", "skipped", "neutral"].includes(checkRun.conclusion);
      if (annotationCount === 0 && !failed) continue;
      const receipt = {
        schema_version: 1,
        receipt_type: "GITHUB_CHECK_RUN_ANNOTATION",
        observed_at: observedAt,
        source: {
          repository: target.repository,
          branch: target.branch,
          head_sha: headSha,
          run_discovery_pages: runPage.pageCount,
          check_run_pages: checkPage.pageCount,
          workflow_runs: runs,
        },
        check_run: {
          id: checkRun.id,
          name: sanitizeEvidence(checkRun.name),
          app_slug: sanitizeEvidence(checkRun.app?.slug),
          status: checkRun.status ?? null,
          conclusion: checkRun.conclusion ?? null,
          started_at: checkRun.started_at ?? null,
          completed_at: checkRun.completed_at ?? null,
          check_suite_id: checkRun.check_suite?.id ?? null,
          annotations_reported: annotationCount,
          output: {
            title: sanitizeEvidence(checkRun.output?.title),
            summary: sanitizeEvidence(checkRun.output?.summary),
            text: sanitizeEvidence(checkRun.output?.text),
          },
        },
        annotations_status: "PENDING",
        annotations_page_count: 0,
        annotations: [],
        classification: "UNKNOWN",
      };
      try {
        const annotationsUrl = new URL(base + "/repos/" + target.repository + "/check-runs/" + checkRun.id + "/annotations");
        annotationsUrl.searchParams.set("per_page", "100");
        const annotationPage = await paginate(annotationsUrl, { token: githubToken, fetchImpl });
        receipt.annotations_status = "RETRIEVED";
        receipt.annotations_page_count = annotationPage.pageCount;
        receipt.annotations = annotationPage.items.map(annotationRecord);
        receipt.classification = classifyCheckRun(checkRun, annotationPage.items);
      } catch (error) {
        receipt.annotations_status = "API_ERROR";
        receipt.annotation_error = { http_status: error.status ?? null, code: sanitizeEvidence(error.message) };
      }
      receipt.dedupe_key = "gh-checkrun:" + target.repository + ":" + headSha + ":" + checkRun.id;
      receipts.push(receipt);
    }
  }
  return receipts;
}

function chunkText(value, size = 1800) {
  const chars = Array.from(value);
  const chunks = [];
  for (let i = 0; i < chars.length; i += size) chunks.push(chars.slice(i, i + size).join(""));
  return chunks.length ? chunks : [""];
}

export async function publishAnnotationReceipts({
  receipts,
  notionToken,
  notionPageId,
  fetchImpl = globalThis.fetch,
  notionApi = NOTION_API,
} = {}) {
  if (!notionToken || !notionPageId) return { status: "NOT_CONFIGURED", published: 0, skipped: 0 };
  const base = notionApi.replace(/\/$/, "");
  const commentsUrl = new URL(base + "/comments");
  commentsUrl.searchParams.set("block_id", notionPageId);
  commentsUrl.searchParams.set("page_size", "100");
  const existing = await paginate(commentsUrl, { token: notionToken, notion: true, collection: "results", fetchImpl });
  const knownText = existing.items.map(comment =>
    (comment.rich_text || []).map(item => item.plain_text || item.text?.content || "").join("")
  ).join("\n");
  let published = 0;
  let skipped = 0;
  for (const receipt of receipts) {
    const serialized = JSON.stringify(receipt, null, 2);
    const chunks = chunkText(serialized);
    const groups = [];
    for (let i = 0; i < chunks.length; i += 80) groups.push(chunks.slice(i, i + 80));
    for (let index = 0; index < groups.length; index++) {
      const marker = receipt.dedupe_key + ":part:" + (index + 1) + "/" + groups.length;
      if (knownText.includes(marker)) {
        skipped++;
        continue;
      }
      const content = [marker, ...groups[index]].join("\n");
      const richText = chunkText(content).map(part => ({ type: "text", text: { content: part } }));
      const { data } = await requestJson(base + "/comments", {
        token: notionToken,
        notion: true,
        method: "POST",
        body: { parent: { page_id: notionPageId }, rich_text: richText },
        fetchImpl,
      });
      assert(data && data.id, "NOTION_COMMENT_CREATE_UNCONFIRMED");
      published++;
    }
  }
  return { status: "PUBLISHED", published, skipped, existing_pages: existing.pageCount };
}

async function main() {
  const targetsJson = process.env.PRIVATE_TARGETS_JSON;
  const githubToken = process.env.PRIVATE_MONITOR_TOKEN;
  const notionToken = process.env.NOTION_API_TOKEN;
  const notionPageId = process.env.NOTION_PAGE_ID;
  if (!notionToken || !notionPageId) {
    process.stdout.write("NOTION_ANNOTATION_RELAY_NOT_CONFIGURED\n");
    return;
  }
  const receipts = await collectAnnotationReceipts({ targetsJson, githubToken });
  const result = await publishAnnotationReceipts({ receipts, notionToken, notionPageId });
  process.stdout.write(JSON.stringify({
    status: result.status,
    receipts_found: receipts.length,
    published: result.published,
    skipped_as_duplicate: result.skipped,
  }) + "\n");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    process.stderr.write("NOTION_ANNOTATION_RELAY_FAILED: " + sanitizeEvidence(error.message) + "\n");
    process.exitCode = 1;
  });
}
