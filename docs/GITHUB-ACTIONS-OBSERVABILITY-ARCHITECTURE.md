# GitHub Actions Failure and Quota Detection Architecture

Status: same-repository real fault-injection E2E is VERIFIED. Cross-repository private observation and billing-snapshot ingestion are implemented but remain unverified until owner credentials and a scheduled target run are available.

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

The same public repository schedules private-target-monitor.mjs every 15 minutes. It also starts a private-target probe from the requested event of Workflow Quality Gate on the trusted main branch, then waits for that exact source run to complete successfully before reading private targets. This provides an automatic probe after workflow configuration changes without exposing private credentials to untrusted branch runs. Standard GitHub-hosted runners in public repositories are free independently and do not draw from the private owner's included compute usage pool, so this is an independent compute path for private repositories whose included compute usage is exhausted. It is not independent of a GitHub account suspension, GitHub-wide outage, or all possible billing restrictions.

The observer jobs also run the pinned hesreallyhim/github-api-usage-monitor action with diagnostics enabled. Workflow-run, annotation-readback, and scheduled/trusted-quality-gate private-target jobs measure only the observer GITHUB_TOKEN. A real private-target run showed that the action's pre hook receives an empty optional PRIVATE_MONITOR_TOKEN before a step-level if can protect its main step; the secret-backed action was removed. The private collector handles missing credentials and emits BLOCKED. Private-token API-rate telemetry is not currently a separate signal. The monitor artifacts are REST API bucket telemetry only; they are not evidence of included Actions minutes or billing exhaustion.

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

ACTIONS_BILLING_QUOTA_EXHAUSTED requires either (1) explicit Actions billing/spending/included-usage wording in the output title/summary/text of the provider-owned workflow-level Check Run (`app_slug=github-actions`, `name=GitHub Actions`), or (2) a fresh matching billing snapshot with `prevent_further_usage=true` and `status=HARD_CAP_REACHED`. Job-level annotations and arbitrary step logs are not quota proof: workflow code can emit those strings itself. Generic "quota", "usage", "403", "billing", or "resource not accessible" strings are insufficient.

Permission denial is not inferred from any generic HTTP 403. A 403 from the collector's own API request is an evidence-retrieval failure, not proof that the source workflow token lacked permission.

A failed job with runner_id=0 and no steps is UNKNOWN unless the workflow-level Check Run contains an authoritative provider reason. A job log 404 is LOG_PUBLICATION_PENDING plus EVIDENCE_GAP. A completed run with zero job records is UNKNOWN unless workflow parser or Check Suite output supplies the cause.

## 4. Private billing and no-run boundary

A workflow cannot observe its own failure to be admitted when its billing owner prevents any runner from starting. A workflow_run observer in that same exhausted private repository is not an independent solution.

The scheduled monitor in this public repository is a separate compute path for private targets, but it requires owner-configured credentials and an explicit expected-workflow inventory. Until both Secrets exist, the private observer reports BLOCKED; it must not report a healthy zero or claim private coverage.

The private observer can optionally read the existing billing collector's usage-latest.json snapshot from a private repository using the same read-only token. It accepts only a fresh, target-matching Actions budget item with prevent_further_usage=true and status=HARD_CAP_REACHED as independent hard-cap evidence. A hard cap can explain a missing run or a run with no assigned runner/steps; it never overrides an observed executed-step failure or a proven workflow syntax/permission failure.

Organization-level billing usage summaries report Actions consumption quantities and net amounts; user-level billing usage endpoints report Copilot usage, not personal Actions usage. The collector reports actions_usage_status=NOT_EXPOSED_BY_USER_BILLING_API for personal accounts and included_compute_balance_status=NOT_EXPOSED_BY_USAGE_SUMMARY_API. It never converts an empty personal usage result into zero. Personal Actions included-compute exhaustion therefore cannot be proven from consumption totals. Stale snapshots, missing billing credentials, unknown account status, non-matching budgets, and personal-account remaining allowance all remain UNKNOWN/partial. If GitHub exposes no hard-cap state for a personal account and no provider message exists, the cause remains UNKNOWN.

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
| Zero jobs / no runner | Exact source run, Check Suite output, exact workflow blob and independent parser/runtime evidence | Specific parser/runtime/provider cause if proven, otherwise UNKNOWN |
| Runner not assigned | Requested-event lifecycle polling plus explicit runner/job state | RUNNER_NOT_ASSIGNED_YET / OBSERVATION_WINDOW_IN_PROGRESS; never inferred quota |
| Matching organization hard cap | Fresh private billing snapshot with matching Actions budget item, prevent_further_usage=true and HARD_CAP_REACHED | ACTIONS_BILLING_QUOTA_EXHAUSTED |
| Personal Actions included compute balance | User-level billing usage endpoint reports Copilot usage, not Actions | UNKNOWN; no personal Actions balance is inferred |
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

