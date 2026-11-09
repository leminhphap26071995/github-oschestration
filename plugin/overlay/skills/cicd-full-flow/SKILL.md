---
name: cicd-full-flow
description: First-class proportional CI/CD flow for source checks, asynchronous Actions observation, exact-SHA builds, artifacts, release/deployment and evidence-led quota diagnosis.
---
# CI/CD Full Flow

## Select the gate from the requested outcome
- `ANSWER_ONLY` / `RESEARCH_WRITING`: source-backed answer; no CI/CD.
- `DOCS_ONLY`: validate changed text/links/contracts and read back; no CI/CD by default unless requested or required.
- `COMMIT_ONLY`: applicable local/static/regression checks; hosted CI only when requested or required.
- `ENGINEERING`: test changed behavior at the relevant source/consumer.
- `ARTIFACT_RELEASE`: lock exact target SHA, run the authorized build/release flow, verify artifact format/hash/provenance and read it back.
- `DEPLOYMENT_SECURITY`: validate the actual environment, authorization, secrets, rollout/rollback and service behavior.

## Mandatory asynchronous lifecycle
Apply `skills/github-actions-run-lifecycle/SKILL.md`. A first workflow-run response is not a final verdict. Observe admission → queue → runner allocation/warm-up → job startup → steps → completion → log/artifact publication. Poll while the active host/session is alive, preserve run/attempt/job IDs and exact SHA, respect Retry-After, and classify observation-window expiry separately from workflow failure. Empty jobs or steps during warm-up are PENDING, not FAILED.

## CI execution and quota diagnosis
For a task with standing owner authorization, do not block ordinary source work or the intended automatic CI event solely because billing is UNKNOWN. Inspect actual workflow trigger graph and recent fan-out; do not create duplicate runs, manual dispatches or unnecessary retries. Follow repository/owner automatic-only policy.

After a job completes, inspect every failed job's full logs using the job-logs endpoint (`fetch_workflow_job_logs`). If logs are missing or the wrapper fails, preserve the exact error and continue through run/job metadata, attempts, annotations, check runs, commit status, artifacts and another authorized provider route. A missing log is an evidence gap, not proof of quota.

Classify only from observed evidence:
- `QUOTA_EXHAUSTED`: explicit provider billing/minutes/spending-limit/payment evidence for the correct owner and period.
- `WORKFLOW_FAILED`: executed failing step and its log identify a source/test/workflow/dependency/configuration cause.
- `RUNNER_UNAVAILABLE`: provider explicitly reports runner/host capacity failure.
- `PERMISSION_DENIED`: provider reports authorization/policy denial.
- `LOG_PUBLICATION_PENDING`: completed job logs are not yet retrievable within bounded retry.
- `EXECUTION_EVIDENCE_MISSING`: terminal failure without executed-step/log/provider cause.
- `API_METHOD_BLOCKED` / `API_RATE_LIMITED`: the evidence lookup route failed; try another authorized route.
- `OBSERVATION_WINDOW_EXPIRED` / `STATUS_UNKNOWN`: observation ended without terminal evidence; continue later from the persisted cursor.

Never infer quota exhaustion from `runner_id=0`, empty jobs/steps, missing log blobs, generic 403/404/422, empty workflow listing, high run count or unrelated API failure. Historical usage is not remaining quota. Billing endpoint unavailability establishes neither AVAILABLE nor EXHAUSTED.

## Trigger-cost controls
- Inspect `on` events, branch/tag/path filters, `workflow_run` fan-out, schedules, matrix dimensions and concurrency before writes.
- Prefer one authoritative CI execution per change lifecycle; avoid duplicate push/PR runs for the same SHA unless required.
- Scope expensive suites and bound retries/timeouts/matrices. Docs-only changes skip CI unless required.
- Batch related fixes before pushing; do not create a run per micro-fix.
- If explicit quota exhaustion is observed, stop later trigger-producing pushes/PR updates/tags/merges/reruns. Continue independent offline work; resume only after fresh provider admission or explicit owner authorization.
- A quota check inside a hosted job cannot prevent that job's initial runner allocation.

## Execution and evidence
1. Recover exact project/ticket, goal, source/ref/SHA, acceptance and standing authorization.
2. Inspect workflow definitions and trigger fan-out.
3. Run the intended authorized path; capture run/attempt/job/step IDs, exact SHA, toolchain and outputs.
4. Observe asynchronous lifecycle; do not query once and prematurely conclude.
5. If terminally failed, inspect logs/provider errors and alternative authorized evidence routes.
6. Repair the causal failure when feasible; retry only with a changed hypothesis/method and only if quota/authorization permits.
7. Read back changed source and artifact from the actual consumer.

## Separate acceptance gates
Keep source/static/unit/regression, hosted CI exact-SHA, build/artifact integrity, integration E2E, runtime consumer, device/gameplay/hardware and owner/release approval distinct. Source CI or artifact integrity never proves product acceptance.

## Handoff
Record project/ticket context ID, exact repo/ref/SHA, run/attempt/job/step evidence, logs/provider error, quota classification and evidence source, artifact hashes, acceptance gates, rollback and one Next Action. Never claim completion with an applicable failing/unknown gate. Do not hand routine run/log/quota diagnosis to the owner or claim background execution without a real executor.
