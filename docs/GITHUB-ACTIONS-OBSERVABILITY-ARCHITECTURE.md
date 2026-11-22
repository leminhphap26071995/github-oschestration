# GitHub Actions Failure and Quota Detection Architecture

Status: implementation in progress; same-repository observer E2E is being verified. Cross-repository private monitoring remains credential-gated.

## 1. Objective and correctness contract

This system observes the real GitHub Actions provider lifecycle and classifies only causes supported by provider or execution evidence. It must distinguish workflow-definition failures, run/job admission and runner lifecycle, executed step failures, permission/policy denial, API throttling, artifact storage, Actions billing limits, and evidence-collection failures.

There is no honest universal 100% root-cause guarantee: GitHub may omit a cause, an API may be inaccessible, a run may never be admitted, or logs may not yet be published. The system therefore guarantees conservative behavior instead:

- Authoritative evidence produces a specific classification with its provenance.
- Missing, stale, contradictory, or inaccessible evidence produces UNKNOWN / EVIDENCE_GAP.
- No inference from runner_id=0, empty jobs/steps, HTTP 403/404/429, BlobNotFound, a missing run, or aggregate usage totals to quota exhaustion.
- API rate limits, Actions compute minutes/spending caps, artifact storage, and billing API permissions are separate domains. The API usage monitor measures only REST API bucket consumption.
- Synthetic echo-generated annotations are not accepted as provider or implementation evidence.

## 2. Integrated lifecycle

### A. Source preflight

workflow-quality-gate.yml runs on workflow-source changes and executes a real actionlint parser plus runtime/metadata checks. Parser output is passed through the registered GitHub problem matcher, creating actual Check Run annotations. This catches malformed YAML and action metadata before relying on the source workflow's own runner.

### B. Provider lifecycle observer

actions-run-diagnostics.yml is a trusted default-branch workflow observing configured workflow names through workflow_run events: requested and completed. On requested, the observer polls for a bounded window until a runner/step is observed or the source run completes; the completed event then captures final annotations/logs.

The observer checks out only its trusted default-branch SHA. It never checks out or executes code from the source branch. It uses the source event's exact repository, workflow path, source SHA, run ID, and attempt to fetch the source workflow blob as data and run actionlint against that exact version.

The observer separately retrieves:

- Workflow run metadata and bounded admission polling.
- Attempt-scoped jobs.
- Job metadata and runner assignment.
- Job Check Run IDs and annotations.
- Workflow Check Suite IDs, Check Runs, outputs, and annotations, including the zero-job case.
- Job logs with bounded retries and Retry-After handling.
- Source workflow definition diagnostics.

run_id, run_attempt, job_id, check_run_id, and runner_id are distinct fields. PRESENT(value), explicit NULL, and MISSING are preserved. A failed job's log 404 is recorded as LOG_PUBLICATION_PENDING, not quota exhaustion.

### C. Annotation readback

The readback job waits for diagnose to finish, retrieves the actual observer Check Run annotations, and uploads them with the sanitized diagnostic receipt. This makes parser diagnostics and their annotation provenance independently inspectable.

The source workflow's own annotations are collected from its job Check Runs. When the source has zero jobs, parser annotations belong to the trusted observer Check Run; the receipt records that boundary explicitly.

### D. Private repository observer

The same public repository also schedules private-target-monitor.mjs every 15 minutes. Standard GitHub-hosted runners in public repositories are free of included private-repository Actions minutes, so this is an independent compute path for private repositories whose included minutes are exhausted. It is not independent of a GitHub account suspension, GitHub-wide outage, or all possible billing restrictions.

The observer jobs also run the pinned hesreallyhim/github-api-usage-monitor action with diagnostics enabled. Workflow-run and annotation-readback jobs measure the observer GITHUB_TOKEN; the scheduled private-target job measures its public observer token and, only when configured, the private read-only token. Each token gets a separately named state/poll-log artifact. This is REST API bucket telemetry only; it is not evidence of included Actions minutes or billing exhaustion.

The monitor reads its target list and read-only access token only from repository Secrets:

- PRIVATE_MONITOR_TOKEN
- PRIVATE_TARGETS_JSON

The token needs repository Actions: read, Checks: read, Contents: read, and Metadata: read for every configured private target and the optional private billing-snapshot repository. It is never printed. Private repository names, workflow paths, branch names, SHAs, run IDs, raw logs, and provider messages are not written to public artifacts; the artifact uses opaque target/workflow aliases and classification/evidence types only.

