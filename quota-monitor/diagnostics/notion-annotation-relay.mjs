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
    const recentMode = target.scan_recent_runs === true;
    if (!recentMode) {
      assert(/^[A-Za-z0-9._/-]+$/.test(target.branch || "") && !target.branch.includes(".."), "INVALID_TARGET_BRANCH");
    }
    if (recentMode) {
      const lookback = Number(target.lookback_days ?? 7);
      assert(Number.isInteger(lookback) && lookback >= 1 && lookback <= 31, "INVALID_RECENT_RUN_LOOKBACK");
    }
    assert(Array.isArray(target.expected_workflows), "INVALID_EXPECTED_WORKFLOWS");
    assert(target.scan_recent_runs === undefined || typeof target.scan_recent_runs === "boolean",
      "INVALID_SCAN_RECENT_RUNS");
    assert(target.include_open_pull_requests === undefined || typeof target.include_open_pull_requests === "boolean",
      "INVALID_INCLUDE_OPEN_PULL_REQUESTS");
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

async function collectRunJobEvidence({ base, repository, run, token, fetchImpl, observedAt, freshnessMinutes, triggerLookbackHours, force = false }) {
  const updatedAt = Date.parse(run.updated_at || run.created_at || "");
  const observedTime = Date.parse(observedAt);
  const recentSuccess = run.status === "completed" && run.conclusion === "success" &&
    Number.isFinite(updatedAt) && Number.isFinite(observedTime) &&
    updatedAt <= observedTime + 60_000 && observedTime - updatedAt <= freshnessMinutes * 60_000;
  const recentFailedRun = run.status === "completed" && run.conclusion &&
    !["success", "skipped", "neutral"].includes(run.conclusion) &&
    Number.isFinite(updatedAt) && Number.isFinite(observedTime) &&
    updatedAt <= observedTime + 60_000 &&
    observedTime - updatedAt <= triggerLookbackHours * 60 * 60_000;
  if (!recentSuccess && !recentFailedRun && !force) {
    return {
      status: "NOT_REQUIRED", jobs: [], runner_sentinel: null,
      empty_steps_trigger: null, github_hosted_runner_verified: false,
    };
  }
  const attempt = Number(run.run_attempt || 1);
  const jobsUrl = new URL(base + "/repos/" + repository + "/actions/runs/" +
    run.id + "/attempts/" + attempt + "/jobs");
  jobsUrl.searchParams.set("per_page", "100");
  try {
    const page = await paginate(jobsUrl, { token, collection: "jobs", fetchImpl });
    const jobs = page.items.map(job => ({
      id: job.id,
      name: sanitizeEvidence(job.name),
      status: job.status || null,
      conclusion: job.conclusion || null,
      runner_id: job.runner_id ?? null,
      runner_name: sanitizeEvidence(job.runner_name),
      labels: Array.isArray(job.labels) ? job.labels.map(label => sanitizeEvidence(label)) : [],
      steps_count: Array.isArray(job.steps) ? job.steps.length : null,
    }));
    const runnerSentinel = jobs.some(job => Number(job.runner_id) === 0);
    const emptyStepsTrigger = jobs.some(job => job.steps_count === 0);
    const hostedRunnerVerified = run.conclusion === "success" && jobs.some(job =>
      job.status === "completed" && job.conclusion === "success" &&
      Number(job.runner_id) > 0 &&
      !job.labels.some(label => /self-hosted/i.test(label)) &&
      job.labels.some(label => /^(ubuntu|windows|macos)-/i.test(label))
    );
    return {
      status: jobs.length ? "OK" : "EMPTY",
      jobs,
      runner_sentinel: jobs.length ? runnerSentinel : null,
      empty_steps_trigger: jobs.length ? emptyStepsTrigger : null,
      github_hosted_runner_verified: hostedRunnerVerified,
      page_count: page.pageCount,
    };
  } catch (error) {
    return {
      status: "API_ERROR",
      error: sanitizeEvidence(error.message || "JOB_EVIDENCE_UNAVAILABLE"),
      jobs: [],
      runner_sentinel: null,
      empty_steps_trigger: null,
      github_hosted_runner_verified: false,
    };
  }
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
    let targetRefs = [];
    if (target.scan_recent_runs === true) {
      const lookbackDays = Number(target.lookback_days ?? 7);
      const since = new Date(Date.parse(observedAt) - lookbackDays * 24 * 60 * 60_000).toISOString();
      const recentRunsUrl = new URL(base + "/repos/" + target.repository + "/actions/runs");
      recentRunsUrl.searchParams.set("created", ">=" + since);
      recentRunsUrl.searchParams.set("per_page", "100");
      const recentPage = await paginate(recentRunsUrl, {
        token: githubToken, collection: "workflow_runs", fetchImpl
      });
      const grouped = new Map();
      for (const run of recentPage.items) {
        const headSha = run?.head_sha;
        if (!/^[a-f0-9]{40}$/i.test(headSha || "")) continue;
        if (!grouped.has(headSha)) {
          grouped.set(headSha, {
            branch: run.head_branch || "unknown",
            headSha,
            sourceRefType: "RECENT_WORKFLOW_RUN",
            pullRequestNumber: null,
            pullRequestDiscoveryPages: 0,
            runDiscoveryPages: recentPage.pageCount,
            runs: [],
          });
        }
        grouped.get(headSha).runs.push(run);
      }
      targetRefs = [...grouped.values()];
    } else {
      const branchUrl = base + "/repos/" + target.repository + "/branches/" + encodeURIComponent(target.branch);
      const { data: branch } = await requestJson(branchUrl, { token: githubToken, fetchImpl });
      const branchSha = branch?.commit?.sha;
      if (!/^[a-f0-9]{40}$/i.test(branchSha || "")) throw new Error("TARGET_HEAD_SHA_UNAVAILABLE");
      targetRefs.push({
        branch: target.branch,
        headSha: branchSha,
        sourceRefType: "CONFIGURED_BRANCH",
        pullRequestNumber: null,
        pullRequestDiscoveryPages: 0,
      });

      if (target.include_open_pull_requests === true) {
        const pullsUrl = new URL(base + "/repos/" + target.repository + "/pulls");
        pullsUrl.searchParams.set("state", "open");
        pullsUrl.searchParams.set("per_page", "100");
        const pullPage = await paginate(pullsUrl, { token: githubToken, fetchImpl });
        for (const pull of pullPage.items) {
          const pullHead = pull?.head;
          const headSha = pullHead?.sha;
          // Only same-repository PR heads are eligible. Fork code is never followed.
          if (pull.state !== "open" || pullHead?.repo?.full_name !== target.repository ||
              !/^[a-f0-9]{40}$/i.test(headSha || "") || typeof pullHead.ref !== "string") continue;
          targetRefs.push({
            branch: pullHead.ref,
            headSha,
            sourceRefType: "OPEN_PULL_REQUEST",
            pullRequestNumber: pull.number ?? null,
            pullRequestDiscoveryPages: pullPage.pageCount,
          });
        }
      }
    }

    const uniqueRefs = [...new Map(targetRefs.map(item =>
      [item.branch + ":" + item.headSha, item]
    )).values()];
    for (const targetRef of uniqueRefs) {
    const headSha = targetRef.headSha;
    let runPage;
    let rawRuns;
    if (Array.isArray(targetRef.runs)) {
      rawRuns = targetRef.runs;
      runPage = { pageCount: targetRef.runDiscoveryPages || 1 };
    } else {
      const runsUrl = new URL(base + "/repos/" + target.repository + "/actions/runs");
      runsUrl.searchParams.set("head_sha", headSha);
      runsUrl.searchParams.set("per_page", "100");
      runPage = await paginate(runsUrl, { token: githubToken, collection: "workflow_runs", fetchImpl });
      rawRuns = runPage.items;
    }
    const runs = [];
    for (const rawRun of rawRuns.filter(run => run.head_sha === headSha)) {
      const jobEvidence = await collectRunJobEvidence({
        base,
        repository: target.repository,
        run: rawRun,
        token: githubToken,
        fetchImpl,
        observedAt,
        freshnessMinutes: Number(target.availability_freshness_minutes ?? 30),
        triggerLookbackHours: Number(target.trigger_lookback_hours ?? 24),
      });
      runs.push({
        id: rawRun.id,
        run_attempt: rawRun.run_attempt ?? null,
        workflow_id: rawRun.workflow_id ?? null,
        check_suite_id: rawRun.check_suite_id ?? null,
        head_branch: rawRun.head_branch ?? targetRef.branch,
        name: sanitizeEvidence(rawRun.name),
        path: sanitizeEvidence(rawRun.path),
        event: rawRun.event ?? null,
        status: rawRun.status ?? null,
        conclusion: rawRun.conclusion ?? null,
        created_at: rawRun.created_at ?? null,
        updated_at: rawRun.updated_at ?? null,
        head_sha: rawRun.head_sha,
        jobs: jobEvidence.jobs,
        job_evidence_status: jobEvidence.status,
        job_evidence_error: jobEvidence.error || null,
        runner_sentinel: jobEvidence.runner_sentinel,
        empty_steps_trigger: jobEvidence.empty_steps_trigger,
        github_hosted_runner_verified: jobEvidence.github_hosted_runner_verified,
      });
    }

    const checkRunsUrl = new URL(base + "/repos/" + target.repository + "/commits/" + headSha + "/check-runs");
    checkRunsUrl.searchParams.set("filter", "all");
    checkRunsUrl.searchParams.set("per_page", "100");
    const checkPage = await paginate(checkRunsUrl, { token: githubToken, collection: "check_runs", fetchImpl });
    const checkRuns = checkPage.items.filter(item => item.head_sha === headSha);
    for (const run of runs) {
      if (run.status !== "completed" || run.conclusion !== "success") continue;
      receipts.push({
        schema_version: 1,
        receipt_type: "GITHUB_WORKFLOW_RUN_EVIDENCE",
        observed_at: observedAt,
        source: {
          repository: target.repository,
          branch: run.head_branch || targetRef.branch,
          source_ref_type: targetRef.sourceRefType,
          pull_request_number: targetRef.pullRequestNumber,
          head_sha: run.head_sha,
          run_id: run.id,
          run_attempt: run.run_attempt,
          check_suite_id: run.check_suite_id,
        },
        run: {
          id: run.id,
          attempt: run.run_attempt,
          workflow_id: run.workflow_id,
          check_suite_id: run.check_suite_id,
          head_branch: run.head_branch,
          job_evidence_status: run.job_evidence_status,
          runner_sentinel: run.runner_sentinel,
          empty_steps_trigger: run.empty_steps_trigger,
          github_hosted_runner_verified: run.github_hosted_runner_verified,
          jobs: run.jobs,
          name: run.name,
          path: run.path,
          event: run.event,
          status: run.status,
          conclusion: run.conclusion,
          created_at: run.created_at,
          updated_at: run.updated_at,
        },
        dedupe_key: "gh-run:" + target.repository + ":" + run.id + ":" + run.run_attempt,
      });
    }
    for (const checkRun of checkRuns) {
      if (checkRun.status && checkRun.status !== "completed") continue;
      const annotationCount = Number(checkRun.output?.annotations_count ?? 0);
      const outputText = [checkRun.output?.title, checkRun.output?.summary, checkRun.output?.text].filter(Boolean).join("\n");
      const providerQuota = String(checkRun.app?.slug || "").toLowerCase() === "github-actions" &&
        checkRun.name === "GitHub Actions" &&
        /actions.{0,80}(?:billing|minutes|quota|spending limit)|(?:included minutes|spending limit).{0,80}(?:exhausted|reached|exceeded)|payment method.{0,80}(?:required|failed)|billing.{0,80}(?:hard cap|limit reached)/i.test(outputText);
      const detailsRun = runs.find(run =>
        checkRun.details_url && String(checkRun.details_url).includes("/actions/runs/" + run.id)
      );
      const suiteMatches = runs.filter(run =>
        run.check_suite_id && checkRun.check_suite?.id &&
        String(run.check_suite_id) === String(checkRun.check_suite.id)
      );
      // A check-suite ID can be shared by rerun attempts. Only use it when unique;
      // otherwise require the run ID in details_url to preserve exact attempt identity.
      const correlatedRun = detailsRun || (suiteMatches.length === 1 ? suiteMatches[0] : null);
      const runnerTrigger = correlatedRun
        ? correlatedRun.runner_sentinel === true || correlatedRun.empty_steps_trigger === true
        : runs.some(run => run.runner_sentinel === true || run.empty_steps_trigger === true);
      const annotationLookupTriggered = annotationCount > 0 || providerQuota || runnerTrigger;
      if (!annotationLookupTriggered) continue;
      if (!correlatedRun) {
        let unmatchedAnnotations = [];
        let unmatchedStatus = annotationLookupTriggered ? "RETRIEVAL_FAILED" : "NOT_REQUESTED";
        if (annotationLookupTriggered) {
          const unmatchedUrl = new URL(base + "/repos/" + target.repository +
            "/check-runs/" + checkRun.id + "/annotations");
          unmatchedUrl.searchParams.set("per_page", "100");
          try {
            const unmatchedPage = await paginate(unmatchedUrl, {
              token: githubToken, fetchImpl
            });
            unmatchedAnnotations = unmatchedPage.items.map(annotationRecord);
            unmatchedStatus = unmatchedAnnotations.length ? "RETRIEVED" : "RETRIEVED_EMPTY";
          } catch {
            unmatchedStatus = "API_ERROR";
          }
        }
        receipts.push({
          schema_version: 1,
          receipt_type: "GITHUB_CHECK_RUN_UNMATCHED",
          run_correlation_status: "UNMATCHED",
          observed_at: observedAt,
          source: {
            repository: target.repository,
            head_sha: headSha,
            branch: targetRef.branch,
            runner_sentinel: runs.some(run => run.runner_sentinel === true) ? true :
              runs.some(run => run.job_evidence_status === "OK") ? false : null,
            empty_steps_trigger: runs.some(run => run.empty_steps_trigger === true) ? true :
              runs.some(run => run.job_evidence_status === "OK") ? false : null,
          },
          check_run_id: checkRun.id,
          annotations_reported: annotationCount,
          annotation_lookup_trigger: [
            ...(annotationCount > 0 ? ["ANNOTATIONS_COUNT_POSITIVE"] : []),
            ...(providerQuota ? ["PROVIDER_QUOTA_OUTPUT"] : []),
            ...(runnerTrigger ? ["RUNNER_ID_ZERO_OR_EMPTY_STEPS"] : []),
          ],
          annotations_status: unmatchedStatus,
          annotations: unmatchedAnnotations,
          reason: "CHECK_RUN_RUN_CORRELATION_UNRESOLVED",
          dedupe_key: "gh-checkrun-unmatched:" + target.repository + ":" + headSha + ":" + checkRun.id,
        });
        continue;
      }
      if (correlatedRun.job_evidence_status === "NOT_REQUIRED") {
        const jobEvidence = await collectRunJobEvidence({
          base,
          repository: target.repository,
          run: correlatedRun,
          token: githubToken,
          fetchImpl,
          observedAt,
          freshnessMinutes: Number(target.availability_freshness_minutes ?? 30),
          triggerLookbackHours: Number(target.trigger_lookback_hours ?? 24),
          force: true,
        });
        Object.assign(correlatedRun, {
          jobs: jobEvidence.jobs,
          job_evidence_status: jobEvidence.status,
          job_evidence_error: jobEvidence.error || null,
          runner_sentinel: jobEvidence.runner_sentinel,
          empty_steps_trigger: jobEvidence.empty_steps_trigger,
          github_hosted_runner_verified: jobEvidence.github_hosted_runner_verified,
        });
      }
      const receipt = {
        schema_version: 1,
        receipt_type: "GITHUB_CHECK_RUN_ANNOTATION",
        observed_at: observedAt,
        source: {
          repository: target.repository,
          branch: correlatedRun.head_branch || targetRef.branch,
          source_ref_type: targetRef.sourceRefType,
          pull_request_number: targetRef.pullRequestNumber,
          pull_request_discovery_pages: targetRef.pullRequestDiscoveryPages,
          head_sha: headSha,
          run_id: correlatedRun.id,
          run_attempt: correlatedRun.run_attempt,
          run_ref: correlatedRun.head_branch || targetRef.branch,
          run_event: correlatedRun.event,
          run_conclusion: correlatedRun.conclusion,
          check_suite_id: correlatedRun.check_suite_id,
          job_evidence_status: correlatedRun.job_evidence_status,
          runner_sentinel: correlatedRun.runner_sentinel,
          empty_steps_trigger: correlatedRun.empty_steps_trigger,
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
      receipt.dedupe_key = "gh-checkrun:" + target.repository + ":" + correlatedRun.id +
        ":" + correlatedRun.run_attempt + ":" + checkRun.id;
      receipts.push(receipt);
    }
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
    if (receipt.receipt_type && !["GITHUB_CHECK_RUN_ANNOTATION", "GITHUB_CHECK_RUN_UNMATCHED"].includes(receipt.receipt_type)) continue;
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
