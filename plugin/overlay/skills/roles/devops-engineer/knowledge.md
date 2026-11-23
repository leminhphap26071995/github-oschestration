# DevOps Engineer — specialist knowledge and failure patterns

## Core method
Lock owner/org/repository/ref/exact SHA and environment. Inspect every workflow's event graph, branch/path filters, matrix, concurrency, downstream dependencies, caches, secrets, artifact retention, deployment target and rollback. Before event-producing writes, inspect trigger scope, permissions, approval gates and rollback; do not pre-check quota or infer remaining balance from historical usage. Verify real run/job/step, artifact digest and consumer behavior.

## Quota and API invariants
- Use the exact target organization and repository. Never transfer quota assumptions between owners or organizations.
- `GET /repos/{org}/{repo}` verifies repository identity; `GET /orgs/{org}/actions/permissions` checks Actions policy.
- `GET /organizations/{org}/settings/billing/budgets?per_page=100` can establish a hard cap only when the matching Actions budget has `prevent_further_usage=true` and spent amount at/above its cap.
- `GET /organizations/{org}/settings/billing/usage/summary?product=Actions` reports usage history; it does not by itself report remaining included minutes.
- A 403, unsupported route or absent usage result is UNKNOWN. Historical usage is not remaining quota. Preserve the billing period and reset date.
- A current owner report of quota exhaustion is sufficient to suspend all triggers immediately; classify its provenance as REPORTED unless independently API-verified. It supersedes older AVAILABLE notes.
- Role-splitting preflight is a separate mandatory CI gate: run `project.workflow` and role-context Python only inside the project's configured automatic GitHub Actions workflow. Never execute this preflight through ChatGPT-local Python/container or local shell. Do not add manual dispatch/rerun paths. Require `Git Tree → blob/receipt → runner_id → job_id → run_id + attempt → head_sha → actual execution` before using the role split; missing receipt or unexecuted steps means BLOCKED.

## Trigger and cost invariants
- `push` and `pull_request` on the same branch can create two full runs for one commit. Broad unfiltered triggers multiply across every branch and commit.
- Inspect run inventory by exact SHA and by recent date with pagination. Group by event, workflow path/id, branch, SHA and day. Connector wrappers may filter events or return only one page.
- Inspect job-level execution and runner OS. Run wall time is not total billable job-minutes; parallel jobs, matrix fan-out and OS multipliers matter.
- Prefer branch/path filters, one authoritative full-suite event per lifecycle, bounded matrix/retry/fan-out, and cancellation of superseded non-release runs. Batch commits.
- If quota is exhausted, no push/PR update/tag/merge/dispatch/rerun that can trigger Actions. Continue offline checks and hold source changes unpushed until reauthorized.

## Failure classification
- Queued or in-progress with empty jobs/steps: PENDING.
- `runner_id=0`: sentinel/unconfirmed runner identity, not proof of quota or runner failure.
- Completed failed job with `steps=[]`: execution evidence missing; inspect raw job/run and annotations before classifying.
- `BlobNotFound` or log-download failure: retrieval gap, not proof that the underlying run had no logs or that quota caused it.
- Actual failed step plus its log is primary evidence for a code/workflow/dependency/permission/runner/external-service failure.
- Do not use `PRE_RUNNER_FAILURE` as a causal diagnosis unless provider evidence explicitly establishes that stage and cause.

## Shared evidence rules
- Distinguish observed facts, owner reports, assumptions, inferences and proposals. Generic model knowledge creates hypotheses, not project facts or source definitions.
- Verify source/runtime identity before claiming a tool, test, review, write, deployment or acceptance.
- An absent/empty result requires checking endpoint, query, scope, pagination, permissions, parser and alternative authorized API routes before concluding absence.
- A plan or test added is not a passing check. Preserve failures and counterexamples.
- Use the canonical statuses and handoff schema in `skills/workflow-contract/SKILL.md`; do not define a competing report format.


## Source anchors and version pins (checked 2026-11-23)
- [DORA — History of software delivery metrics](https://dora.dev/insights/dora-metrics-history/) — Research-based delivery measures; updated 2 Jan 2026.
- [SLSA — Build Track Basics](https://slsa.dev/spec/build-track-basics) — Supply-chain provenance specification; current 2026-11-23.
- [GitHub Actions — Security hardening](https://docs.github.com/en/actions/security-for-github-actions/security-guides/security-hardening-for-github-actions) — Official CI security guidance; current 2026-11-23.

These sources anchor the listed domain methods. Confirm the target engine, model, runtime and release before applying them; do not generalize a version-specific procedure to another game or platform.
