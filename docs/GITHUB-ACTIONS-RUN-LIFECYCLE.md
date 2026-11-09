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
1. Persist run ID, exact SHA, workflow ID/path, event, branch, actor, attempt and timestamp immediately.
2. Poll run status until terminal or the observation budget expires; respect Retry-After and rate-limit headers.
3. While active, poll latest-attempt jobs. Empty jobs, runner_id=0, empty steps and queued jobs remain pending observations.
4. Poll job status and step summaries. Do not use logs as the primary diagnosis while a job is queued or in progress.
5. After job completion, retrieve logs. Retry transient publication failures, including 404/BlobNotFound, with bounded exponential backoff.
6. Reconcile every attempt/job, check suite, annotations, exact-SHA commit status, artifacts and workflow source.
7. If the observation window expires, record OBSERVATION_WINDOW_EXPIRED. This is not job failure or a provider timeout.
8. Polling requires a real active host/scheduler. ChatGPT may perform bounded sequential observations while its session is alive; never claim background polling after termination.

Suggested configurable backoff: 5s, 10s, 20s, then 30s intervals up to a default 5-minute runner-admission observation window. Provider Retry-After takes precedence. The observation budget is not a job timeout.

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

## Evidence ladder
Run details and attempts -> jobs for each attempt -> job details/runner/start/completion/steps -> check suite/check runs/annotations -> full logs after completion -> workflow YAML at exact SHA -> commit status/PR context -> artifacts -> authorized billing budget/usage API -> alternative authorized REST/CLI route.

Do not add manual dispatch/rerun when prohibited. Avoid duplicate triggers. If quota is explicitly exhausted, pause trigger-producing events and continue offline work. If quota is UNKNOWN, do not call it available or exhausted.