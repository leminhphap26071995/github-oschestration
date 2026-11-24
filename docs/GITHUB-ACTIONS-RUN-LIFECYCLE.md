# GitHub Actions Run Lifecycle and Evidence Collection

A workflow run is asynchronous. The first API observation is a snapshot, not a terminal verdict. Runs pass through admission, queueing, runner allocation/warm-up, job startup, steps, completion and log/artifact publication.

## State machine
- requested/queued/waiting/pending run: RUN_ADMISSION_PENDING; preserve run ID and poll.
- in_progress run with no jobs: RUNNER_WARMUP_PENDING; empty jobs are transient, not failure.
- queued job: JOB_RUNNER_WARMUP; wait for runner assignment.
- in_progress job with no steps: JOB_STARTUP_PENDING; do not infer failure.
- steps present: JOB_EXECUTING; observe transitions.
- completed run/job: EXECUTION_TERMINAL; collect all attempts, jobs, steps, annotations, logs and artifacts.
- completed failure without executed-step evidence: EXECUTION_EVIDENCE_MISSING; cause remains UNKNOWN pending provider evidence.

## Polling
1. Lock the exact source commit and root Git Tree; read the workflow YAML, request and receipt-schema blobs selected by that tree.
2. Prove workflow path, push event, branch and changed-path eligibility from the exact workflow source.
3. Retrieve and validate the source-bound CI receipt/observer record before correlating provider execution metadata.
4. Follow the mandatory evidence chain exactly: Git Tree → blob/receipt → runner_id → job_id → run_id + attempt → head_sha → actual execution. Git Tree and the exact workflow/request blobs plus receipt are validated first; runner_id is only the third correlation field. The REST API may require run_id to enumerate jobs, but that transport dependency does not reorder evidence validation.
5. Poll run/job state while active; empty jobs/steps during admission or startup remain pending.
6. For failure-cause classification, parse/verify the run URL run_id, resolve the exact-SHA check-run and inspect its annotation before querying job/runner/step metadata. A decisive billing annotation short-circuits quota diagnosis. Only when the annotation is non-decisive, or actual execution must be verified, continue the full provenance chain and inspect exact job steps/logs; retry transient log-publication failures with bounded backoff.
7. Reconcile attempts, jobs, steps, annotations, exact-SHA status, artifacts and receipt hashes.
8. If the observation window expires, record OBSERVATION_WINDOW_EXPIRED. This is not job failure or provider timeout. Polling requires a real active host/scheduler; never claim background polling after termination.

Suggested configurable backoff: 5s, 10s, 20s, then 30s intervals up to a default 5-minute runner-admission observation window. Provider Retry-After takes precedence. The observation budget is not a job timeout.


## Mandatory Git Tree-first evidence chain — MUST follow in this exact order

A report beginning with runner_id, a run/job wrapper, check-run ID or log URL is non-compliant. Git Tree is the first evidence anchor; runner metadata is only the third correlation field.

Git Tree → blob/receipt → runner_id → job_id → run_id + attempt → head_sha → actual execution

1. **Git Tree:** lock the exact source commit/root tree SHA. Enumerate workflow YAML, task/request manifest, receipt schema and expected outputs. Resolve truncated trees recursively.
2. **blob/receipt:** fetch workflow/request blobs by exact tree-selected SHA. Retrieve the durable CI receipt/observer record and verify schema, content hash, repository/ref, source commit/tree, workflow path and task identity. A configured observer receipt may be labelled ISSUE_OBSERVER_RECEIPT.
3. **runner_id:** read from the verified receipt and authoritative raw provider payload. Preserve PRESENT(value), explicit NULL and MISSING; never coerce missing to zero. Raw runner_id: 0 is an observed value, not cause, quota signal or execution proof.
4. **job_id:** bind the numeric job ID to runner, workflow and receipt. Preserve job name, status/conclusion, timestamps and full steps.
5. **run_id + attempt:** bind the job to the exact run/attempt recorded by the receipt. Preserve relevant attempts; do not silently use latest-attempt wrappers for earlier failures.
6. **head_sha:** cross-check receipt, run and job SHA against the source commit SHA established by Git Tree. A mismatch invalidates correlation.
7. **actual execution:** inspect step names/status/conclusion/times, exit codes, logs, outputs, artifact IDs/digests and receipt hashes. Runner assignment, IDs, compiled prompts or a green summary alone do not prove execution.