Set billing_scope to user or organization to match the collector account record. The snapshot is optional; if omitted, billing coverage is NOT_CONFIGURED. A personal account snapshot can establish that personal Actions usage and remaining included compute balance are not exposed by the user-level billing usage endpoint, but cannot establish their remaining balance. Organization/repository Actions budgets are authoritative only when the matching budget item explicitly reports HARD_CAP_REACHED with prevent_further_usage=true.

If these Secrets are absent, cross-repository private coverage remains BLOCKED. Do not copy credentials from another repository by assumption; GitHub Secrets are not readable through the connector and must be explicitly provisioned by the owner.

## 8. Current verification boundary

### Verified real executions

- Exact current main HEAD: 461e40a1fd596879efe06ca01069ff82a7e529d0.
- Portable AI Workflow Conformance: PASS on that exact HEAD (run 45034406856).
- Workflow Quality Gate: PASS on workflow revision ac9b7a2768bbacb2d2a3832621dcd58cb5d8243d; the workflow definition did not change in later commits.
- Real malformed YAML source run 45032875877: GitHub created a failed run with zero jobs. The trusted observer parsed the exact source blob and emitted a real Check Run annotation; annotation readback from observer run 45032878964 returned one annotation.
- Real failing test source run 45032877234: GitHub-hosted runner 1000003298 executed Node.js 24 and failed on an actual AssertionError. The observer retrieved the attempt-scoped job log and classified STEP_IMPLEMENTATION_FAILURE (observer run 45032881650).
- Real workflow-quality-gate source run 45032877218: actionlint emitted three actual annotations, including the malformed workflow parser diagnostic and a separate ShellCheck SC2034 warning. The observer retrieved and classified the annotations (observer run 45032880827).
- The API usage monitor is integrated into the real diagnose and readback jobs. Observer run 45034410622 produced separate state.json/poll-log.json artifacts for both jobs; each recorded three polls and zero poll failures. The diagnose token's core REST bucket was 3,930 remaining of the API-reported 5,000 at the end of that short job; this is API telemetry, not Actions minutes or private-repository quota.

The fault-injection branch is isolated and intentionally not merged. The former echo-based/synthetic annotation workflows were removed from the test branch before these real tests.

### Not yet verified

- The scheduled private-target job has not yet produced a live schedule-run receipt.
- PRIVATE_MONITOR_TOKEN and PRIVATE_TARGETS_JSON must be explicitly provisioned by the owner. The optional billing_snapshot configuration must point to the private collector's usage-latest.json and include billing_scope for each target.
- The last inspected private collector snapshot (2026-11-17) reported BILLING_TOKEN_NOT_CONFIGURED; it cannot establish a billing hard cap. The user-level billing usage endpoint reports Copilot usage, not personal Actions usage, so personal Actions included compute balance is NOT_EXPOSED_BY_USER_BILLING_API.
- No live Actions quota was deliberately exhausted. This remains NOT VERIFIED; do not treat a private run with no steps/logs as quota without explicit provider evidence or a fresh matching hard-cap snapshot.

The system does not promise universal 100% root-cause classification when GitHub withholds evidence. It guarantees conservative, evidence-bound output: specific class only when proven; otherwise UNKNOWN/BLOCKED with the missing evidence named.


## 8. Live reconciliation — 2026-11-22

