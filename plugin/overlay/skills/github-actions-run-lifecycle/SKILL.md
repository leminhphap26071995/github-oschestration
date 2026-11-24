---
name: github-actions-run-lifecycle
description: Observe GitHub Actions as an asynchronous provider lifecycle, including admission, runner warm-up, job startup, logs, artifacts and evidence-based quota diagnosis.
---
# GitHub Actions Run Lifecycle

## Core model
A workflow run is asynchronous. The first API response is a snapshot, not a terminal verdict. Do not query once, see no jobs, and declare failure. Observe the lifecycle while the active host/session remains available; do not claim background polling after host termination unless a real scheduler/worker is verified.

## State machine
- `requested`, `queued`, `waiting`, `pending`: `RUN_ADMISSION_PENDING`; persist run ID and poll.
- `in_progress` run with no jobs: `RUNNER_WARMUP_PENDING`; empty jobs are transient.
- queued job without runner: `JOB_RUNNER_WARMUP`; wait for assignment.
- in-progress job with no steps: `JOB_STARTUP_PENDING`; do not infer failure.
- steps present: `JOB_EXECUTING`; observe step transitions and conclusions.
- completed run/job: `EXECUTION_TERMINAL`; collect every relevant attempt, job, step, annotation, log and artifact.
- completed failure without executed-step/log/provider cause: `EXECUTION_EVIDENCE_MISSING`; causal status remains `UNKNOWN`.
- observation budget expires while provider remains active: `OBSERVATION_WINDOW_EXPIRED`; this is not job failure or provider timeout.

## Observation procedure
1. Lock the exact source commit and execute the mandatory Git Tree-first evidence chain below before classifying any run.
2. Inspect the workflow trigger graph before writes: push/PR/tag/release/workflow_run/schedule, path/branch filters, matrix, concurrency and downstream fan-out.
3. Poll run admission/status; respect provider `Retry-After` and rate-limit headers.
4. Parse a known run URL suffix as run_id and verify it against the exact run object. For failure cause, inspect the exact-run annotation before querying job/runner/step metadata. If billing evidence is decisive, stop; only otherwise continue the full Git Tree → blob/receipt → runner_id → job_id → run_id + attempt → head_sha → actual execution provenance chain.
5. Poll job state and step summaries. Empty steps while startup is in progress remain pending.
6. Once a failure is visible, parse/verify the run URL's run_id and inspect the exact check-run annotation before querying job/runner/step metadata. If an annotation explicitly identifies Actions billing/payment failure, included-minutes exhaustion or a spending cap, classify that run `QUOTA_EXHAUSTED` immediately and STOP quota diagnosis for that run; do not request job payloads, runner metadata, steps or logs to reconfirm the cause. Only continue provenance/job/step inspection when the annotation is not decisive or an independent executed-step failure needs diagnosis. Retry `BlobNotFound` only when a log-producing step actually executed and the provider indicates a transient publication gap; a never-started job has no step log to retrieve.
7. Reconcile all attempts, jobs, check suites/runs, annotations, exact-SHA status, workflow YAML and artifacts. Classify each failed job independently.
8. If one connector wrapper is filtered, paginated, incomplete or fails, inspect its schema and use another authorized provider REST/API/CLI route. A failed adapter is not proof that provider data is absent.
9. Persist the execution cursor and continue while authorized work remains runnable; do not keep retrying a terminal evidence route after its bounded recovery pass is exhausted.


## Mandatory Git Tree-first evidence chain — MUST follow in this exact order

A report that begins with runner_id, a run/job wrapper, check-run ID or log URL is non-compliant. Git Tree is the first evidence anchor; runner metadata is only the third link.

`Git Tree → blob/receipt → runner_id → job_id → run_id + attempt → head_sha → actual execution`

