# Integrated Workflow Quality Gate and Notion-First Diagnostics

## Execution boundary

The quality gate is a validation job inside .github/workflows/github-actions-quota-monitor.yml. It is not a separate scheduled workflow and does not use workflow_run fan-out.

The validation job runs on pull requests and pushes. The scheduled monitor job is separate within the same workflow and is the only quota collector.

## Validation chain

1. Python regression suite, including repository-control-plane and quota collector tests.
2. Node regression suite, including token discovery, annotation relay, Notion publishing, quota-state derivation and workflow lifecycle tests.
3. Token-permission contract audit.
4. actionlint over every workflow YAML file.
5. Workflow/action quality gate: referenced action metadata and runtime compatibility, immutable action revisions, trigger/permission contract and absence of retired duplicate quota workflows.

Unavailable metadata or incomplete evidence is UNKNOWN and fails the validation gate; it is never reported as a pass.

## Failure and no-runner semantics

A terminal failed Actions run with runner_id=0 or terminal steps=[] triggers the Notion annotation-recovery path. For a provider-owned GitHub Actions Check Run, this trigger applies even when annotations_count is zero.

The central monitor:
- scans recent runs across all branches;
- preserves exact repository/ref/SHA/run ID/attempt/Check Run correlation;
- reads job evidence for recent failures and recent successful runs;
- retrieves annotations when the annotation count, provider quota output or no-runner trigger requires it;
- publishes exact receipts to GM-50;
- publishes unmatched annotations as UNMATCHED_CHECK_RUN_CORRELATION rather than pretending the run was correlated.

runner_id=0, empty steps, no jobs, missing logs, BlobNotFound and connector errors are not quota evidence. Only explicit provider-owned Actions billing/payment/spending-cap evidence or an enforced hard cap can classify QUOTA_EXHAUSTED. Owner-reported exhaustion remains REPORTED_QUOTA_EXHAUSTED.

## Notion readback

ChatGPT sessions read the Notion receipt before diagnosing a terminal failed run. The exact identity includes repository, ref, SHA, run ID, attempt and Check Run ID.

If no exact receipt exists, use NOTION_RELAY_RECEIPT_NOT_FOUND_FOR_EXACT_RUN. API_METHOD_BLOCKED is transport-only; it cannot terminate recovery before the configured Notion route and observer coverage have been checked.

## Regression coverage

The suite verifies:
- exact run/attempt/check-suite correlation and pagination;
- open same-repository PR head discovery and fork exclusion;
- annotation retrieval when runner_id=0 or steps=[] even if annotations_count is zero;
- no quota inference from runner sentinel or empty steps alone;
- self-hosted success does not prove included GitHub-hosted availability;
- exact and unmatched receipt publication;
- Notion snapshot publication, owner-report precedence and stale/unknown fail-closed routing;
- actionlint and immutable action metadata checks.

The central workflow is the only quota CI. UPW release and workflow-cleanup automation remain separate responsibilities.
