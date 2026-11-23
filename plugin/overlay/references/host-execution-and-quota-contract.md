# Host Execution, GitHub Transfer and Quota Contract

## Source-first routing
- GitHub-backed engineering: use the authorized GitHub connector to recover live repository/ref/SHA and workflow state first.
- Connected Notion/project tasks: read the named project/ticket authority first.
- ChatGPT Python/container is optional bounded compute only; it is not the user's machine or a prerequisite for remote GitHub/Notion work.
- Never run local DNS/filesystem/package probes as a condition for calling an already-authorized remote connector. Do not browse/download Google Drive in interactive ChatGPT when the project has a configured private source-acquisition transport.

## Active repository identity
Keep persistent and task-local routing separate:
- `DEFAULT_REPOSITORY`: persistent repository from the owner-controlled routing registry.
- `ACTIVE_EXECUTION_REPOSITORY`: exactly one repository receiving source writes and automatic CI/CD for the current task.
- `RECOVERY_CANDIDATES`: authorized repositories considered only after explicit quota proof.

A temporary active-target change does not update the persistent default route. Never dual-push, continuously mirror, or execute equivalent CI/CD in two repositories for one task. A controlled transfer is the only time both repositories are touched, and it must have a source/destination SHA ledger and end with one active target.

## Repository transfer is AI-owned work
A request to clone, copy, mirror, migrate or stage a branch into another repository is an execution request, not a request for a plan and not a GitHub Actions task.
1. Resolve source and destination repository, branch/ref, exact source SHA, visibility, archived state and connector identity.
2. Verify source read and destination write permissions with the connected GitHub provider. Inspect whether the destination branch/repository already exists and protect unrelated content.
3. Use an available native GitHub transfer/import/clone operation when it preserves the requested semantics. Otherwise use an already-configured, authorized Git remote executor. Do not invent a tool or claim a clone occurred without provider readback.
4. Preserve full commit history when the owner says clone/mirror or when history/provenance is part of the goal. A GitHub API tree/blob/commit snapshot is not a full clone; label it as a snapshot if that is the only supported method and do not silently substitute it.
5. Verify destination branch HEAD, commit ancestry/history, file tree and required refs/tags as applicable. Record source and destination identities separately.
6. Do not run GitHub Actions merely to copy Git data. Actions are only required if a separate build/test/package acceptance depends on them.
7. Do not ask the owner to run commands, create branches or press workflow buttons when the active session already has the required permissions/tools. Ask only for a genuinely missing owner-only permission/approval; never request credentials in chat.
8. If one connector method fails, inspect its exact error and use a materially different authorized provider route. A missing method or wrapper error is not proof that the underlying operation is impossible.

## CI preflight and evidence
`project.workflow`/role_pack.py generated multi-role splitting and generated role-context compilation MUST execute only through the project's configured automatic GitHub Actions preflight on the exact committed SHA. ChatGPT may separately load one canonical primary specialist's verified four-artifact bundle as native model context; that is not a generated split, CI receipt or independent worker. Python may execute inside the hosted runner only; never use ChatGPT-local Python/container or local shell as a substitute. If the CI preflight has no executed receipt, only the generated role-context gate is BLOCKED; continue work feasible with the native primary role.

Every Actions engineering loop MUST validate this exact order: Git Tree → blob/receipt → runner_id → job_id → run_id + attempt → head_sha → actual execution. Git Tree is the entry evidence; runner_id is third, never the starting point. Preserve PRESENT/NULL/MISSING, bind all IDs to the receipt and exact SHA, and inspect executed steps/logs/artifacts before claiming execution. Use `skills/github-actions-run-lifecycle/SKILL.md` for the complete contract. A CI preflight pass validates only its own gate; it does not prove product, artifact, consumer or owner acceptance.

A failed job requires exact provider-annotation inspection first. If the annotation explicitly identifies failed account payment or a spending-limit restriction, classify `QUOTA_EXHAUSTED` immediately and stop diagnosis for that run; do not query runner metadata or download logs for a job that never started. Only inspect exact job/step logs when the annotation is not decisive or an executed step failed. Empty jobs while queued/in-progress and transient log publication errors are pending evidence, not immediate failures.

## Quota classification and flexible recovery
One authoritative annotation or provider/runner log tied to the exact Actions run that explicitly names exhausted/blocked billing, included minutes, spending cap or required payment is sufficient for `QUOTA_EXHAUSTED`; no separate billing API/dashboard check or owner-supplied usage summary is required. Read the annotation before querying runner/job-step metadata. Once explicit billing text is found, short-circuit the run's diagnosis and do not fetch a log archive for a job that never started. An executed assertion/regression/compile/lint/E2E failure is a code/test investigation. Classify mixed jobs independently. `runner_id=0`, empty jobs/steps, queued status, missing logs, generic HTTP errors and connector wrapper failures are not quota proof.

If quota is UNKNOWN, continue under standing authorization for the intended automatic CI event; do not dispatch duplicate runs or manual reruns where prohibited. If quota is explicitly exhausted, pause trigger-producing operations for that billing owner. Search all already-connected accounts/installations and accessible private repositories inside or outside organizations; do not restrict discovery to the current organization. Verify private visibility, non-archived state, write permission, project/workflow compatibility and a distinct billing owner. Exclude `huyquanghan-apps`. Select one recovery target, transfer and reconcile state with source/destination SHA provenance, verify remote readback, then switch the task's single active repository. Never dual-push or silently mutate the default route. Require fresh automatic admission on the destination.

