---
name: github-actions-tree-fallback
description: Start Actions evidence correlation from the exact Git Tree and receipt, then bind runner, job, run attempt, SHA and execution.
---
# GitHub Actions — Git Tree-First Evidence Correlation

This is the mandatory entry path, not a late fallback. Do not start from `runner_id`, run/job wrappers, check-run IDs or logs.

## Required order — MUST NOT be reordered

`Git Tree → blob/receipt → runner_id → job_id → run_id + attempt → head_sha → actual execution`

1. **Git Tree:** resolve exact source commit/root tree; enumerate workflow YAML, task/request manifest, receipt schema and expected output paths with modes/blob SHAs. Resolve truncated trees recursively.
2. **blob/receipt:** fetch exact workflow/request blobs by tree-selected SHA. Retrieve the durable CI receipt and verify schema, content hash, source commit/tree, workflow and task binding.
3. **runner_id:** read only from verified receipt and authoritative raw provider payload. Preserve PRESENT(value), NULL and MISSING; never coerce missing to zero.
4. **job_id:** correlate the exact job to runner and receipt; check-run IDs and display names are not job IDs.
5. **run_id + attempt:** bind the job to the exact run/attempt; do not silently use latest-attempt wrappers for earlier failures. A known `/actions/runs/{N}` URL supplies a locator for `run_id=N`, never a runner_id. Verify the exact run object before interpretation. For failure classification, inspect its annotation before querying job/runner/step metadata; if billing is decisive, stop quota diagnosis immediately.
6. **head_sha:** cross-check receipt/run/job SHA against the source commit locked by Git Tree.
7. **actual execution:** inspect executed steps, statuses, exit codes, logs, output hashes and artifact IDs/digests. A tree/blob proves persisted source/output integrity, not runner or step execution.





## Run URL, identifier and report consistency gate

A GitHub browser URL `https://github.com/{owner}/{repo}/actions/runs/{N}` identifies **`run_id=N`**, not a `runner_id`. A URL ending in `/actions/runs/44651409187` must be reported as `run_id=44651409187`. `runner_id` is a separate job field and may be PRESENT, NULL, MISSING, or a raw numeric zero.

Before interpreting or publishing an Actions report:
1. Parse the numeric suffix from every run URL and preserve it as `run_id`.
2. Fetch the exact run object. Verify its returned `id` equals the URL's run ID; verify repository, workflow/path, event, head SHA, status, conclusion and `run_attempt`. If the values disagree, mark `IDENTITY_INCONSISTENT`, stop interpretation and perform one materially different authoritative retrieval.
3. Retrieve the check-run annotation bound to that exact run/source SHA. If it explicitly identifies failed payment, a spending-limit restriction or equivalent Actions billing block, classify `QUOTA_EXHAUSTED` immediately and stop. Do not fetch job payloads, runner metadata, steps or logs merely to reconfirm quota. For fields not already available from the source-bound receipt, report `job_id=NOT_QUERIED_BY_DESIGN` and `runner_id=NOT_QUERIED_BY_DESIGN`; never invent or substitute values.
4. Only when the annotation is not decisive, or when an independent executed-step failure needs diagnosis, fetch attempt-scoped jobs. Verify each job's `run_id`, `run_attempt` and `head_sha` match the exact run. Keep `job_id` and `runner_id` separate. Then inspect steps/logs only where execution actually occurred.
5. Cross-check every displayed URL, run ID, job ID, runner ID, attempt and SHA against the authoritative provider payload and source-bound receipt. Any disagreement requires one materially different retrieval before causal interpretation; do not repeat the same failed adapter call.

Required report fields: `run_url`, `run_id`, `run_attempt`, `job_id` and `runner_id` with explicit observed/not-queried state, `head_sha`, `workflow_path`, `annotation_source`, `failure_classification`, and `actual_execution_state`. A known run ID in a URL must never be omitted or relabelled as a runner ID.


## Failure handling
- Missing receipt, blob mismatch, missing IDs, unsupported endpoints and incomplete trees remain explicit evidence gaps. Never skip a stage or infer downstream values.
- `runner_id=0`, NULL/MISSING, empty steps and `BlobNotFound` are metadata/access symptoms, never root-cause checks. Inspect the exact run's annotation first: an explicit payment/spending-limit/Actions-billing message is sufficient `QUOTA_EXHAUSTED` and must short-circuit further runner/step/log diagnosis. Do not request a log archive for a job the annotation says never started.
- If any stage is unverified, dependent execution/role-preflight is UNKNOWN/BLOCKED. Do not bypass with local Python, shell or manual role selection.
- Continue only independent work that does not depend on the missing evidence.

Use connected GitHub REST routes for exact commit/tree and tree-selected blobs. Preserve repository/ref/commit/tree/blob SHAs, request URL and raw response. Use Actions REST/job/log/artifact routes only after Git Tree and receipt establish source and expected execution identity.


## Identifier semantics and failure-cause branch

A run URL `/actions/runs/{N}` provides `run_id=N`; it is not a runner URL. A job details URL `/actions/runs/{run_id}/job/{job_id}` provides the job ID. A check-run ID is separately typed, even if its numeric value matches job_id. Do not infer a runner_id from any of these URLs. Preserve the full execution-provenance chain for execution claims. For failure classification, after Git Tree/blob/receipt and exact run/check-run binding, inspect the annotation first; a decisive billing annotation ends quota diagnosis before runner/job/step retrieval. If not decisive, continue the full chain. A blocked annotation endpoint is API_METHOD_BLOCKED, not an absent annotation.
