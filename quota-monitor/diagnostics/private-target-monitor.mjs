#!/usr/bin/env node
import { appendFile, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { createGitHubApi, GitHubApiError } from "./github-api.mjs";
import { collectDiagnostics } from "./collect.mjs";
import { classifyRun, sanitizeText } from "./classify.mjs";

function assert(condition, code) {
  if (!condition) throw new Error(code);
}

function validateTargets(config) {
  assert(config && config.schema_version === 1 && Array.isArray(config.targets), "INVALID_TARGETS_SCHEMA");
  assert(config.targets.length > 0, "EMPTY_TARGETS");
  const ids = new Set();
  for (const target of config.targets) {
    assert(/^target-[a-z0-9]{1,16}$/.test(target.id || ""), "INVALID_TARGET_ID");
    assert(!ids.has(target.id), "DUPLICATE_TARGET_ID");
    ids.add(target.id);
    assert(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(target.repository || ""), "INVALID_TARGET_REPOSITORY");
    assert(/^[A-Za-z0-9._/-]+$/.test(target.branch || ""), "INVALID_TARGET_BRANCH");
    assert(!target.branch.includes(".."), "INVALID_TARGET_BRANCH");
    assert(Array.isArray(target.expected_workflows) && target.expected_workflows.length > 0, "MISSING_EXPECTED_WORKFLOWS");
    const workflowIds = new Set();
    for (const workflow of target.expected_workflows) {
      assert(/^workflow-[a-z0-9]{1,16}$/.test(workflow.id || ""), "INVALID_WORKFLOW_ALIAS");
      assert(!workflowIds.has(workflow.id), "DUPLICATE_WORKFLOW_ALIAS");
      workflowIds.add(workflow.id);
      assert(/^\.github\/workflows\/[A-Za-z0-9._/-]+\.ya?ml$/i.test(workflow.path || ""), "INVALID_EXPECTED_WORKFLOW_PATH");
      assert(!workflow.path.includes(".."), "INVALID_EXPECTED_WORKFLOW_PATH");
      assert(workflow.event === "push" || workflow.event === "schedule", "UNSUPPORTED_EXPECTED_EVENT");
      assert(Number.isSafeInteger(workflow.grace_minutes) && workflow.grace_minutes >= 5 && workflow.grace_minutes <= 1440, "INVALID_GRACE_MINUTES");
      if (workflow.event === "push") {
        assert(workflow.expectation === "every_push", "PUSH_EXPECTATION_MUST_BE_EXPLICIT");
      } else {
        assert(workflow.expectation === "schedule", "SCHEDULE_EXPECTATION_MUST_BE_EXPLICIT");
        assert(Number.isSafeInteger(workflow.expected_interval_minutes) &&
          workflow.expected_interval_minutes >= 5 && workflow.expected_interval_minutes <= 10080,
          "INVALID_EXPECTED_INTERVAL");
      }
    }
  }
  if (config.billing_snapshot) {
    validateBillingSnapshot(config.billing_snapshot);
    for (const target of config.targets) {
      assert(target.billing_scope === "user" || target.billing_scope === "organization", "BILLING_SCOPE_REQUIRED");
    }
  }
  return config.targets;
}

function validateBillingSnapshot(snapshot) {
  assert(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(snapshot.repository || ""), "INVALID_BILLING_SNAPSHOT_REPOSITORY");
  assert(/^[A-Za-z0-9._/-]+$/.test(snapshot.branch || ""), "INVALID_BILLING_SNAPSHOT_BRANCH");
  assert(!snapshot.branch.includes(".."), "INVALID_BILLING_SNAPSHOT_BRANCH");
  assert(/^[A-Za-z0-9._/-]+\.json$/i.test(snapshot.path || ""), "INVALID_BILLING_SNAPSHOT_PATH");
  assert(!snapshot.path.includes(".."), "INVALID_BILLING_SNAPSHOT_PATH");
  assert(Number.isSafeInteger(snapshot.max_age_minutes) &&
    snapshot.max_age_minutes >= 5 && snapshot.max_age_minutes <= 10080,
    "INVALID_BILLING_SNAPSHOT_MAX_AGE");
}

function apiError(error) {
  if (error instanceof GitHubApiError) return { http_status: error.status, code: error.code };
  return { http_status: null, code: sanitizeText(error?.message || "UNEXPECTED_API_ERROR") };
}

async function fetchBillingSnapshot({ config, token, apiUrl, fetchImpl }) {
  if (!config) return { status: "NOT_CONFIGURED", snapshot: null };
  const api = createGitHubApi({ token, apiUrl, fetchImpl });
  const [owner, repo] = config.repository.split("/");
  api.setRepository(owner, repo);
  try {
    const url = "/repos/" + config.repository + "/contents/" + config.path +
      "?ref=" + encodeURIComponent(config.branch);
    const { data } = await api.getJson(url);
    if (data?.encoding !== "base64" || typeof data.content !== "string") {
      return { status: "CONTENT_UNAVAILABLE", snapshot: null };
    }
    const snapshot = JSON.parse(Buffer.from(data.content.replace(/\s/g, ""), "base64").toString("utf8"));
    return { status: "RETRIEVED", snapshot };
  } catch (error) {
    return { status: "API_ERROR", snapshot: null, api_error: apiError(error) };
  }
}

export function evaluateBillingEvidence({ snapshotState, target, now, maxAgeMinutes }) {
  if (!snapshotState || snapshotState.status !== "RETRIEVED") {
    return { status: snapshotState?.status || "NOT_CONFIGURED", classification: null };
  }
  const snapshot = snapshotState.snapshot;
  const collectedAt = Date.parse(snapshot?.collected_at_utc || "");
  if (!Number.isFinite(collectedAt)) return { status: "SNAPSHOT_TIMESTAMP_INVALID", classification: null };
  const ageMinutes = Math.max(0, Math.floor((now.getTime() - collectedAt) / 60000));
  if (ageMinutes > maxAgeMinutes) return { status: "STALE_SNAPSHOT", classification: null, age_minutes: ageMinutes };

  const [targetOwner, targetRepo] = target.repository.split("/");
  const account = (snapshot.accounts || []).find(item =>
    String(item.owner || "").toLowerCase() === targetOwner.toLowerCase() &&
    item.scope === target.billing_scope
  );
  if (!account) return { status: "BILLING_OWNER_NOT_IN_SNAPSHOT", classification: null, age_minutes: ageMinutes };
  if (account.summary_error || account.status === "UNKNOWN") {
    return { status: "BILLING_SNAPSHOT_UNKNOWN", classification: null, age_minutes: ageMinutes };
  }
  if (target.billing_scope === "user") {
    return {
      status: "PERSONAL_REMAINING_QUOTA_NOT_EXPOSED",
      classification: null,
      age_minutes: ageMinutes,
    };
  }

  const budgets = account.budget?.items || [];
  const matchesTarget = budget => {
    const productSkus = budget.product_skus || [];
    const isActions = productSkus.some(value =>
      typeof value === "string" && (value.toLowerCase() === "actions" || value.toLowerCase().startsWith("actions_"))
    );
    if (!isActions || budget.prevent_further_usage !== true) return false;
    const scope = String(budget.scope || "").toLowerCase();
    const entity = String(budget.entity || "").trim().toLowerCase();
    if (scope === "organization") return !entity || entity === targetOwner.toLowerCase();
    if (scope === "repository") return entity === target.repository.toLowerCase() || entity === targetRepo.toLowerCase();
    return false;
  };
  const matchingBudgets = budgets.filter(matchesTarget);
  const hardCap = matchingBudgets.find(item => item.status === "HARD_CAP_REACHED");
  if (hardCap) {
    return {
      status: "HARD_CAP_REACHED",
      classification: "ACTIONS_BILLING_QUOTA_EXHAUSTED",
      evidence_type: "BILLING_HARD_CAP_SNAPSHOT",
      age_minutes: ageMinutes,
    };
  }
  if (matchingBudgets.some(item => item.status === "HARD_CAP_NOT_REACHED")) {
    return { status: "HARD_CAP_NOT_REACHED", classification: null, age_minutes: ageMinutes };
  }
  if (matchingBudgets.some(item => item.status === "UNKNOWN_SPEND")) {
    return { status: "BILLING_BUDGET_SPEND_UNKNOWN", classification: null, age_minutes: ageMinutes };
  }
  return { status: "NO_MATCHING_ACTIONS_HARD_CAP", classification: null, age_minutes: ageMinutes };
}

function evidenceTypes(record) {
  const values = [];
  for (const item of record.run_classification?.evidence || []) values.push(item.type);
  for (const job of record.jobs || []) {
    for (const item of job.evidence || []) values.push(item.type);
  }
  return [...new Set(values)];
}

async function lintWorkflow({ actionlintPath = "actionlint", sourceText, workflowId, lintImpl }) {
  if (typeof lintImpl === "function") return lintImpl({ sourceText, workflowId });
  const root = await mkdtemp(join(tmpdir(), "private-workflow-"));
  const file = join(root, "workflow.yml");
  try {
    await writeFile(file, sourceText, "utf8");
    try {
      const output = execFileSync(actionlintPath, ["-oneline", file], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      });
      return { status: "VALID", diagnostic: output };
    } catch (error) {
      if (error?.code === "ENOENT") return { status: "TOOL_UNAVAILABLE", diagnostic: "" };
      const output = String(error?.stdout || "") + "\n" + String(error?.stderr || "");
      return {
        status: "DIAGNOSTIC",
        diagnostic: output.replaceAll(file, "workflow:" + workflowId).trim(),
      };
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function getWorkflowDefinition({ api, repository, path, sha, workflowId, lintImpl }) {
  const [owner, repo] = repository.split("/");
  const url = "/repos/" + owner + "/" + repo + "/contents/" + path + "?ref=" + sha;
  try {
    const { data } = await api.getJson(url);
    if (data?.encoding !== "base64" || typeof data.content !== "string") {
      return { status: "UNAVAILABLE", classification: "UNKNOWN", evidence_types: ["WORKFLOW_CONTENT_FORMAT_UNSUPPORTED"] };
    }
    const sourceText = Buffer.from(data.content.replace(/\s/g, ""), "base64").toString("utf8");
    const lint = await lintWorkflow({ sourceText, workflowId, lintImpl });
    const result = classifyRun({
      source: { status: "completed", conclusion: "failure" },
      jobs: [],
      jobsStatus: "RETRIEVED",
      checkSuite: { status: "NOT_AVAILABLE", check_runs: [] },
      workflowDiagnostic: lint.diagnostic,
      workflowDiagnosticStatus: lint.status,
    });
    return {
      status: lint.status,
      classification: result.classification,
      evidence_types: [...new Set(result.evidence.map(item => item.type))],
      diagnostic: lint.diagnostic,
    };
  } catch (error) {
    const details = apiError(error);
    return {
      status: "UNAVAILABLE",
      classification: "UNKNOWN",
      evidence_types: ["WORKFLOW_DEFINITION_UNAVAILABLE"],
      api_error: details,
    };
  }
}

function eventForRun(repository, run) {
  const action = run.status === "completed"
    ? "completed"
    : run.status === "in_progress"
      ? "in_progress"
      : "requested";
  return {
    action,
    repository: { full_name: repository },
    workflow: { id: run.workflow_id, name: run.name, path: run.path },
    workflow_run: run,
  };
}

function safeRunRecord({ targetId, workflowId, run, diagnostics }) {
  return {
    target_id: targetId,
    workflow_id: workflowId,
    status: "RUN_OBSERVED",
    run_observed: true,
    run_status: run.status ?? "UNKNOWN",
    run_conclusion: run.conclusion ?? null,
    classification: diagnostics.run_classification?.classification || "UNKNOWN",
    classifications: diagnostics.run_classification?.classifications || ["UNKNOWN"],
    evidence_types: evidenceTypes(diagnostics),
    jobs_status: diagnostics.source.jobs_status,
    job_count: diagnostics.source.job_count,
    check_suite_status: diagnostics.check_suite.status,
    workflow_definition_status: diagnostics.workflow_definition.status,
  };
}

export async function monitorPrivateTargets({
  targetsJson,
  token,
  apiUrl = "https://api.github.com",
  fetchImpl = globalThis.fetch,
  now = new Date(),
  lintImpl,
  sleepImpl,
  actionlintPath = "actionlint",
} = {}) {
  if (!token) return {
    schema_version: 1,
    recorded_at: now.toISOString(),
    coverage_status: "BLOCKED",
    blocker: "PRIVATE_MONITOR_TOKEN_NOT_CONFIGURED",
    targets: [],
  };
  if (!targetsJson) return {
    schema_version: 1,
    recorded_at: now.toISOString(),
    coverage_status: "BLOCKED",
    blocker: "PRIVATE_TARGETS_JSON_NOT_CONFIGURED",
    targets: [],
  };

  let config;
  try {
    config = JSON.parse(targetsJson);
  } catch {
    return {
      schema_version: 1,
      recorded_at: now.toISOString(),
      coverage_status: "BLOCKED",
      blocker: "PRIVATE_TARGETS_JSON_INVALID",
      targets: [],
    };
  }

  let targets;
  let billingSnapshotConfig;
  try {
    targets = validateTargets(config);
    billingSnapshotConfig = config.billing_snapshot || null;
  } catch (error) {
    return {
      schema_version: 1,
      recorded_at: now.toISOString(),
      coverage_status: "BLOCKED",
      blocker: sanitizeText(error.message),
      targets: [],
    };
  }

  const billingSnapshotState = await fetchBillingSnapshot({
    config: billingSnapshotConfig,
    token,
    apiUrl,
    fetchImpl,
  });
  const results = [];
  for (const target of targets) {
    const billingEvidence = evaluateBillingEvidence({
      snapshotState: billingSnapshotState,
      target,
      now,
      maxAgeMinutes: billingSnapshotConfig?.max_age_minutes,
    });
    const api = createGitHubApi({ token, apiUrl, fetchImpl });
    const [owner, repo] = target.repository.split("/");
    api.setRepository(owner, repo);

    let branch;
    let runs;
    try {
      const branchResponse = await api.getJson("/repos/" + target.repository + "/branches/" + encodeURIComponent(target.branch));
      branch = branchResponse.data;
      const headSha = branch?.commit?.sha;
      assert(typeof headSha === "string" && /^[a-f0-9]{40}$/i.test(headSha), "TARGET_HEAD_SHA_UNAVAILABLE");
      const runsUrl = "/repos/" + target.repository + "/actions/runs?branch=" +
        encodeURIComponent(target.branch) + "&per_page=100";
      const runPage = await api.paginate(runsUrl, "workflow_runs");
      runs = runPage.items;
    } catch (error) {
      results.push({
        target_id: target.id,
        status: "TARGET_API_ERROR",
        classification: "UNKNOWN",
        evidence_types: ["TARGET_API_UNAVAILABLE"],
        billing_evidence_status: billingEvidence.status,
        api_error: apiError(error),
      });
      continue;
    }

    const headSha = branch.commit.sha;
    const commitDate = branch.commit.commit?.committer?.date ||
      branch.commit.commit?.author?.date || null;
    const commitAgeMinutes = commitDate
      ? Math.max(0, Math.floor((now.getTime() - Date.parse(commitDate)) / 60000))
      : null;

    for (const expected of target.expected_workflows) {
      const grace = expected.grace_minutes;
      let candidates = runs.filter(run =>
        run.path === expected.path && run.event === expected.event &&
        run.head_branch === target.branch
      );

      if (expected.event === "push") {
        candidates = candidates.filter(run => run.head_sha === headSha);
      } else {
        const windowMinutes = expected.expected_interval_minutes + grace;
        const since = now.getTime() - windowMinutes * 60000;
        candidates = candidates.filter(run => Date.parse(run.created_at || "") >= since);
      }

      candidates.sort((a, b) => Date.parse(b.created_at || "") - Date.parse(a.created_at || ""));
      const run = candidates[0];
      if (run) {
        try {
          const definition = await getWorkflowDefinition({
            api,
            repository: target.repository,
            path: expected.path,
            sha: run.head_sha,
            workflowId: expected.id,
            lintImpl,
            actionlintPath,
          });
          const diagnostics = await collectDiagnostics({
            event: eventForRun(target.repository, run),
            repository: target.repository,
            token,
            apiUrl,
            fetchImpl,
            sleepImpl,
            recordedAt: now.toISOString(),
            workflowDiagnostic: definition.diagnostic || "",
            workflowDiagnosticStatus: definition.status,
          });
          const safeRecord = safeRunRecord({
            targetId: target.id,
            workflowId: expected.id,
            run,
            diagnostics,
          });
          if (definition.classification && definition.classification !== "UNKNOWN" &&
              !safeRecord.classifications.includes(definition.classification)) {
            safeRecord.classifications.push(definition.classification);
            safeRecord.classification = definition.classification;
          }
          const executionObserved = diagnostics.jobs.some(job =>
            (job.runner_id?.state === "PRESENT" && Number.isSafeInteger(job.runner_id.value) && job.runner_id.value > 0) ||
            (Array.isArray(job.steps) && job.steps.length > 0)
          );
          const admissionClasses = new Set([
            "UNKNOWN", "RUNNER_NOT_ASSIGNED_YET", "OBSERVATION_WINDOW_IN_PROGRESS",
            "LOG_PUBLICATION_PENDING", "EXECUTION_EVIDENCE_MISSING",
          ]);
          if (billingEvidence.classification === "ACTIONS_BILLING_QUOTA_EXHAUSTED" &&
              !executionObserved && admissionClasses.has(safeRecord.classification)) {
            safeRecord.classification = "ACTIONS_BILLING_QUOTA_EXHAUSTED";
            if (!safeRecord.classifications.includes("ACTIONS_BILLING_QUOTA_EXHAUSTED")) {
              safeRecord.classifications.push("ACTIONS_BILLING_QUOTA_EXHAUSTED");
            }
            safeRecord.evidence_types = [...new Set([...safeRecord.evidence_types, "BILLING_HARD_CAP_SNAPSHOT"])];
          }
          safeRecord.billing_evidence_status = billingEvidence.status;
          results.push(safeRecord);
        } catch (error) {
          results.push({
            target_id: target.id,
            workflow_id: expected.id,
            status: "DIAGNOSTICS_API_ERROR",
            run_observed: true,
            run_status: run.status ?? "UNKNOWN",
            run_conclusion: run.conclusion ?? null,
            classification: "UNKNOWN",
            evidence_types: ["DIAGNOSTICS_COLLECTION_FAILED"],
            api_error: apiError(error),
          });
        }
        continue;
      }

      const ageMinutes = expected.event === "push"
        ? commitAgeMinutes
        : expected.expected_interval_minutes + grace + 1;
      if (ageMinutes !== null && ageMinutes <= grace) {
        results.push({
          target_id: target.id,
          workflow_id: expected.id,
          status: "OBSERVATION_WINDOW_IN_PROGRESS",
          run_observed: false,
          commit_age_minutes: ageMinutes,
          classification: "OBSERVATION_WINDOW_IN_PROGRESS",
          billing_evidence_status: billingEvidence.status,
          evidence_types: ["RUN_DISCOVERY_PENDING"],
        });
        continue;
      }

      const definition = await getWorkflowDefinition({
        api,
        repository: target.repository,
        path: expected.path,
        sha: headSha,
        workflowId: expected.id,
        lintImpl,
        actionlintPath,
      });
      results.push({
        target_id: target.id,
        workflow_id: expected.id,
        status: "NO_RUN_OBSERVED",
        run_observed: false,
        commit_age_minutes: ageMinutes,
        workflow_definition_status: definition.status,
        classification: definition.classification === "UNKNOWN" &&
          billingEvidence.classification === "ACTIONS_BILLING_QUOTA_EXHAUSTED"
          ? "ACTIONS_BILLING_QUOTA_EXHAUSTED" : definition.classification,
        evidence_types: [...new Set([
          ...definition.evidence_types,
          ...(definition.classification === "UNKNOWN" &&
            billingEvidence.classification === "ACTIONS_BILLING_QUOTA_EXHAUSTED"
            ? ["BILLING_HARD_CAP_SNAPSHOT"] : []),
        ])],
        billing_evidence_status: billingEvidence.status,
        api_error: definition.api_error ?? null,
      });
    }
  }

  const blocked = results.some(item =>
    item.status === "TARGET_API_ERROR" || item.status === "DIAGNOSTICS_API_ERROR" ||
    item.classification === "UNKNOWN" || item.status === "NO_RUN_OBSERVED"
  );
  const billingCoverageStatus = !billingSnapshotConfig ? "NOT_CONFIGURED" :
    billingSnapshotState.status !== "RETRIEVED" ? billingSnapshotState.status :
    results.every(item => ["HARD_CAP_REACHED", "HARD_CAP_NOT_REACHED"].includes(item.billing_evidence_status))
      ? "OBSERVED" : "PARTIAL";
  return {
    schema_version: 1,
    recorded_at: now.toISOString(),
    coverage_status: blocked ? "PARTIAL" : "OBSERVED",
    billing_snapshot_status: billingSnapshotState.status,
    billing_coverage_status: billingCoverageStatus,
    private_details_redacted: true,
    targets: results,
  };
}

export function renderPrivateTargetSummary(record) {
  const lines = [
    "# Private GitHub Actions observer",
    "",
    "- Coverage: " + record.coverage_status,
    "- Private target details: redacted from this public repository artifact",
    "",
    "| Target | Workflow | Status | Run observed | Classification | Billing evidence | Evidence |",
    "| --- | --- | --- | --- | --- | --- | --- |",
  ];
  for (const item of record.targets || []) {
    lines.push("| " + item.target_id + " | " + (item.workflow_id || "—") + " | " + item.status +
      " | " + (item.run_observed ? "yes" : "no") + " | " + item.classification +
      " | " + (item.billing_evidence_status || "NOT_CONFIGURED") +
      " | " + (item.evidence_types || []).join(", ") + " |");
  }
  if (record.blocker) lines.push("", "Coverage blocker: " + record.blocker);
  lines.push("", "No run observed, runner_id=0, empty steps, HTTP errors or missing logs do not prove quota exhaustion.");
  return lines.join("\n") + "\n";
}

async function main() {
  const record = await monitorPrivateTargets({
    targetsJson: process.env.PRIVATE_TARGETS_JSON,
    token: process.env.PRIVATE_MONITOR_TOKEN,
    apiUrl: process.env.GITHUB_API_URL || "https://api.github.com",
  });
  process.stdout.write(JSON.stringify(record) + "\n");
  if (process.env.GITHUB_STEP_SUMMARY) {
    await appendFile(process.env.GITHUB_STEP_SUMMARY, renderPrivateTargetSummary(record), "utf8");
  }
  await writeFile("private-target-diagnostics.json", JSON.stringify(record, null, 2) + "\n", "utf8");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    process.stderr.write("PRIVATE_TARGET_MONITOR_FAILED: " + sanitizeText(error.message) + "\n");
    process.exitCode = 1;
  });
}