The CI-generated project.workflow role split/context preflight uses this full chain and is usable only after a source-bound receipt and actual executed preflight steps. Separately, ChatGPT may load one canonical primary specialist four-artifact bundle as native model context; that is not a generated role split, CI receipt or independent worker. Never run project.workflow locally or fake CI-generated context.

The REST API may require a known run ID to retrieve attempt-scoped jobs. That is a transport dependency only; it does not change the evidence-validation order or make run/job/runner metadata the starting point. GET /actions/jobs/{job_id} is a downstream retrieval route only after source and receipt binding.

### Required trace receipt

Record repository/ref/commit SHA, root tree SHA, workflow/request blob SHAs, receipt URI/hash, runner_id, job_id, run_id, attempt, head_sha, executed steps/exit result, logs and artifact IDs/digests. Include exact source URLs and raw field states. Never skip a stage or claim execution from source/output file presence alone.

### Supported ChatGPT GitHub connector routes

Use mcp__GitHub__fetch({url}) through functions.exec for raw UTF-8 GitHub REST JSON where the active connector schema allows it:
- Commit: GET /repos/{owner}/{repo}/git/commits/{ref} to obtain exact commit and root tree SHA.
- Tree: GET /repos/{owner}/{repo}/git/trees/{tree_sha}?recursive=1.
- YAML/blob: fetch the exact tree-selected blob SHA using the supported blob/file tool; otherwise use a contents URL pinned to the exact commit SHA.
- Runs: GET /repos/{owner}/{repo}/actions/runs?head_sha={sha}&branch={branch}&event=push&per_page=100.
- Run: GET /repos/{owner}/{repo}/actions/runs/{run_id}.
- Attempt jobs: GET /repos/{owner}/{repo}/actions/runs/{run_id}/attempts/{attempt_number}/jobs?per_page=100.
- Check-runs: GET /repos/{owner}/{repo}/commits/{sha}/check-runs?per_page=100.
- Check-run annotations: GET /repos/{owner}/{repo}/check-runs/{check_run_id}/annotations?per_page=100. If blocked by the active connector, preserve the exact annotations_url and try a materially different authorized route; do not claim annotations are absent.
- Artifacts: GET /repos/{owner}/{repo}/actions/runs/{run_id}/artifacts?per_page=100.

The active connector may block individual routes. Record the exact blocked route and use another supported route; never treat an adapter rejection as proof that the GitHub object is absent. Convenience wrappers are projections and may filter attempts, pages or fields. Raw provider responses are authoritative when available.


## No-break-loop execution and closure gate

This lifecycle is a continuation loop, not a report generator. Completing the Git commit-to-artifact trace, receiving a terminal CI failure, or classifying one diagnostic branch as `CLOSED_UNKNOWN` is never permission to stop the owner task.

After every terminal run or failed retrieval branch:
1. Close only the exhausted diagnostic branch with its exact evidence; do not let `UNKNOWN` spread to unrelated acceptance criteria.
2. Reconcile the original owner goal and full acceptance ledger, not merely the latest CI symptom.
3. Enumerate all independent AI-owned work still runnable: other workflows/runs/jobs, source validation, tests, package construction, release publication, artifact integrity, Plugin Creator update and consumer readback as applicable.
4. Execute every such item through its actual verification. If one branch is blocked, continue the others.
5. Re-enter diagnosis only when new evidence, a new SHA/attempt, or a materially different authorized route exists. Do not repeat an exhausted request or present repeated status polling as progress.
6. A user-facing terminal response is forbidden while any independent authorized AI-owned acceptance work remains runnable. If a genuine hard host boundary blocks the remaining work, state the exact boundary and the completed recovery cursor; never label the task complete.

A concise report is allowed only after the acceptance ledger is reconciled. A phase result, CI status, commit, artifact, or `CLOSED_UNKNOWN` marker is not the task's terminal outcome.

