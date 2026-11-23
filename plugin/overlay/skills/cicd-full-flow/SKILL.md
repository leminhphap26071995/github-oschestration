---
name: cicd-full-flow
description: First-class proportional CI/CD flow with batched changes, exact-SHA asynchronous observation and evidence-led delivery.
---
# CI/CD Full Flow

## Select the gate from the requested outcome
- `ANSWER_ONLY` / `RESEARCH_WRITING`: source-backed answer; no CI/CD.
- `DOCS_ONLY`: validate changed text/links/contracts and read back; no CI/CD by default unless requested or required.
- `COMMIT_ONLY`: applicable source/static/regression checks; hosted CI only when requested or required.
- `ENGINEERING`: test changed behavior at the relevant source/consumer.
- `ARTIFACT_RELEASE`: lock exact target SHA, run authorized build/release flow, verify artifact format/hash/provenance and read it back.
- `DEPLOYMENT_SECURITY`: validate actual environment, authorization, secrets, rollout/rollback and service behavior.

## Batch before triggering CI
Before edits, inspect workflow triggers, branch/path filters, fan-out, matrix and concurrency. Finish requirements, research, design and source comprehension first. Group the complete change and all known tests into one batch. Prefer one authoritative run per committed SHA lifecycle; do not trigger CI for each file or micro-fix. If further commits are necessary, they must contain consolidated, evidence-backed repair batches. Commit count is a batching preference, never a scope limit.

## Mandatory asynchronous lifecycle
Apply `skills/github-actions-run-lifecycle/SKILL.md` when GitHub Actions is the actual provider. Observe admission -> queue -> runner allocation/warm-up -> job startup -> every step -> completion -> log/artifact publication. A first workflow-run response is not a final verdict. Empty jobs/steps during warm-up are PENDING, not FAILED. Preserve run/attempt/job IDs and exact SHA. Continue monitoring while the run is active and the execution session is available; if observation expires, persist the exact cursor and resume later rather than claiming completion.

## Task-scoped repository and CI fan-out control
- Resolve `DEFAULT_REPOSITORY` from persistent routing and `ACTIVE_EXECUTION_REPOSITORY` for this task. Exactly one repository is active for a task at a time.
- Push the change only to the active repository. Do not dual-push/mirror the same change or run equivalent CI/CD workflows in parallel across repository copies.
- Inspect workflow event fan-out, branch/path filters, reusable workflows, matrices and concurrency before writes. Prefer one authoritative run per change lifecycle; prevent duplicate push/PR or overlapping workflow triggers.
- Only explicit `QUOTA_EXHAUSTED` permits a task-scoped switch. Search all accessible suitable private repositories across personal owners and organizations, require verified write access and a distinct billing owner, and follow `skills/github-actions-quota-staging/SKILL.md`. Keep the default route unchanged.

## CI execution and quota diagnosis
Do not block ordinary source work or the intended automatic CI event solely because billing is UNKNOWN. Do not create duplicate runs, manual dispatches or unnecessary retries. Follow automatic-only policy. After completion inspect check-run annotations and every relevant failed job's exact logs first; if missing, use job/run metadata, attempts, check runs, status, artifacts and alternate authorized routes with bounded retries.

Classify only from observed evidence:
- Mixed jobs: classify each failed job independently; a quota-blocked job never masks a separate executed test/assertion failure in another job or matrix leg.
- `QUOTA_EXHAUSTED`: one authoritative annotation or provider/runner log tied to the exact Actions run explicitly names exhausted/blocked billing, included minutes, spending cap or required payment. One message is sufficient; no second billing API/dashboard check or owner-supplied usage summary is required.
- `STEP_FAILURE` / `WORKFLOW_FAILED`: an executed assertion, regression, compile, lint, dependency, test-runner or E2E step failed; investigate implementation, test oracle and fixtures.
- `RUNNER_UNAVAILABLE`: explicit provider capacity failure.
- `PERMISSION_DENIED`: explicit authorization/policy denial.
- `LOG_PUBLICATION_PENDING`: bounded retrieval still pending.
- `EXECUTION_EVIDENCE_MISSING`: terminal failure without executed-step/log/provider cause.
- `API_METHOD_BLOCKED` / `API_RATE_LIMITED`: evidence route failed; try a materially different authorized route.
- `OBSERVATION_WINDOW_EXPIRED` / `STATUS_UNKNOWN`: no terminal evidence; persist cursor and resume only when observation can continue.

Never infer quota from runner_id=0, empty jobs/steps, missing logs, generic HTTP errors, high run count or unrelated API failure. Never ask for billing information to explain an executed test/assertion failure.