1. **Git Tree:** lock exact source commit/root tree SHA. Enumerate workflow YAML, task/request manifest, receipt schema and expected outputs; resolve truncated trees recursively.
2. **blob/receipt:** fetch workflow/request blobs by exact tree-selected SHA. Retrieve the durable CI receipt/observer record and verify schema, content hash, repository/ref, source commit/tree, workflow path and task identity. A configured observer receipt may be labelled `ISSUE_OBSERVER_RECEIPT`.
3. **runner_id:** read from verified receipt and authoritative raw provider payload. Preserve PRESENT(value), explicit NULL and MISSING. Never coerce missing to zero. A raw `runner_id: 0` is an observed value, not cause, quota signal or execution proof.
4. **job_id:** bind the numeric job ID to runner, workflow and receipt. Preserve job name, status/conclusion, timestamps and full steps.
5. **run_id + attempt:** bind job to exact run/attempt recorded by the receipt. Preserve relevant attempts; do not silently use latest-attempt wrappers for earlier failures.
6. **head_sha:** cross-check receipt, run and job SHA against the source commit SHA established by Git Tree. A mismatch invalidates correlation.
7. **actual execution:** inspect step names/status/conclusion/times, exit codes, logs, outputs, artifact IDs/digests and receipt hashes. Runner assignment, IDs, compiled prompts or a green summary alone do not prove execution.

The CI role-selection/preflight gate uses this same chain. A role split is usable only after a source-bound receipt and actual executed preflight steps. Missing stages mean UNKNOWN/BLOCKED; never fall back to local Python or manual role selection.

The REST API may require a known run ID to retrieve attempt-scoped jobs. That is a transport dependency only; it does not change the evidence-validation order or make run/job/runner metadata the starting point. `GET /actions/jobs/{job_id}` is a downstream retrieval route only after source and receipt binding.

### Required trace receipt
Record repository/ref/commit SHA, root tree SHA, workflow/request blob SHAs, receipt URI/hash, runner_id, job_id, run_id, attempt, head_sha, executed steps/exit result, logs and artifact IDs/digests. Include exact source URLs and raw field states. Never skip a stage or claim execution from source/output file presence alone.





## Run URL, identifier and report consistency gate

A GitHub browser URL `https://github.com/{owner}/{repo}/actions/runs/{N}` identifies **`run_id=N`**, not a `runner_id`. A URL ending in `/actions/runs/44651409187` must be reported as `run_id=44651409187`. `runner_id` is a separate job field and may be PRESENT, NULL, MISSING, or a raw numeric zero.

Before interpreting or publishing an Actions report:
1. Parse the numeric suffix from every run URL and preserve it as `run_id`.
2. Fetch the exact run object. Verify its returned `id` equals the URL's run ID; verify repository, workflow/path, event, head SHA, status, conclusion and `run_attempt`. If the values disagree, mark `IDENTITY_INCONSISTENT`, stop interpretation and perform one materially different authoritative retrieval.
3. Retrieve the check-run annotation bound to that exact run/source SHA. If it explicitly identifies failed payment, a spending-limit restriction or equivalent Actions billing block, classify `QUOTA_EXHAUSTED` immediately and stop. Do not fetch job payloads, runner metadata, steps or logs merely to reconfirm quota. For fields not already available from the source-bound receipt, report `job_id=NOT_QUERIED_BY_DESIGN` and `runner_id=NOT_QUERIED_BY_DESIGN`; never invent or substitute values.
4. Only when the annotation is not decisive, or when an independent executed-step failure needs diagnosis, fetch attempt-scoped jobs. Verify each job's `run_id`, `run_attempt` and `head_sha` match the exact run. Keep `job_id` and `runner_id` separate. Then inspect steps/logs only where execution actually occurred.
5. Cross-check every displayed URL, run ID, job ID, runner ID, attempt and SHA against the authoritative provider payload and source-bound receipt. Any disagreement requires one materially different retrieval before causal interpretation; do not repeat the same failed adapter call.

Required report fields: `run_url`, `run_id`, `run_attempt`, `job_id` and `runner_id` with explicit observed/not-queried state, `head_sha`, `workflow_path`, `annotation_source`, `failure_classification`, and `actual_execution_state`. A known run ID in a URL must never be omitted or relabelled as a runner ID.


