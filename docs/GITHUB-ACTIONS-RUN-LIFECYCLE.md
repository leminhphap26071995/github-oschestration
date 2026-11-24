# GitHub Actions Run Lifecycle and Notion-First Recovery

## 1. Before triggering Actions

1. Resolve project/ticket and requirement-to-repository/access mapping from the Notion context registry.
2. Read the current Quota Routing Snapshot and latest owner report.
3. Require a snapshot no older than 60 minutes.
4. Prefer FREE_TIER_AVAILABLE (public + exact standard runner) before AVAILABLE_VERIFIED (private/internal included compute).
5. Trigger Actions only on an authorized mapped repository whose quota/cost state is eligible.
6. NEAR_LIMIT is fallback-only. QUOTA_EXHAUSTED and REPORTED_QUOTA_EXHAUSTED block private/internal included-compute use. UNKNOWN, STALE, NOT_CONFIGURED, NO_ACCESS, PERMISSION_DENIED and API_RATE_LIMITED fail closed.

Do not probe quota with speculative pushes, reruns, manual dispatches or per-repository workflows.

## 2. Preserve exact run identity

Keep repository, branch/ref, head SHA, workflow run ID, run attempt, job ID, Check Run ID and runner ID distinct. A run ID is not a job ID; a job ID is not a Check Run ID. runner_id is assignment evidence, not a billing classification.

## 3. Model the asynchronous provider lifecycle

GitHub Actions is asynchronous. Do not collapse admission, runner provisioning, job startup, execution, log publication and terminal observation into one state.

- RUNNER_WARMUP_PENDING: workflow run admitted; a runner has not yet been assigned or is still provisioning.
- JOB_STARTUP_PENDING: runner assigned; the job has not started executing steps.
- LOG_PUBLICATION_PENDING: execution ended but the provider has not yet published complete logs or annotations.
- OBSERVATION_WINDOW_EXPIRED: the observer's time window elapsed without decisive terminal evidence. This is not a quota diagnosis.
- Retry-After: honor the provider's retry delay on rate limits; do not spin, dispatch duplicates or classify a 429 as quota exhaustion.

Keep exact run attempt and Check Run correlation throughout each transition. Missing runner metadata, empty steps, no jobs, blank logs or BlobNotFound are not root-cause classifications.

## 4. Terminal failure: read Notion first

For every terminal failed run, query the configured Notion annotation-relay destination (GM-50) before concluding that annotation evidence is unavailable. Correlate the exact repository, ref, SHA, run ID, attempt and Check Run ID; paginate all relevant Notion comments.

Immediate annotation-recovery triggers include provider Check Run runner_id=0, terminal steps=[], annotations_count greater than zero, or explicit provider quota output. runner_id=0 and steps=[] trigger annotation lookup even when annotations_count is zero. They are not blockers or quota evidence.

The central monitor retrieves provider Check Run annotations and publishes receipts to Notion. ChatGPT consumes the Notion receipt; it must not terminate diagnosis because a direct connector endpoint is blocked.

## 5. Missing receipt and transport errors

If no receipt matches the exact run identity, record NOTION_RELAY_RECEIPT_NOT_FOUND_FOR_EXACT_RUN. This means the relay receipt was not found; it does not mean there are no annotations or that quota is exhausted.

API_METHOD_BLOCKED is transport-only. Continue with the configured Notion relay, observer coverage and authorization checks. Do not infer annotation content. If a Check Run cannot be correlated to a workflow run, preserve its body as UNMATCHED_CHECK_RUN_CORRELATION and do not promote it to exact-run or quota evidence.

## 6. Classification and availability

- QUOTA_EXHAUSTED: explicit provider-owned Actions billing/payment/spending-cap annotation or enforced applicable hard cap.
- REPORTED_QUOTA_EXHAUSTED: explicit owner report; blocks private/internal included-compute use until cleared.
- RUNNER_UNAVAILABLE: explicit provider evidence of runner capacity/assignment failure.
- PERMISSION_DENIED / NO_ACCESS: explicit authorization boundary.
- API_RATE_LIMITED: provider throttling; honor Retry-After and retry later.
- UNKNOWN: no reliable cause after authorized evidence routes.
- NOTION_RELAY_RECEIPT_NOT_FOUND_FOR_EXACT_RUN: exact receipt absent; annotation body remains unread.

FREE_TIER_AVAILABLE requires a fresh successful run on an exact standard GitHub-hosted runner in a public repository. AVAILABLE_VERIFIED requires fresh successful standard-runner evidence for private/internal repositories with billing collection and owner state clear. A self-hosted job, larger runner, historical green run or budget below its cap does not establish included-runner availability.

## 7. Continue work without breaking the loop

A missing receipt or quota restriction does not end independent AI-owned work. Continue source inspection, design, tests that do not trigger the blocked billing owner, Notion reconciliation and other authorized tasks. Only ask the owner for exclusive credential/permission setup, private access or final real-world acceptance.


## 2026-11-24 correction — no-runner state triggers notion annotation recovery

This exact section is the controlling recovery rule. A raw attempt-scoped job with runner_id: 0, a terminal failed job with steps: [], or a Check Run with annotations_count > 0 triggers immediate Notion-first annotation recovery. These are routing signals, not root-cause classifications, quota evidence, or terminal blockers.

The following representations are deliberately preserved for exact-source conformance:
- runner_id: 0
- steps: []
- annotations_count > 0
- empty jobs
- runner_id=0
- steps=[]

Immediately correlate the exact repository, ref, head SHA, workflow run ID, attempt and Check Run ID. Query the configured Notion annotation-relay destination and paginate all discussions/comments. Interpret only the exact matching receipt's annotation body. Only an explicit provider-owned Actions billing/payment/spending-cap message or an enforced applicable hard cap proves QUOTA_EXHAUSTED.

If the exact receipt is absent, record NOTION_RELAY_RECEIPT_NOT_FOUND_FOR_EXACT_RUN. This means the receipt was not found; it does not mean annotations are absent. API_METHOD_BLOCKED is transport-only and must route to the Notion relay; it is never the terminal diagnosis while the relay path remains unexamined or repairable.

Do not classify runner_id: 0, steps: [], empty jobs, missing logs, blank runner metadata or BlobNotFound as quota exhaustion or as a reason to stop. Preserve PRESENT/NULL/MISSING distinctly. Honor Retry-After on API rate limits and continue other independent AI-owned work.