## Failure classes
- WORKFLOW_FAILED: executed failing step plus log/annotation identifies cause.
- RUNNER_UNAVAILABLE: provider explicitly identifies runner/host capacity failure.
- PERMISSION_DENIED: provider explicitly identifies authorization/policy denial.
- QUOTA_EXHAUSTED: explicit Actions billing/minutes/spending-cap/payment evidence for the correct billing owner and period.
- LOG_PUBLICATION_PENDING: completed job logs are not yet retrievable within bounded publication retry.
- EXECUTION_EVIDENCE_MISSING: run/job failed but no executed step/log/provider cause is available.
- API_METHOD_BLOCKED/API_RATE_LIMITED: evidence adapter failed; try another authorized route.
- UNKNOWN: supported evidence routes exhausted without causal evidence.

Never infer quota from runner_id=0, empty jobs/steps, queued/in-progress status, startup_failure alone, missing logs, generic 403/404/422 or connector wrapper failure. A failed run conclusion does not by itself establish why it failed.

## Failed-job diagnosis: correlated annotations and exact job logs after source-to-run tracing

For every failed run, inspect the failed checks and classify **each failed job independently**. A run-level red conclusion is not a root cause.

1. Inspect check-run conclusions, annotations and their associated workflow/job/step. Then inspect the exact failed job's steps and logs. Use the provider's annotation/log evidence before considering billing or quota.
2. If one authoritative annotation or provider/runner log explicitly states that the Actions billing budget, included minutes, spending cap or required payment is exhausted/blocked, that single message is sufficient to classify the affected job as `QUOTA_EXHAUSTED`. Record the exact message, source URL/endpoint, run/job/step identity, repository owner, timestamp and any billing owner/period/reset included. **Do not require a second billing API/dashboard check and do not ask the owner to supply a billing summary.**
3. If an executed step reports an assertion, regression, compilation, lint, dependency, test-runner or E2E failure, classify it as `STEP_FAILURE` / `EXECUTED_CHECK_FAILURE`. Investigate the implementation, test oracle, fixture and caller path. Do not ask for billing information or reclassify a failing test as quota merely because the overall run is red.
4. Keep mixed outcomes separate: a quota-blocked job does not explain an independently executed failing test in another job/matrix leg. Continue the complete failure sweep and repair every actionable code/test failure.
5. If annotations/logs are absent or ambiguous, keep the cause `UNKNOWN` / `EXECUTION_EVIDENCE_MISSING` as appropriate and continue bounded evidence recovery. Do not infer quota from generic startup, runner, API or transport errors; do not interrupt source-level investigation with a billing request.

A single log line is sufficient **only when its content explicitly identifies exhausted/blocked Actions billing or quota**. An arbitrary failed log line or generic message is not quota evidence.

## Evidence ladder
Run details and attempts -> jobs for each attempt -> job details/runner/start/completion/steps -> check suite/check runs/annotations -> full logs after completion -> workflow YAML at exact SHA -> commit status/PR context -> artifacts -> authorized billing budget/usage API -> alternative authorized REST/CLI route.

Do not add manual dispatch/rerun when prohibited. Avoid duplicate triggers. If quota is explicitly exhausted, pause trigger-producing events and continue offline work. If quota is UNKNOWN, do not call it available or exhausted.

## Confirmed quota: task-scoped alternate repository

Only enter this path after an exact-run annotation or provider/runner log explicitly names exhausted Actions billing, included minutes, spending cap or required payment. Do not infer quota from runner_id=0, empty jobs/steps, missing logs or generic errors.

1. Keep `DEFAULT_REPOSITORY` separate from the task's single `ACTIVE_EXECUTION_REPOSITORY`. Pause trigger-producing work only for the exhausted billing owner.
2. Search suitable private, non-archived repositories accessible to the authenticated account across personal ownership and all accessible organizations. A target may be outside the source organization.
3. Require verified push permission, compatible automatic workflow/toolchain, project/data-boundary suitability and a billing owner demonstrably distinct from the exhausted owner. Never use `huyquanghan-apps`; do not infer billing ownership from org membership alone.
4. Do not pre-check quota with speculative runs or ask the owner to inspect billing. The first real project push to the selected alternate is the automatic admission observation; historical successful runs do not prove current quota.
5. Transfer the complete task state with exact source/destination repo/ref/SHA. Preserve full history when required; label a tree/blob/commit snapshot honestly when full history is unavailable. Read back destination HEAD, ancestry/tree and key files.
6. Switch only this task's active target. Never dual-push, mirror-push or run equivalent workflows in parallel across repository copies. Do not copy secrets, credentials, environment files, customer data, proprietary masters or unrelated private source.
7. Continue the actual task on the alternate. Reconcile to the default repository only after fresh automatic admission there; freeze alternate writes, sync once, verify exact upstream SHA/checks and mark `SYNCED`. Until then retain `SYNC_PENDING`; staging success is not upstream CI or product acceptance.
8. If no eligible candidate exists, keep CI UNKNOWN/BLOCKED and continue independent work.