A target configuration must explicitly state expected workflows. Supported expectations are:
- every_push: the workflow is expected on every push to the configured branch.
- schedule: the workflow is expected at the configured interval.

Path-filtered or otherwise conditional triggers are not inferred. They remain unsupported until their trigger semantics are explicitly configured, preventing false missing-run alerts.

For every observed or missing run, the monitor fetches the exact workflow file at the source/branch SHA and runs actionlint plus the reusable workflow-quality-gate action-runtime metadata audit. It can distinguish malformed YAML/schema from retired or unsupported remote action runtimes; inaccessible action metadata remains UNKNOWN. If an expected run is absent after the grace window and neither parser nor runtime audit proves a configuration fault, it reports NO_RUN_OBSERVED with UNKNOWN cause. A missing run is not proof of quota exhaustion.

## 3. Evidence and classification contract

Canonical classes currently supported by the collector include:

- WORKFLOW_YAML_SYNTAX_ERROR
- WORKFLOW_SCHEMA_OR_EXPRESSION_ERROR
- ACTIONS_BILLING_QUOTA_EXHAUSTED
- ACTIONS_ADMISSION_BLOCKED
- ACTION_RUNTIME_RETIRED_OR_UNSUPPORTED
- ACTION_RUNTIME_METADATA_UNAVAILABLE (evidence gap, not a failure class)
- STATIC_ANALYSIS_WARNING
- ARTIFACT_STORAGE_QUOTA_EXHAUSTED
- PERMISSION_OR_POLICY_DENIED
- RUNNER_UNAVAILABLE
- RUNNER_NOT_ASSIGNED_YET
- EXECUTION_IN_PROGRESS
- STEP_IMPLEMENTATION_FAILURE
- STEP_FAILURE
- API_RATE_LIMITED
- LOG_PUBLICATION_PENDING
- OBSERVATION_WINDOW_IN_PROGRESS
- EXECUTION_EVIDENCE_MISSING
- UNKNOWN
- NOT_FAILED

Quota requires an explicit Actions billing/spending/included-usage provider message in a workflow Check Run, annotation, or trusted job log, or a separately verified provider budget hard-cap state. Generic "quota", "usage", "403", "billing", or "resource not accessible" strings are insufficient.

Permission denial is not inferred from any generic HTTP 403. A 403 from the collector's own API request is an evidence-retrieval failure, not proof that the source workflow token lacked permission.

A failed job with runner_id=0 and no steps is UNKNOWN unless the workflow-level Check Run contains an authoritative provider reason. A job log 404 is LOG_PUBLICATION_PENDING plus EVIDENCE_GAP. A completed run with zero job records is UNKNOWN unless workflow parser or Check Suite output supplies the cause.

## 4. Private billing and no-run boundary

A workflow cannot observe its own failure to be admitted when its billing owner prevents any runner from starting. A workflow_run observer in that same exhausted private repository is not an independent solution.

The scheduled monitor in this public repository is a separate compute path for private targets, but it requires owner-configured credentials and an explicit expected-workflow inventory. Until both Secrets exist, the private observer reports BLOCKED; it must not report a healthy zero or claim private coverage.

The private observer can optionally read the existing billing collector's usage-latest.json snapshot from a private repository using the same read-only token. It accepts only a fresh, target-matching Actions budget item with prevent_further_usage=true and status=HARD_CAP_REACHED as independent hard-cap evidence. A hard cap can explain a missing run or a run with no assigned runner/steps; it never overrides an observed executed-step failure or a proven workflow syntax/permission failure.

Usage-summary APIs report consumption, not necessarily remaining included minutes. The collector explicitly reports remaining_included_minutes as NOT_EXPOSED_BY_USAGE_SUMMARY_API. Personal-account included-minute exhaustion therefore cannot be proven from consumption totals alone. Stale snapshots, missing billing credentials, unknown account status, non-matching budgets, and personal-account remaining allowance all remain UNKNOWN/partial. If GitHub exposes no hard-cap state for a personal account and no provider message exists, the cause remains UNKNOWN.

No quota is deliberately exhausted for testing. A real quota-exhaustion E2E is only performed against a safe disposable target when the owner explicitly authorizes the billing impact. Otherwise the live quota case remains NOT VERIFIED.

## 5. Security and data handling

