# Execution Environment, CI Lifecycle and Quota Governance

Preflight runs in the active host that owns the next invocation. ChatGPT conversation tools, bounded Python/container, user-local machine, VS Code/Omni Studio, CI runner and provider APIs are separate surfaces. MODEL_GUIDED is not HOST_ENFORCED; host enforcement requires a real broker gate and negative invocation tests.

GitHub Actions is asynchronous. A new run passes through provider admission, queueing, runner allocation/warm-up, job startup, steps, completion and log/artifact publication. Poll run status and jobs with bounded backoff; respect Retry-After and rate-limit headers. Empty jobs while queued/in-progress, runner_id=0, empty steps during startup and transient log 404/BlobNotFound are pending/evidence gaps—not quota proof or automatic failure.

Do not fetch logs as primary diagnosis while a job is queued/in progress. After completion, retrieve logs and retry transient publication gaps with bounded backoff. If the observation budget expires, record OBSERVATION_WINDOW_EXPIRED; do not relabel it job failure.

QUOTA_EXHAUSTED requires explicit billing/minutes/spending-cap/payment evidence for the correct owner/org and period. Generic 403/404/422, runner_id=0, empty steps, missing logs, startup_failure alone, rate limiting and connector wrapper failures are not quota proof. If one wrapper fails, use another authorized provider API/CLI route.

When exhaustion is confirmed, notify owner with evidence and pause later trigger-producing pushes, PR updates, tags, merges and reruns until reset or reauthorization. Continue independent offline work. If quota is UNKNOWN, do not call it available or exhausted; follow standing authorization for the intended automatic CI event.

Inspect workflow event fan-out, branch/path filters, matrices, concurrency, schedules and downstream triggers before writes. Avoid duplicate push+pull_request runs, redundant workflows and retry storms. Docs-only changes normally use content/contract checks and remote readback without CI unless required.

See GITHUB-ACTIONS-RUN-LIFECYCLE.md for the polling state machine and evidence ladder.