## CI no-loop and full failure sweep — mandatory
1. Treat each run/attempt/job as its own diagnostic branch, keyed by exact repo/ref/SHA/run/attempt/job. Do not collapse unrelated CI/build failures into one generic limitation.
2. For an active run, continue lifecycle observation. For a terminal run, inspect all available jobs, steps, annotations, check runs, logs and artifacts.
3. If a terminal failed run has `steps=[]` or no executed-step/log/provider cause, perform one bounded evidence-recovery pass across materially different authorized routes (for example job logs, run/attempt metadata, check-runs/statuses, annotations and artifacts). Do not repeat the same failed API call or poll the same terminal run indefinitely.
4. If no causal evidence is found, record `EXECUTION_EVIDENCE_MISSING`, causal `UNKNOWN`, exact identifiers, attempted routes and timestamps. Mark that run's diagnostic branch `CLOSED_UNKNOWN` and stop spending turns on it. This is not `PASS`, not a quota diagnosis, and not a reason to stop the requested work.
5. Continue inspecting every other relevant failed CI run, build, job, matrix leg, check and downstream workflow for the target revision. Where logs/steps identify failures, diagnose root cause, repair the responsible source/workflow/dependency/configuration layer, run applicable checks and follow the authorized automatic CI lifecycle.
6. Continue independent source checks, artifact checks, integration/consumer E2E and other feasible acceptance work while any CI evidence branch is closed or pending. A single opaque run cannot become a blanket blocker.
7. Reopen `CLOSED_UNKNOWN` only if new provider evidence appears, the source SHA/attempt changes materially, or the owner explicitly asks to investigate it again.

## Trigger-cost controls
- Inspect actual workflow event/fan-out before source writes.
- Prefer one authoritative CI execution per change lifecycle; avoid duplicate push/PR runs for the same SHA and never mirror-push the same task into two active repositories.
- Scope expensive suites and bound retries/timeouts/matrices.
- Docs-only changes skip CI unless required.
- Batch related fixes; never create a run per micro-fix.
- If explicit quota exhaustion is observed, stop further trigger-producing pushes/PR updates/tags/merges/reruns for the affected billing owner; continue independent work and resume only with fresh provider admission or owner authorization.
- A hosted quota check cannot prevent its own runner allocation.

## Evidence and acceptance
Keep source/static/unit/regression, hosted exact-SHA CI, build/artifact integrity, integration E2E, real runtime consumer and owner acceptance distinct. A green source suite or artifact does not prove product behavior. Record exact revision, commit count, run/attempt/job/step, logs, artifacts/hashes, gate status and evidence provenance. Do not claim completion while any MUST is failed/pending/unknown/blocked; equally, do not use an unknown CI branch as an excuse to omit other runnable acceptance work.


## Goal-driven GitHub source-to-Actions loop

For a GitHub-backed engineering goal, keep source navigation, edits and Actions observation in one continuous loop rather than treating a commit or green run as delivery:

1. **Recover and lock:** recover the immutable goal, all MUST criteria, repo/branch, exact current HEAD, project gate, workflow policy and previous attempts.
2. **Inspect:** use the Git tree API to inventory the exact source revision, then fetch only the relevant blobs/files and their callers, tests, contracts and consumers.
3. **Plan against the goal:** map every MUST to source changes, tests and the required consumer evidence. Choose documentation, plan, debug, implementation or a combination from the requirement—not from a preferred action.
4. **Implement and commit:** batch the complete understood change. Use the authorized GitHub contents/Git Data write tools; preserve the exact parent SHA and use expected-HEAD protection. Read back the commit and branch ref.
5. **Observe automatic CI:** if the change matches a real workflow dependency, let the narrow automatic push/PR trigger run. Resolve the run by exact head SHA; observe admission, runner, jobs, every step, terminal logs and artifacts. Use exact run/attempt REST endpoints when wrappers omit fields. Continue observation while the run is active and the host permits.
6. **Compare and repair:** compare each result with the original MUST ledger. Diagnose the earliest causal failure from exact logs/annotations, make one coherent repair batch, commit against the verified new HEAD and observe the new exact-SHA run.
7. **Read back and continue:** verify source, branch HEAD, workflow evidence, artifacts and project checkpoint. Continue to the first unmet criterion; at a genuine host boundary persist run IDs, attempt, SHA and next observation route.

Docs-only and ordinary planning changes use source readback and do not trigger CI by default. Never use `workflow_dispatch`, manual reruns or duplicate runs when automatic-only policy applies. A terminal run with missing execution evidence is `UNKNOWN`, not quota exhaustion; close only that diagnostic branch and continue independent goal work. A CI pass, commit or artifact is not product acceptance.

## Artifact publication failure taxonomy

Before treating an artifact upload as a quota failure, distinguish account/org artifact-storage exhaustion from Actions compute/billing usage, per-artifact size limits, retention expiry, API throttling, permissions and ordinary upload/step failures. Require an explicit provider storage-quota message for `ARTIFACT_STORAGE_QUOTA_EXHAUSTED`; require an explicit included-minutes/billing-budget/spending-cap/payment message for `ACTIONS_BILLING_USAGE_EXHAUSTED`. Generic 413/403/404/429, missing artifacts, `BlobNotFound` or failed uploads do not establish either quota state.

Preserve the exact provider response, repository/billing owner, storage scope, run/artifact IDs, timestamp, retention/size data and retry guidance. Continue independent source, test and consumer checks when artifact publication is blocked.