- Least-privilege read permissions for the observer.
- No contents: write in diagnostic jobs.
- No workflow_dispatch or manual rerun path.
- No execution of source-branch code by trusted observers.
- No private target identity or raw private evidence in public artifacts.
- No raw job logs persisted; only sanitized evidence snippets and provider metadata.
- Bounded retries, pagination, attempt-scoped retrieval, and exact SHA correlation.
- Collector API failures are kept separate from source workflow failures.

## 6. Verification matrix

| Scenario | Required real evidence | Expected result |
| --- | --- | --- |
| Malformed workflow YAML | Exact committed source blob; actionlint parser output; actual observer Check Run annotation readback | WORKFLOW_YAML_SYNTAX_ERROR |
| Valid workflow, failed test/build step | Actual runner, failed step, exact attempt log and Check Run annotation | STEP_IMPLEMENTATION_FAILURE or STEP_FAILURE |
| Zero jobs / no runner | Exact source run and Check Suite output; no inference from runner_id=0 | Provider cause if explicit, otherwise UNKNOWN |
| GitHub token permission denied | Source job annotation/log with explicit GitHub permission evidence | PERMISSION_OR_POLICY_DENIED |
| Collector API 403/404/429 | Collector request status and endpoint | EVIDENCE_GAP / API retrieval status, not source cause |
| Actions quota exhausted | Explicit provider billing/spending/included-usage message or verified hard cap | ACTIONS_BILLING_QUOTA_EXHAUSTED |
| Artifact storage exhausted | Explicit artifact storage quota response | ARTIFACT_STORAGE_QUOTA_EXHAUSTED |
| Private expected run absent | Independent scheduled poll, explicit expectation config, exact branch/workflow definition | NO_RUN_OBSERVED; syntax class if parser proves it, otherwise UNKNOWN |
| Missing private credentials | Missing Secret state | BLOCKED, never healthy/zero |

## 7. Owner configuration required for private targets

Add these GitHub repository Secrets to this public observer repository only after reviewing the token scope and target inventory:

PRIVATE_MONITOR_TOKEN: a read-only fine-grained PAT or GitHub App installation token with Actions, Checks, Contents, and Metadata read access to the configured private repositories.

PRIVATE_TARGETS_JSON: JSON configuration with opaque aliases, private repository identifiers, branch, expected workflow paths/events, grace intervals, and optional billing_scope per target. An optional billing_snapshot object identifies the private collector repository, branch, JSON path, and maximum snapshot age. Use every_push only for workflows that truly run on every push; use schedule for scheduled workflows.

Example shape (placeholders only; do not commit real private repository names):

~~~json
{
  "schema_version": 1,
  "targets": [
    {
      "id": "target-01",
      "repository": "OWNER/PRIVATE_REPOSITORY",
      "branch": "main",
      "billing_scope": "user",
      "expected_workflows": [
        {
          "id": "workflow-ci",
          "path": ".github/workflows/ci.yml",
          "event": "push",
          "expectation": "every_push",
          "grace_minutes": 15
        }
      ]
    }
  ],
  "billing_snapshot": {
    "repository": "OWNER/PRIVATE_BILLING_COLLECTOR",
    "branch": "main",
    "path": "ops/github-actions-usage/usage-latest.json",
    "max_age_minutes": 1500
  }
}
~~~

Set billing_scope to user or organization to match the collector account record. The snapshot is optional; if omitted, billing coverage is NOT_CONFIGURED. A personal account snapshot can establish that remaining included minutes are not exposed, but cannot establish their remaining balance. Organization/repository Actions budgets are authoritative only when the matching budget item explicitly reports HARD_CAP_REACHED with prevent_further_usage=true.

If these Secrets are absent, cross-repository private coverage remains BLOCKED. Do not copy credentials from another repository by assumption; GitHub Secrets are not readable through the connector and must be explicitly provisioned by the owner.

## 8. Current verification boundary

The same-repository observer and annotation readback have executed on real GitHub-hosted runners and uploaded raw/final diagnostic artifacts. The latest implementation still requires green exact-HEAD Conformance and Workflow Quality Gate, plus a new real malformed-YAML and real failing-test fault-injection run.

Private target polling is implemented but cannot be considered live-verified until the two repository Secrets are provisioned and the scheduled job observes an authorized private target.

Live Actions quota exhaustion has not been forced. A private run with no assigned runner and no logs is not classified as quota without its provider Check Suite evidence.