## Failure classification
- `STEP_FAILURE` / `WORKFLOW_FAILED`: an executed assertion, regression, compile, lint, dependency, test-runner or E2E step failed. Investigate implementation, test oracle, fixtures and caller path.
- `RUNNER_UNAVAILABLE`: provider explicitly identifies runner/host capacity failure; do not relabel it quota without a quota-specific message.
- `PERMISSION_DENIED`: provider explicitly identifies authorization or policy denial.
- `QUOTA_EXHAUSTED`: one authoritative annotation or provider/runner log tied to the affected Actions run explicitly identifies exhausted/blocked billing, included minutes, spending cap or required payment. This single message is sufficient; no separate billing API/dashboard or owner-supplied usage summary is required. Preserve exact text, source, run/job/step, repository owner and timestamp, plus any billing owner/period/reset supplied.
- `LOG_PUBLICATION_PENDING`: completed job logs are temporarily unavailable during bounded retry.
- `EXECUTION_EVIDENCE_MISSING`: failed run/job has no executed-step/log/provider cause after bounded alternate-route recovery.
- `API_METHOD_BLOCKED` / `API_RATE_LIMITED`: evidence route failed; try a materially different authorized route, not the same call repeatedly.
- `UNKNOWN`: annotations/logs and viable authorized evidence routes were exhausted without a reliable cause.

### Annotation-first decision order — decisive provider message short-circuits runner/log diagnosis
1. Bind the failed check run/annotation to the exact repository, source SHA and workflow run using the Git Tree/receipt identity.
2. Read the annotation text before querying job runner metadata or downloading logs.
3. If one authoritative annotation explicitly says the job was not started because recent account payments failed, a spending limit must be increased, Actions minutes/billing are exhausted, or equivalent billing restriction applies, classify that run `QUOTA_EXHAUSTED` immediately. Preserve the exact message, run URL/ID, check-run ID, source SHA and observation time. This annotation is sufficient; do not wait for `runner_id`, `steps`, a log archive or a billing dashboard. Stop further quota diagnosis for that run.
4. Only when no annotation establishes the cause, inspect attempt-scoped jobs and their exact executed steps/logs. `BlobNotFound` is retryable only for a job with an executed log-producing step and an indicated transient publication gap. If the provider says the job never started, do not request a nonexistent step-log archive.
5. If an executed step shows a test/assertion/regression/compile/lint/E2E failure, classify `STEP_FAILURE` and diagnose code/test behavior. Never request billing data for that failure.
6. Classify mixed jobs independently. A quota-blocked job cannot mask another job's executed assertion failure.
7. If evidence remains missing or ambiguous after bounded alternate-route retrieval, keep `UNKNOWN`; never infer quota from generic errors or runner warm-up symptoms.

A single log line is sufficient only when its content explicitly names exhausted/blocked Actions billing or quota. An arbitrary failed log line or generic message is not quota evidence.

Never infer quota from `runner_id=0`, empty jobs/steps, queued/in-progress status, `startup_failure` alone, missing log blobs, generic 403/404/422, connector errors, high run counts or historical usage. Historical usage is not remaining quota. Billing API unavailability establishes neither AVAILABLE nor EXHAUSTED.

## Bounded terminal-run closure
- A run is not terminal while the provider reports it active. Continue observation during that lifecycle.
- After terminal failure, inspect all available evidence and make one bounded pass over materially different authorized retrieval routes. Retry transient log publication gaps only within the configured bounded backoff.
- If the terminal run still has no executed steps/log/provider cause, record `EXECUTION_EVIDENCE_MISSING` / causal `UNKNOWN`, retain exact IDs/SHA/timestamps/routes, and mark its diagnostic branch `CLOSED_UNKNOWN`.
- `CLOSED_UNKNOWN` means stop revisiting that run's missing evidence; it does not mean CI passed. Do not repeat the same limitation in later turns. Reopen only on new evidence, a materially new attempt/SHA, or explicit owner request.
- Immediately continue the broader CI/build failure sweep and all independent AI-owned work. Inspect other jobs/runs/matrix legs/checks and repair any actionable failures. Never let one opaque run suppress evidence-backed failures elsewhere.