The previous verification checkpoint at HEAD 461e40a1fd596879efe06ca01069ff82a7e529d0 is superseded by code HEAD 6c9ae5ecb64f49b81fdf2bf98b604d17c49de74a (PR #3; included-compute billing semantics correction).

### Real defects found and corrected

- Observer run [45035470652](https://github.com/leminhphap26071995/github-oschestration/actions/runs/45035470652), job 137248128354, failed in the optional private-token Usage Monitor pre-hook with `No token provided`. The main step's conditional did not prevent the action lifecycle hook from running. The optional action and its dead credential-check step were removed. The public observer GITHUB_TOKEN monitor remains.
- Workflow Quality Gate caught ShellCheck SC2034 in the trusted-quality-gate wait loop; the poll counter is now used in the wait message. The corrected branch Workflow Quality Gate passed in [45036738785](https://github.com/leminhphap26071995/github-oschestration/actions/runs/45036738785).
- The classifier no longer accepts quota-like text from job annotations or arbitrary step logs. It accepts Actions billing exhaustion only from provider-owned workflow-level Check Run output (`app_slug=github-actions`, `name=GitHub Actions`) or a fresh matching billing hard-cap snapshot. Regression tests cover synthetic annotation/log text and third-party Check Run output.

### Exact-main verification

- Squash merge: [PR #2](https://github.com/leminhphap26071995/github-oschestration/pull/2), merge commit `991769f1a1e75190a360ef0c3277362de9b13aff`.
- Workflow Quality Gate: [45036803190](https://github.com/leminhphap26071995/github-oschestration/actions/runs/45036803190) — SUCCESS on the exact main SHA.
- Portable AI Workflow Conformance: [45036803128](https://github.com/leminhphap26071995/github-oschestration/actions/runs/45036803128) — SUCCESS on the exact main SHA.
- Credential Read Audit: [45036803369](https://github.com/leminhphap26071995/github-oschestration/actions/runs/45036803369) — SUCCESS on the exact main SHA.
- Trusted observer: [45036807251](https://github.com/leminhphap26071995/github-oschestration/actions/runs/45036807251) — SUCCESS. Its private-target job completed successfully without the pre-hook failure and uploaded a redacted private-target receipt.

### Private-target coverage result

The actual private-target collector output was:

`{"schema_version":1,"recorded_at":"2026-11-22T15:11:00.593Z","coverage_status":"BLOCKED","blocker":"PRIVATE_MONITOR_TOKEN_NOT_CONFIGURED","targets":[]}`

The job log showed both `PRIVATE_MONITOR_TOKEN` and `PRIVATE_TARGETS_JSON` were empty. The redacted receipt artifact is [14759953414](https://github.com/leminhphap26071995/github-oschestration/actions/runs/45036807251/artifacts/14759953414), SHA-256 `8c6f002258691e49c40ee0effc91c32298a550f4df5a70e67401a04073bdbcc2`. This is a verified BLOCKED result, not private-target coverage and not quota exhaustion.

The same job's public observer token telemetry recorded 64 REST API requests in 34 seconds across four polls, with 2,462 remaining in the API-reported core bucket. This does not represent Actions compute/minute quota or private-token usage.

### Remaining acceptance boundary

- Real malformed-YAML zero-job and real executed-step failure E2E remain verified on the isolated fault-injection branch; the synthetic echo branch is not acceptance evidence.
- Live Actions quota exhaustion was not forced and remains NOT VERIFIED. Personal Actions included compute balance is not exposed by the user-level billing usage endpoint; no fresh private billing snapshot is available.
- Cross-repository private polling remains BLOCKED until the owner provisions `PRIVATE_MONITOR_TOKEN` and `PRIVATE_TARGETS_JSON` as repository Secrets. Do not paste the token into chat.
- Actual permission-denied, artifact-storage/retention, and secondary API-throttle E2E remain outstanding. Unknown or unavailable evidence must remain UNKNOWN/BLOCKED, never be relabelled as quota.


## 9. Billing semantics correction — 2026-11-22

Merged in [PR #3](https://github.com/leminhphap26071995/github-oschestration/pull/3), code HEAD `6c9ae5ecb64f49b81fdf2bf98b604d17c49de74a`.

- The collector no longer calls the user-level billing usage endpoint for Actions. GitHub documents user-level billing usage endpoints as Copilot usage; they are not a source for personal Actions usage or remaining included compute balance.
- Personal account collection now sets `actions_usage_status=NOT_EXPOSED_BY_USER_BILLING_API`, keeps usage totals UNKNOWN (never zero), and labels repository inventory as NOT_EXPOSED for Actions usage. The root snapshot records `included_compute_balance_status=NOT_EXPOSED_BY_USAGE_SUMMARY_API`.
- The misleading `remaining_included_minutes` field was removed. The collector schema is now v3. `discountQuantity` is shown as discounted usage quantity, not "included minutes"; `netQuantity` is named `net_minutes`, not "billable minutes".
- Organization-level Actions usage remains measured from the organization usage summary. An Actions budget proves a hard cap only when the matching scope/SKU has `prevent_further_usage=true` and observed net amount reaches the budget amount. A user-scoped budget exposed by the current budget API is for Copilot AI credits, not personal Actions compute.
- GitHub's current model expresses included compute as a monetary amount shared by eligible private/internal runner compute and cloud-sandbox compute/memory. Standard runners in public repositories remain free independently and do not draw from that pool. Artifact/cache storage is a separate allowance and billing signal.

Official contracts:
- [GitHub Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions)
- [GitHub Actions billing and usage](https://docs.github.com/en/actions/concepts/billing-and-usage)
- [Billing usage REST API](https://docs.github.com/en/rest/billing/usage?apiVersion=2026-03-10)
- [Billing budgets REST API](https://docs.github.com/en/rest/billing/budgets?apiVersion=2026-03-10)

Exact-main verification for this correction:
- Portable AI Workflow Conformance: [45037803431](https://github.com/leminhphap26071995/github-oschestration/actions/runs/45037803431) — SUCCESS on code HEAD 6c9ae5ecb64f49b81fdf2bf98b604d17c49de74a.
- Credential Read Audit: [45037803508](https://github.com/leminhphap26071995/github-oschestration/actions/runs/45037803508) — SUCCESS on the same SHA.

No account budget, spending cap, quota, or private credential was changed.