## ChatGPT GitHub connector — direct REST API is authoritative (2026-11-15)

When diagnosing GitHub Actions in ChatGPT with the connected GitHub tools, use `mcp__GitHub__fetch` through `functions.exec` to call the exact REST endpoint and parse its raw JSON. For a known run, fetch `GET /repos/{owner}/{repo}/actions/runs/{run_id}`; for its exact attempt, fetch `GET /repos/{owner}/{repo}/actions/runs/{run_id}/attempts/{attempt}/jobs?per_page=100`. Bind every returned job to the requested run ID, attempt and exact `head_sha`.

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

## Artifact storage quota vs Actions billing usage

Treat artifact storage as a separate provider resource from runner compute and Actions billing usage:
- `ARTIFACT_STORAGE_QUOTA_EXHAUSTED`: classify only when an authoritative provider annotation, upload response or billing/storage diagnostic explicitly states that the applicable Actions artifact-storage quota/cap is exhausted. Record the repository/account/org storage scope, exact message, run and artifact identity, timestamp, and any retention/storage figures supplied.
- `ACTIONS_BILLING_USAGE_EXHAUSTED`: classify only when an authoritative provider message explicitly identifies exhausted included Actions minutes, billing usage/budget, spending cap or required payment for the affected billing owner and period.
- `ARTIFACT_SIZE_LIMIT`: a per-file/per-artifact size ceiling or payload limit. It is not proof that account storage quota is exhausted.
- `ARTIFACT_EXPIRED` / retention expiry: an artifact past its retention window is not storage-quota exhaustion.
- `ARTIFACT_UPLOAD_FAILURE`: invalid path/name, unsupported file, missing permissions, transient upload error or a failed upload step without explicit storage-quota wording.
- `API_RATE_LIMITED`: provider/API request throttling; respect `Retry-After` and do not relabel it as compute or storage quota exhaustion.

A generic HTTP 413/403/404/429, `BlobNotFound`, missing artifact, empty artifact list, runner metadata, or an upload failure alone does not prove artifact-storage quota exhaustion. Keep compute/billing, artifact storage, per-artifact size, retention, API rate limits, permission failures and ordinary step failures as distinct diagnoses. Classify mixed failures independently and continue other runnable work.

## ChatGPT GitHub connector schema-aware recovery via Git Tree API

The active GitHub connector validates `mcp__GitHub__fetch({url})` against an endpoint allowlist. Do not assume a provider REST endpoint is callable merely because GitHub documents it. Inspect the tool schema/description and test only the exact supported route; when a route is rejected with the connector's “not an allowed public GitHub repository or search endpoint” error, classify that adapter as `API_METHOD_BLOCKED` and switch methods. Do not repeat the rejected URL with superficial query-string changes.

### Supported repository-source inspection path

Use the Git Data API to inspect source and workflow configuration through schema-supported routes:

1. Resolve the exact commit: `GET /repos/{owner}/{repo}/commits/{ref}`; retain `commit.tree.sha` and full commit SHA.
2. Enumerate the source tree with `GET /repos/{owner}/{repo}/git/trees/{tree_sha}?recursive=1` through `mcp__GitHub__fetch({url})`. Parse `tree[]` and retain each `path`, `type`, `mode` and `sha`. If `truncated=true`, fetch each returned child tree SHA non-recursively until inventory is complete.
3. Read a selected source file using `mcp__GitHub__fetch_blob({repository_full_name, blob_sha})` with the exact blob SHA from the tree. Do not guess paths or use a blob SHA from another commit.
4. Inspect workflow YAML, reusable workflows, local actions, observer/receipt implementation and tests at the same exact commit. This establishes what the repository intended to run; it does not replace provider run/job evidence.

Example:

```javascript
const commitResponse = await tools.mcp__GitHub__fetch({
  url: "https://api.github.com/repos/OWNER/REPO/commits/REF"
});
const commit = JSON.parse(commitResponse.result.content);
const treeResponse = await tools.mcp__GitHub__fetch({
  url: "https://api.github.com/repos/OWNER/REPO/git/trees/" + commit.commit.tree.sha + "?recursive=1"
});
const tree = JSON.parse(treeResponse.result.content);
const entry = tree.tree.find(item => item.path === ".github/workflows/ci.yml");
const source = await tools.mcp__GitHub__fetch_blob({
  repository_full_name: "OWNER/REPO",
  blob_sha: entry.sha
});
```

### Actions evidence routes verified against the active connector schema

For the current ChatGPT GitHub connector, these raw `fetch({url})` routes were observed working:

- `GET /repos/{owner}/{repo}/actions/runs/{run_id}` — run identity, exact SHA, workflow path, event, attempt, status and conclusion.
- `GET /repos/{owner}/{repo}/actions/runs/{run_id}/attempts/{attempt}/jobs?per_page=100` — exact-attempt job IDs, runner fields, timestamps, status, conclusion and steps.
- `GET /repos/{owner}/{repo}/actions/runs/{run_id}/jobs?filter=latest` — latest jobs listing.
- `GET /repos/{owner}/{repo}/commits/{sha}/check-runs?per_page=100` — exact-SHA check runs; inspect `output.annotations_count` and `output.annotations_url` as evidence that annotations exist.
- `GET /repos/{owner}/{repo}/commits/{sha}/status` — commit status roll-up.
- `GET /repos/{owner}/{repo}/git/trees/{tree_sha}?recursive=1` — repository source tree.

The following exact paths were rejected by the active connector schema in the verified session and must not be retried as if they were supported:

- `GET /repos/{owner}/{repo}/actions/jobs/{job_id}` — direct job detail path.
- `GET /repos/{owner}/{repo}/check-runs/{check_run_id}` and `GET /repos/{owner}/{repo}/check-runs/{check_run_id}/annotations` — check-run detail/annotation subresources.

Use the exact-attempt jobs listing instead of direct job detail. When check-run listing exposes a nonzero `annotations_count` but the annotations URL is schema-blocked, preserve that fact and classify annotation retrieval as `API_METHOD_BLOCKED`. Do not say annotations are absent, and do not claim their text was inspected. Use supported run/job/check-list/status/artifact/log routes and Git Tree source inspection to continue diagnosis. `fetch_workflow_job_logs`, `fetch_workflow_job_steps` and `fetch_workflow_run_artifacts` are separate connector tools with their own schemas; use them only with exact returned IDs. A `BlobNotFound` from log retrieval is a failed log route, not the root cause.

### Verified incident record — 2026-11-18

Repository `leminhphap-improvement/ai-workflow-archtiecture`, branch `main`, SHA `5f4a4b3dfc879c6714ffd35d35e95cd8ee93542f`, workflow `.github/workflows/package-upw-plugin.yml`, run `44270069884`, attempt `1`, job/check-run `134684160460`.

- Run detail: `completed/failure`; event `push`; workflow ID `411578014`.
- Exact-attempt jobs endpoint returned one job, `completed/failure`, `runner_id=0`, blank runner name, and `steps=[]`. It completed about three seconds after start; no job step is recorded as executed.
- Exact-SHA check-runs endpoint returned one GitHub Actions check with `annotations_count=2`; its annotation URL was rejected by the connector schema. The annotation contents therefore remain unobserved.
- Run artifacts endpoint returned `total_count=0`. Job-log retrieval returned `BlobNotFound`.
- Direct job detail and check-run/annotation subresources were rejected by the active `fetch({url})` schema. The supported attempt-scoped jobs, run detail, check-runs list, commit status and Git Tree routes were used instead. The Git Tree route returned a complete, non-truncated 286-entry source inventory; the workflow blob confirmed a single job with defined steps (checkout, Python setup, workspace validation, regression suite, overlay validation, packaging and artifact upload).
- Classification: observed `PRE_STEP_TERMINAL_FAILURE` / `EXECUTION_EVIDENCE_MISSING`; causal root cause remains `UNKNOWN`. `runner_id=0`, `steps=[]`, no artifacts and `BlobNotFound` do not establish quota exhaustion, runner outage or a code/test failure. The two annotation contents have not been read.
- Do not rerun a terminal run merely to compensate for a blocked evidence endpoint. Reopen only on new provider evidence, a new SHA/attempt, or owner request; continue independent verification.