## Quota response
When one explicit provider annotation/log confirms exhaustion, capture the exact message/endpoint/status, owner/org, product, billing period and reset when available. Pause new trigger-producing work for that billing owner. Then load `skills/github-actions-quota-staging/SKILL.md` to search for a safe private target under a distinct billing owner; validate visibility, non-archived state, write permission, workflow compatibility and project/data suitability. Historical successful runs do not prove quota availability; require fresh automatic admission. Preserve upstream/staging repo/ref/SHA separately as `SYNC_PENDING`; staging CI is not upstream CI. Never copy secrets or unrelated private data, and do not stage into arbitrary repositories. If no safe target exists, keep CI `UNKNOWN/BLOCKED` and continue independent work. When upstream quota returns, sync/rebase and verify the exact upstream SHA before marking `SYNCED`. If quota remains UNKNOWN, do not call it available or exhausted.
## Trigger discipline
- Do not add `workflow_dispatch` or manual rerun controls where owner policy prohibits them.
- Prefer one authoritative automatic run per change lifecycle; avoid duplicate push+PR fan-out and retry storms.
- Scope branch/path filters, matrix size, concurrency and retries.
- Docs-only changes use content checks and remote readback unless CI is explicitly required.
- A quota check inside a hosted job cannot prevent that job's initial runner allocation.

## Evidence and acceptance
Bind every conclusion to exact repo/ref/SHA, run/attempt/job/step IDs, workflow path, timestamps, raw errors/logs, artifacts and consumer result. Run admission, job execution, source checks, artifact integrity and downstream consumer acceptance are separate gates. A commit, run conclusion or missing log alone is not completion.


## ChatGPT GitHub connector — direct REST API is authoritative (2026-11-15)

When diagnosing GitHub Actions in ChatGPT, first complete Git Tree → blob/receipt. Only then use `mcp__GitHub__fetch` through `functions.exec` for raw REST JSON; endpoint transport requirements must not reorder the evidence chain. For a known run, fetch `GET /repos/{owner}/{repo}/actions/runs/{run_id}`; for its exact attempt, fetch `GET /repos/{owner}/{repo}/actions/runs/{run_id}/attempts/{attempt}/jobs?per_page=100`. Bind every returned job to the requested run ID, attempt and exact `head_sha`.

**Do not treat `mcp__GitHub__fetch_workflow_run_jobs` as authoritative job metadata.** Its wrapper returns only the latest attempt and first page, and its projection can omit fields such as `runner_id` and `runner_name`. Use it only as a convenience index. A missing wrapper field is `MISSING`, not `0`, not `NULL`, and not evidence that GitHub omitted the field. Never normalize missing values with `?? 0`, `|| 0`, `Number(value) || 0`, or equivalent defaults.

Preserve the raw REST field state distinctly: `PRESENT(value)`, `NULL`, or `MISSING`. A numeric `runner_id: 0` is an actual zero only when it appears in the raw REST payload; it still does not establish the cause of failure. Reconcile `runner_id`, `runner_name`, `started_at`, `completed_at`, `status`, `conclusion`, and `steps` before classifying. If the exact REST payload reports zero/blank runner metadata and no executed steps, classify `RUNNER_ASSIGNMENT_UNCONFIRMED` / `EXECUTION_EVIDENCE_MISSING` until another provider source establishes the cause; do not jump to quota, source-test failure or a definitive runner outage.

