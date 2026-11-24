# GitHub Actions Run Lifecycle and Notion-First Recovery

## 1. Before triggering Actions

1. Resolve the project/ticket and requirement-to-repository/access mapping from the Notion context registry.
2. Read the current GM-51 Quota Routing Snapshot and latest owner report.
3. Require a snapshot no older than 60 minutes.
4. Trigger Actions only on an authorized mapped repository whose owner and repository state are AVAILABLE_VERIFIED.
5. Treat NEAR_LIMIT as fallback-only. QUOTA_EXHAUSTED and REPORTED_QUOTA_EXHAUSTED block every repository under that owner. UNKNOWN, STALE, NOT_CONFIGURED, PERMISSION_DENIED, API_RATE_LIMITED and NOT_DISCOVERED fail closed.

Do not probe quota with a speculative push, rerun, manual dispatch or per-repository workflow.

## 2. Preserve exact run identity

Keep these identifiers distinct:

- repository;
- branch/ref;
- head SHA;
- workflow run ID;
- run attempt;
- job ID;
- Check Run ID;
- runner ID.

A run ID is not a job ID. A job ID is not a Check Run ID. runner_id is evidence about runner assignment, not a billing classification.

## 3. Terminal failure: read Notion first

For every terminal failed run, ChatGPT must query the configured Notion annotation-relay destination (GM-50) before concluding that annotation evidence is unavailable.

The lookup must correlate the exact repository, ref, SHA, run ID, attempt and Check Run ID, and paginate all relevant Notion comments.

Immediate annotation-recovery triggers include:
- provider-owned GitHub Actions Check Run with runner_id=0;
- terminal steps=[];
- annotations_count greater than zero;
- explicit provider quota output.

runner_id=0 and steps=[] trigger the annotation lookup even when annotations_count is zero. They are not blockers, root causes or quota evidence.

The central monitor retrieves provider Check Run annotations and publishes the receipt to Notion. ChatGPT consumes the Notion receipt; it must not terminate diagnosis because a direct connector endpoint is blocked.

## 4. Missing receipt and transport errors

If no receipt matches the exact run identity, record:

NOTION_RELAY_RECEIPT_NOT_FOUND_FOR_EXACT_RUN

This means the expected relay receipt was not found. It does not mean there are no annotations, that quota is exhausted, or that the runner is unavailable.

API_METHOD_BLOCKED is transport-only. It is not a terminal diagnosis. Continue with the configured Notion relay, observer coverage and authorization checks. Do not infer annotation content.

If a Check Run cannot be correlated to a workflow run, preserve its annotation body as UNMATCHED_CHECK_RUN_CORRELATION. Do not promote it to an exact-run or quota conclusion.

## 5. Classification rules

- QUOTA_EXHAUSTED: explicit provider-owned Actions billing/payment/spending-cap annotation or enforced hard cap.
- REPORTED_QUOTA_EXHAUSTED: explicit owner report; blocks the owner's repositories until CLEARED.
- RUNNER_UNAVAILABLE: explicit provider evidence of runner capacity/assignment failure.
- PERMISSION_DENIED: explicit authorization evidence.
- UNKNOWN: no reliable cause after authorized evidence routes.
- NOTION_RELAY_RECEIPT_NOT_FOUND_FOR_EXACT_RUN: exact receipt absent; annotation body remains unread.

Never classify quota from runner_id=0, empty steps, no jobs, missing logs, BlobNotFound, generic 403/404/429 or a connector error.

## 6. Availability proof

AVAILABLE_VERIFIED requires a successful GitHub-hosted runner job observed within 30 minutes and a fresh GM-51 snapshot. Self-hosted jobs, historical green runs and budgets below a hard cap do not establish included-runner availability.

A recent success is evidence at the observation time, not a guarantee of future capacity. The monitor fails closed when evidence is missing or stale.

## 7. Continue work without breaking the loop

A missing receipt or quota restriction does not end independent AI-owned work. Continue source inspection, design, tests that do not trigger the blocked billing owner, Notion reconciliation and other authorized non-triggering tasks. Do not send progress narration or hand off while feasible AI-owned work remains.

Only ask the owner for an exclusive action such as one-time credential/permission setup, private access or final real-world acceptance.