This is a connector-schema routing correction, not a claim that Git Tree API returns Actions annotations or fixes the underlying GitHub runner failure.

## Run URL, identifier and report consistency gate

A GitHub URL /actions/runs/{N} contains run_id=N. It is not a runner URL and does not identify a runner_id. It is not a runner_id. A job details URL /actions/runs/{run_id}/job/{job_id} contains the run ID and job ID. A check-run ID is another resource identifier; even when its numeric value happens to equal a job ID, preserve the two field names and verify their relationship. Only the raw attempt-scoped job payload or a source-bound receipt establishes runner_id.

For every report:
1. Parse the run URL suffix and preserve it as run_id. Fetch that exact run and verify returned id, repository, workflow path, event, attempt, status, conclusion and head_sha.
2. Lock Git Tree and exact workflow/request blobs; verify the source-bound receipt when one exists. Resolve exact-SHA check runs and their annotations_url.
3. Retrieve the exact check-run annotation before job/runner/step metadata when the goal is failure-cause classification. If it explicitly identifies failed payment, spending-limit increase or equivalent Actions billing restriction, classify QUOTA_EXHAUSTED and stop quota diagnosis. Mark downstream fields NOT_QUERIED_BY_DESIGN only if they truly were not queried and are absent from the receipt.
4. If the annotation is not decisive, or execution evidence is independently required, fetch attempt-scoped raw jobs. Verify job.run_id, job.run_attempt and job.head_sha; keep job.id, check_run.id and job.runner_id separate. Preserve PRESENT(value), explicit NULL and MISSING without coercion.
5. If the connector rejects /check-runs/{check_run_id}/annotations, record API_METHOD_BLOCKED, preserve the returned annotations_url and count, then try one materially different authorized route. A blocked endpoint is not an empty annotation list and not proof that annotations do not exist. If no alternate route is available, mark connector retrieval BLOCKED; do not claim the annotation was read. Owner-supplied exact annotation text may be used as REPORTED evidence, clearly attributed.
6. Cross-check every URL, run ID, attempt, job ID, check-run ID, runner ID and SHA against the raw provider payload and source-bound receipt. Any mismatch is IDENTITY_INCONSISTENT; stop interpretation and retry once through a materially different authoritative route.

Required report fields: run_url, run_id, run_attempt, workflow_path, head_sha, job_id, check_run_id, runner_id (each with an explicit observed/not-queried state), annotation_count, annotation_source, annotation_text_provenance, failure_classification and actual_execution_state. Never substitute one identifier for another or omit a run ID already present in a URL.

## Two separate evidence paths

- Full execution provenance: Git Tree → blob/receipt → runner_id → job_id → run_id + attempt → head_sha → actual execution. This is mandatory when asserting that a role preflight, job steps, build, tests or artifact actually executed.
- Failure-cause short path: Git Tree → blob/receipt → run URL/run_id → exact check-run → annotation → classification. This path may stop at a decisive billing annotation; it must not fabricate downstream runner/job/step evidence. If the annotation is not decisive, continue the full provenance path.


## Verified GitHub CLI annotation retrieval

The approved CLI route for run annotations is the GitHub CLI extension `swfz/gh-annotations`:

```sh
gh extension install swfz/gh-annotations
gh annotations -repo OWNER/REPO -json
```

The extension returns annotations for the latest run of each workflow, not an arbitrary historical run ID. Therefore, an observer triggered by `workflow_run: completed` must bind each record's `workflow_url` to the exact completed run URL from the event before using its message. Compare the filtered annotation count with the exact-SHA Check Run `output.annotations_count`; a mismatch is UNKNOWN/incomplete evidence, not an empty annotation set. The extension was previously validated on a GitHub-hosted runner with a read-only `github.token` granting `actions: read`, `checks: read` and `contents: read`.

The repository observer installs and invokes this extension after the conformance workflow completes. It retains the raw latest-run overview, exact-run filtered output, check-run metadata and a source-bound receipt as a short-lived Actions artifact.


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