For push-triggered runs, do not use `fetch_commit_workflow_runs` as the only discovery route; that wrapper is PR-filtered. Use exact run IDs or the raw `actions/runs?head_sha={SHA}` REST route. Use `/commits/{sha}/check-runs?per_page=100` for exact-SHA check evidence. Retrieve annotations with `/check-runs/{check_run_id}/annotations?per_page=100` only when the active connector allows that endpoint. If the tool rejects an endpoint as unsupported, record `API_METHOD_BLOCKED` and switch to another authorized route; that rejection does not mean annotations are absent. Use the dedicated job-steps/log tools as supplementary routes. `BlobNotFound` is only a failed log-download route.

Example ChatGPT tool call:

```javascript
const response = await tools.mcp__GitHub__fetch({
  url: "https://api.github.com/repos/OWNER/REPO/actions/runs/RUN_ID/attempts/ATTEMPT/jobs?per_page=100"
});
const payload = JSON.parse(response.result.content);
```

This is a retrieval/interpretation contract for the active host, not a claim that every REST endpoint is allowlisted or that plugin instructions create a host-level interceptor.


## ChatGPT raw GitHub REST recovery — run ID and step truth

The connected GitHub wrappers are projections with different filters and field loss. In ChatGPT, use `mcp__GitHub__fetch` through `functions.exec` with the exact REST URL whenever the wrapper result has `run_id=[]`, omits a run, omits runner fields, or returns incomplete steps.

1. Lock repository, exact head SHA, branch, event and workflow path from the source commit/push.
2. If a wrapper gives no run ID, call raw `GET /repos/{owner}/{repo}/actions/runs?head_sha={exact_sha}&branch={branch}&event={event}&per_page=100`. Parse `workflow_runs[]`; select only entries whose `head_sha`, branch, event and workflow path match the target. Do not use `fetch_commit_workflow_runs` for push events: that wrapper filters to pull-request runs.
3. With the exact `run_id`, call raw `GET /repos/{owner}/{repo}/actions/runs/{run_id}` and verify `head_sha`, `run_attempt`, `event`, `path`, status and conclusion.
4. Fetch the exact attempt's complete job payload using raw `GET /repos/{owner}/{repo}/actions/runs/{run_id}/attempts/{attempt_number}/jobs?per_page=100`. Parse `jobs[]` and preserve each `job.id`, `run_id`, `run_attempt`, `head_sha`, `runner_id`, `status`, `conclusion`, timestamps and full `steps[]`. This raw response is authoritative over convenience wrappers such as `fetch_workflow_run_jobs` and `fetch_workflow_job_steps`, which may filter attempts or project only selected fields.
5. Keep field states distinct: PRESENT with value, explicit NULL, and MISSING. Never default missing `run_id`, `job.id`, `runner_id` or `steps` to an empty array or zero. If `run_id` is empty, recover it from the raw run list; if job IDs are missing, recover the exact attempt-scoped jobs before requesting logs.
6. Empty `steps[]` is execution metadata, not a cause. If run/job is active or queued, classify startup/warm-up and observe. If terminal, inspect the exact check-run annotation before logs. An explicit billing/payment/spending-limit annotation is decisive `QUOTA_EXHAUSTED` even when `runner_id=0` and `steps=[]`; stop there and do not fetch logs for a job that never started. Only use logs/artifacts for causes not already established by provider annotations.
7. Record exact URL, query, SHA, run/attempt/job IDs, response timestamp/status and raw fields. A wrapper error is an adapter failure, not evidence the provider object is absent.

### Interpretation boundary
A raw job payload containing `runner_id=0` and `steps=[]` proves only that no runner/step execution is represented in that job record. It does not diagnose why admission failed. If the exact run's provider annotation states that payment failed or a spending limit must be increased, that annotation supplies the cause and the run is `QUOTA_EXHAUSTED`; do not continue querying runner metadata or log archives for a second quota signal.

## Artifact storage quota vs Actions billing usage