## Docs versus implementation
Docs, notes, research and plans normally use connector-based source updates and remote readback without Actions. Run Actions only when a real implementation/build/test/package outcome requires the hosted executor. A commit, plan, source test, green CI or artifact alone is not product acceptance.

## GitHub tree/blob API source route
Use exact GitHub REST URLs through the connected provider for efficient source discovery:
- `GET /repos/{owner}/{repo}/commits/{ref}` to lock the commit SHA and root tree SHA.
- `GET /repos/{owner}/{repo}/git/trees/{tree_sha}?recursive=1` to inventory paths and blob/tree SHAs. If `truncated=true`, recursively enumerate child trees.
- `GET /repos/{owner}/{repo}/git/blobs/{blob_sha}` or `GET /repos/{owner}/{repo}/contents/{path}?ref={sha}` to read only relevant files.
- Preserve exact owner/repo/ref/SHA, request URL, pagination and blob identity. Do not interpret a filtered or truncated tree as proof of absence.

For API-based snapshot writes, use only exposed, authorized GitHub Git Data operations (`create_blob` -> `create_tree` -> `create_commit` -> `update_ref`) with a verified destination base tree and expected-HEAD guard. This creates a snapshot commit; it does not reproduce upstream history. A full clone/mirror still requires an actual history-preserving Git transfer.

## Raw Actions REST endpoint contract
When convenience wrappers return empty/missing run IDs or incomplete jobs/steps, use raw GitHub REST through the connected `mcp__GitHub__fetch` tool:
1. `GET /repos/{owner}/{repo}/actions/runs?head_sha={sha}&branch={branch}&event={event}&per_page=100` — match SHA, branch, event and workflow path.
2. `GET /repos/{owner}/{repo}/actions/runs/{run_id}` — verify run identity, status, conclusion and attempt.
3. `GET /repos/{owner}/{repo}/actions/runs/{run_id}/attempts/{attempt_number}/jobs?per_page=100` — obtain attempt-scoped job IDs, runner fields and steps.

The `fetch_commit_workflow_runs` wrapper is PR-filtered and must not be used to discover push runs. Convenience wrappers are projections, not authoritative for omitted fields. Preserve PRESENT/NULL/MISSING distinctly. Terminal `steps=[]` means no steps executed; it does not imply quota.

## Artifact storage quota vs Actions billing usage
Treat artifact storage as separate from compute/billing, per-artifact size limits, retention expiry, API throttling, permissions and ordinary upload failures. Require explicit provider evidence for `ARTIFACT_STORAGE_QUOTA_EXHAUSTED`; require explicit included-minutes/billing-budget/spending-cap/payment evidence for `ACTIONS_BILLING_USAGE_EXHAUSTED`. Generic 413/403/404/429, BlobNotFound, missing artifacts or failed uploads prove neither quota.


## UPW Plugin Creator publication routing

The owner-selected plugin update path is a complete ZIP built from the synchronized live Plugin Creator source plus the explicit GitHub overlay, followed by owner manual upload through the ChatGPT Plugins UI. The automatic request-file workflow validates the exact plugin ID/current release ID/source SHA and emits a full ZIP, SHA-256 and handoff receipt; it never calls `update_plugin` or mutates the live plugin. This route is independent of Plugin Creator daily API quota. Keep Plugin Creator API quota, GitHub Actions billing and artifact-storage quotas as distinct provider limits.



## Actions identifier integrity and report double-check

A GitHub browser URL `/actions/runs/{N}` identifies `run_id=N`, not `runner_id`. Parse and verify the exact run object ID, repository, workflow path, head SHA and attempt. Then inspect its exact-run annotation. If explicit billing/payment/spending-limit evidence is decisive, stop before fetching job/runner/step metadata; mark unavailable downstream fields `NOT_QUERIED_BY_DESIGN`. Otherwise fetch attempt-scoped jobs and verify run ID, attempt and SHA, keeping `job_id` and `runner_id` distinct. Any mismatch is `IDENTITY_INCONSISTENT` and requires one materially different authoritative retrieval before interpretation.

## Run URL, identifier and report consistency gate

A GitHub URL /actions/runs/{N} identifies run_id=N, not runner_id. A job details URL /actions/runs/{run_id}/job/{job_id} identifies the run and job. A check-run ID is separately typed even if its numeric value equals a job ID. Only raw attempt-scoped job JSON or a source-bound receipt establishes runner_id.

Before reporting: parse and verify the URL run_id against the exact run object; verify repository, workflow path, attempt and head_sha; resolve exact-SHA check-runs and their annotations_url. For failure cause, inspect the exact annotation before job/runner/step metadata. A decisive billing annotation short-circuits quota diagnosis. If it is not decisive, or actual execution is independently required, fetch attempt-scoped jobs and verify job.run_id, job.run_attempt and job.head_sha; keep job.id, check_run.id and job.runner_id separate. Preserve PRESENT/NULL/MISSING.

If the connector rejects /check-runs/{check_run_id}/annotations, record API_METHOD_BLOCKED, preserve annotations_url/count and try one materially different authorized route. A blocked endpoint is not an empty annotation list. If no route is available, mark connector retrieval BLOCKED and distinguish owner-supplied exact text (REPORTED) from connector-retrieved content. Cross-check every displayed URL, run ID, attempt, job ID, check-run ID, runner ID and SHA; mismatch means IDENTITY_INCONSISTENT and requires one materially different authoritative retrieval.

Required report fields: run_url, run_id, run_attempt, workflow_path, head_sha, job_id, check_run_id, runner_id, annotation_count, annotation_source, annotation_text_provenance, failure_classification and actual_execution_state. Use NOT_QUERIED_BY_DESIGN only when downstream metadata was genuinely not queried.
