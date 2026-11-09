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
1. Lock owner/org/repo, branch, exact source SHA, workflow ID/path, event, actor, run ID, attempt and timestamp.
2. Inspect the workflow trigger graph before writes: push/PR/tag/release/workflow_run/schedule, path/branch filters, matrix, concurrency and downstream fan-out.
3. Poll run admission/status; respect provider `Retry-After` and rate-limit headers.
4. Poll latest-attempt jobs while the run is active. Empty job lists, `runner_id=0` and queued states remain pending observations.
5. Poll job state and step summaries. Empty steps while startup is in progress remain pending.
6. Only after job completion, fetch full job logs. Retry transient log publication gaps such as 404/`BlobNotFound` with bounded backoff; preserve each response and timestamp.
7. Reconcile all attempts, jobs, check suites/runs, annotations, exact-SHA status, workflow YAML and artifacts.
8. If one connector wrapper is filtered, paginated, incomplete or fails, inspect its schema and use another authorized provider REST/API/CLI route. A failed adapter is not proof that provider data is absent.
9. Persist the execution cursor and continue while authorized work remains runnable.

Suggested observation backoff: 5s, 10s, 20s, then 30s up to a configurable five-minute runner-admission window. Provider `Retry-After` takes precedence. This window limits observation effort, not the workflow's execution time.

## Failure classification
- `WORKFLOW_FAILED`: an executed failing step plus log/annotation identifies the cause.
- `RUNNER_UNAVAILABLE`: provider explicitly identifies runner/host capacity failure.
- `PERMISSION_DENIED`: provider explicitly identifies authorization or policy denial.
- `QUOTA_EXHAUSTED`: explicit billing/minutes/spending-cap/payment evidence for the correct billing owner and period.
- `LOG_PUBLICATION_PENDING`: completed job logs are temporarily unavailable during bounded retry.
- `EXECUTION_EVIDENCE_MISSING`: failed run/job has no executed-step/log/provider cause.
- `API_METHOD_BLOCKED` / `API_RATE_LIMITED`: evidence route failed; try a materially different authorized route.
- `UNKNOWN`: viable authorized evidence routes were exhausted without a reliable cause.

Never infer quota from `runner_id=0`, empty jobs/steps, queued/in-progress status, `startup_failure` alone, missing log blobs, generic 403/404/422, connector errors, high run counts or historical usage. Historical usage is not remaining quota. Billing API unavailability establishes neither AVAILABLE nor EXHAUSTED.

## Quota response
When explicit exhaustion is confirmed, capture the exact message/endpoint/status, owner/org, product, budget cap/spend, billing period and reset when available. Notify the owner, pause later trigger-producing pushes/PR updates/tags/merges/reruns, and continue independent offline work. Resume trigger-producing work only after fresh provider admission or explicit owner authorization. If quota remains UNKNOWN, report UNKNOWN and follow standing authorization for the intended automatic event.

## Trigger discipline
- Do not add `workflow_dispatch` or manual rerun controls where owner policy prohibits them.
- Prefer one authoritative automatic run per change lifecycle; avoid duplicate push+PR fan-out and retry storms.
- Scope branch/path filters, matrix size, concurrency and retries.
- Docs-only changes use content checks and remote readback unless CI is explicitly required.
- A quota check inside a hosted job cannot prevent that job's initial runner allocation.

## Evidence and acceptance
Bind every conclusion to exact repo/ref/SHA, run/attempt/job/step IDs, workflow path, timestamps, raw errors/logs, artifacts and consumer result. Run admission, job execution, source checks, artifact integrity and downstream consumer acceptance are separate gates. A commit, run conclusion or missing log alone is not completion.