Treat artifact storage as a separate provider resource from runner compute and Actions billing usage:
- `ARTIFACT_STORAGE_QUOTA_EXHAUSTED`: classify only when an authoritative provider annotation, upload response or billing/storage diagnostic explicitly states that the applicable Actions artifact-storage quota/cap is exhausted. Record the repository/account/org storage scope, exact message, run and artifact identity, timestamp, and any retention/storage figures supplied.
- `ACTIONS_BILLING_USAGE_EXHAUSTED`: classify only when an authoritative provider message explicitly identifies exhausted included Actions minutes, billing usage/budget, spending cap or required payment for the affected billing owner and period.
- `ARTIFACT_SIZE_LIMIT`: a per-file/per-artifact size ceiling or payload limit. It is not proof that account storage quota is exhausted.
- `ARTIFACT_EXPIRED` / retention expiry: an artifact past its retention window is not storage-quota exhaustion.
- `ARTIFACT_UPLOAD_FAILURE`: invalid path/name, unsupported file, missing permissions, transient upload error or a failed upload step without explicit storage-quota wording.
- `API_RATE_LIMITED`: provider/API request throttling; respect `Retry-After` and do not relabel it as compute or storage quota exhaustion.

A generic HTTP 413/403/404/429, `BlobNotFound`, missing artifact, empty artifact list, runner metadata, or an upload failure alone does not prove artifact-storage quota exhaustion. Keep compute/billing, artifact storage, per-artifact size, retention, API rate limits, permission failures and ordinary step failures as distinct diagnoses. Classify mixed failures independently and continue other runnable work.

## ChatGPT connector annotation recovery

Use the exact-SHA /commits/{sha}/check-runs?per_page=100 response to identify the failed check-run, its annotations_count and exact annotations_url. Call that URL only through an allowed provider route. If mcp__GitHub__fetch rejects that subresource, record API_METHOD_BLOCKED, keep the URL/count and try one materially different authorized route (for example a supported provider surface that exposes the exact check-run output). A rejected route is not an empty annotation list. If no route is available, keep connector retrieval BLOCKED and distinguish exact annotation text supplied by the owner (REPORTED). Never say ChatGPT read annotation content when only the annotation URL/count was observed.


## Workflow Quality Gate and no-runner annotation recovery

Required chain: Preflight Validation -> Real Failure Detection -> Annotation & Log Retrieval -> Root Cause Classification -> Evidence Receipt.

Preflight validates workflow YAML and GitHub Actions semantics with a pinned parser/linter, then resolves every referenced action metadata file and checks runs.using. Do not infer runtime compatibility from an action tag. Node.js 16 and Node.js 20 action runtimes are retired; Node.js 24 is the supported JavaScript action runtime. Unknown metadata or Node.js 18 is not a pass.

Real-failure tests must contain a genuine malformed workflow/configuration or runtime defect. Never print a prewritten ::error:: string to simulate parser output. Keep every test bound to the exact source SHA.

For a normal job-backed failure, retrieve exact run/attempt jobs, Check Run annotations by check_run_id, and job logs as separate channels. If the terminal source run has zero jobs and no console log, use an independent trusted observer on the exact SHA. Let actionlint parse the actual defective file; use a GitHub Problem Matcher to attach the real diagnostic to the observer Check Run. After observer completion, a separate workflow_run collector retrieves the exact annotation message via the Checks API.

Preserve provenance: an observer annotation belongs to the observer Check Run, not the original zero-job source run. Link both runs, check_run_id and source SHA. Publish a plain Markdown receipt plus raw JSON through repository Contents so ChatGPT can read it without downloading or extracting a ZIP.

Keep MISSING distinct from explicit runner_id=0 and steps=[]. A zero-job source run has no job object, so runner_id and steps are absent. Neither no jobs, runner_id=0, empty steps, BlobNotFound, missing logs nor generic HTTP errors prove quota. QUOTA_EXHAUSTED requires explicit provider evidence of Actions billing/minutes/spending-limit/payment restriction.

Acceptance cases: genuine YAML syntax failure; valid-YAML semantic defect; retired action runtime metadata; normal job-backed failure; zero-job/no-console-log source run; explicit runner_id=0 with steps=[] counterexample; blocked annotation endpoint recovered by authorized gh api; ChatGPT reads exact Markdown and JSON receipt. Annotation count alone is not message-level proof.


## 2026-11-24 correction — no-runner state triggers Notion annotation recovery

This section is the controlling failure-recovery rule and supersedes any older wording that treats a no-runner/empty-step observation or a blocked GitHub annotation endpoint as a terminal blocker.

### Trigger semantics — NOT a root-cause classification

For an exact repository/ref/SHA/run-attempt, any of these observations triggers immediate annotation recovery:
- A raw attempt-scoped job contains the numeric value `runner_id: 0` (not a missing or null field).
- A terminal failed run has an exact job payload with `steps: []`.
- The exact-SHA Check Run reports `annotations_count > 0`.

These are workflow-routing signals only. `runner_id=0`, `steps=[]`, no jobs, blank runner metadata, missing logs and `BlobNotFound` are not a cause, quota diagnosis, or user-facing blocker. Preserve PRESENT/NULL/MISSING; never coerce missing fields to zero or an empty list. If the run is still active, continue observing its lifecycle; do not call startup metadata a terminal failure.

### Mandatory Notion relay path — immediately after the trigger

1. Parse `run_id` from the exact `/actions/runs/{N}` URL; verify repository, workflow path, event, ref, head SHA and `run_attempt`. Keep `job_id`, `check_run_id` and `runner_id` distinct.
2. Resolve the configured Notion annotation-relay destination from the current ticket/observer configuration (currently the GM-50 relay page; never guess a page ID). Query its discussions and paginate until every page/comment is read.
3. Correlate the receipt against **all** identity fields available: repository, branch/ref, exact head SHA, workflow run ID, attempt, Check Run ID and workflow identity. Verify receipt schema, annotation pagination/completeness and whether the annotation belongs to the source Check Run or a separate observer Check Run.
4. Interpret only the matching receipt's actual annotation body. An explicit provider-owned Actions billing/payment/spending-cap message is sufficient for `QUOTA_EXHAUSTED`; other messages must be classified by their actual content. Annotation count alone is not message-level evidence.
5. If no exact receipt exists, record `NOTION_RELAY_RECEIPT_NOT_FOUND_FOR_EXACT_RUN`. This means the relay evidence has not arrived or does not cover that ref/run; it does **not** mean annotations are absent and does not close the diagnostic branch.

### Missing-receipt recovery remains AI-owned work

When the exact receipt is missing, continue investigating and repairing the relay path before reporting any blocker: observer workflow trigger coverage (`workflow_run` filters and schedule), configured target repository/ref/branch, exact-SHA run discovery, Check Run pagination, private-target credentials/secrets presence, Notion API authorization/page sharing, publication errors, and receipt deduplication. Use the configured independent observer; do not assume a main-only observer covers PR branches. A scheduled poll covers only the refs actually configured in its private target inventory. Keep secrets out of chat. Provisioning an owner's private secret or granting account/page access is owner-exclusive only if no authorized AI route can perform it; continue every other AI-owned criterion around that boundary.

A GitHub connector rejection such as `API_METHOD_BLOCKED` is only a transport result. It must route to the Notion relay immediately; it is never the terminal diagnosis while the Notion route or relay implementation/configuration remains unexamined. Do not publish generic `UNKNOWN / API_METHOD_BLOCKED` before this recovery. Only after the Notion relay and materially distinct authorized routes have been checked, and relay/configuration repair work is exhausted or genuinely owner-exclusive, may the causal result remain `UNKNOWN` with the exact missing evidence named.

### Owner-facing output gate

`AI_OWNER && AI_WORK_REMAINING => NO_USER_HANDOFF && NOT_DONE`. Do not send progress reports, phase summaries, interim blockers, partial results or permission-to-continue questions while any authorized AI-owned work remains runnable. Treat missing evidence as an engineering task, not as a reason to interrupt the owner. Final output is allowed only after all feasible AI-owned requirements, verification, repair/retest and readback are complete; a genuine host termination must preserve the exact recovery cursor without being described as completion.
