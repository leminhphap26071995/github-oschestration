# GitHub Actions cost and usage collector

This directory contains the read-only collector and report enrichment used by the existing private monitoring workflow. It reads GitHub billing REST APIs; it does not modify monitored organizations or repositories.

## Separate signal: per-workflow GitHub REST API rate-limit telemetry

The public repository's `.github/workflows/github-api-usage-monitor-smoke.yml` is the focused smoke integration of [hesreallyhim/github-api-usage-monitor](https://github.com/hesreallyhim/github-api-usage-monitor) v2.1.0, pinned to release commit `52198b2c0a112e8647664f4042ae301e718ad7df`. The same pinned action is also integrated into the real `actions-run-diagnostics.yml` workflow-run, annotation-readback, and scheduled private-target jobs.

- It monitors the authenticated token's REST API rate-limit buckets during one workflow job and writes a per-job Step Summary.
- Diagnostics are enabled; the action uploads `state.json` and `poll-log.json` as a run-scoped artifact for inspection.
- It uses only the job's built-in `GITHUB_TOKEN`, with no additional repository permissions, PAT, App private key, or secret. The smoke workflow makes one controlled authenticated repository-metadata GET after the action's main step so the post hook can demonstrate an observed core-bucket delta.
- The action supports Linux and macOS runners; this smoke workflow uses Ubuntu.
- The action's poller queries `GET /rate_limit`; it measures API request-rate-limit usage, not Actions runner minutes, artifact storage billing, or organization spending budgets.
- The action's polling data is sampled and may include other concurrent jobs sharing the same token's rate-limit pool. It is telemetry, not an exact per-step accounting ledger. Its own documentation also warns that `/rate_limit` may report a 5,000-request authenticated-user bucket while the special `GITHUB_TOKEN` limit is 1,000 requests per repository per hour; the action reports the API response transparently and does not normalize that discrepancy. Treat absolute `remaining` values as raw API-reported bucket data, not the effective GITHUB_TOKEN ceiling.

### Candidate decision

- **Selected for telemetry:** `hesreallyhim/github-api-usage-monitor` because it reports per-bucket usage over the job lifecycle and can retain poll diagnostics for review.
- **Not adopted:** `Coderrob/github-rate-limit-check`. It provides a one-shot threshold gate rather than usage-over-time telemetry; its current composite action interpolates the token into a shell command argument, and its script uses `curl -s` without `--fail`/HTTP-status validation. That is weaker for a least-privilege, secret-conscious diagnostic path and duplicates only a simple snapshot that the selected monitor already reports.

This integration supplements the private billing collector below. It must never be used to classify Actions quota exhaustion or replace billing API evidence.

## First-stage workflow credential audit

The separate `.github/workflows/quota-token-permission-audit.yml` workflow verifies the built-in, short-lived `GITHUB_TOKEN` available to a GitHub Actions job. It is deliberately limited to read access:

- `actions: read` — inspect workflow runs and jobs.
- `checks: read` — inspect check runs and annotations.
- `contents: read` — read workflow/source files and receipts.
- `metadata: read` is implicit; all other permission keys are `none`.

The workflow prints the declared permission contract and read-only API probe results to the job log and step summary. It never prints the token, uses no PAT or GitHub App private key, and performs no write, billing, cleanup, cancellation, or deletion operation. It is triggered automatically only by changes to its own workflow, script, tests, README, or the conformance workflow on `main`; it has no manual dispatch path.

Important distinction: GitHub's `X-Accepted-GitHub-Permissions` response header identifies what an endpoint requires, not what the token was granted. `GITHUB_TOKEN` is a GitHub App installation token, so absence of the classic OAuth `X-OAuth-Scopes` header is not evidence of zero permissions. The explicit job-level `permissions` block is the grant contract for this workflow; API probes verify the read paths used by the next quota-monitor stage. Public-repository read success is not a complete token-permission inventory.

This first-stage audit does not inspect billing usage or decide whether Actions quota is exhausted. Those are separate later steps.

## Unified GitHub Actions lifecycle and quota observer

`.github/workflows/actions-run-diagnostics.yml` is the single automatic observer workflow. It has two entry paths:

1. `workflow_run` on requested and completed events for an explicit allowlist of repository workflows.
2. A 15-minute schedule that polls explicitly configured private targets from a public-repository runner.

For workflow-run events, the observer runs on the trusted default branch, validates the source run against the event payload, and fetches the exact source workflow blob at the source SHA as data. It never checks out or executes the triggering branch. On a requested event it polls up to four times at 15-second intervals until a runner/step appears or the source run completes; the completed event then captures terminal evidence.

The collector retrieves:
- Exact run and attempt metadata.
- Attempt-scoped jobs and their raw runner_id/runner_name field states.
- Job Check Run IDs and all annotation pages.
- Workflow Check Suite IDs, Check Runs, outputs, and annotations, including the zero-job case.
- Job logs with bounded retries and Retry-After handling.
- Exact source workflow actionlint diagnostics and source-file SHA-256.

The separate readback job waits for collection, then retrieves the actual Check Run annotations from the observer's diagnose job. The final artifact contains both the sanitized source diagnostic receipt and the observer annotation readback. Raw job logs are read in memory only; they are not printed or persisted.

The scheduled private-target job reads PRIVATE_MONITOR_TOKEN and PRIVATE_TARGETS_JSON only from repository Secrets. The private token is referenced only inside this schedule job, never in the workflow_run observer. The token needs Actions: read, Checks: read, Contents: read, and Metadata: read for every configured target. The target list must use opaque aliases and explicitly define expected workflow paths and trigger expectations:
- every_push only when the workflow truly runs on every push to the configured branch.
- schedule with an explicit expected interval for scheduled workflows.

Path-filtered or conditional triggers are not inferred. When an expected run is absent after the grace window, the monitor fetches the exact workflow file at the branch SHA and runs actionlint. A parser diagnostic can prove malformed YAML; otherwise the result is NO_RUN_OBSERVED with UNKNOWN cause. A missing run is never converted into quota exhaustion.

The private-target report deliberately redacts repository names, workflow paths, branch names, SHAs, run IDs, raw logs, and provider messages before uploading to this public repository. It emits only opaque target/workflow aliases, lifecycle status, classification, and evidence types. Missing credentials produce BLOCKED, not a healthy zero.

The pinned API usage monitor action runs at the beginning of observer jobs:
- GITHUB_TOKEN telemetry for workflow-run collection, annotation readback, and the public scheduled observer.
- PRIVATE_MONITOR_TOKEN telemetry only when that secret is configured in the scheduled private-target job.

These state/poll-log artifacts measure REST API rate-limit buckets. They do not measure included Actions minutes, runner billing, artifact-storage quota, or organization spending caps.

### Evidence classification rules

- ACTIONS_BILLING_QUOTA_EXHAUSTED requires an explicit provider billing/spending/included-usage message in a Check Suite, annotation, or trusted log, or a separately verified hard-cap state.
- ACTIONS_ADMISSION_BLOCKED requires explicit repository/organization policy evidence.
- ACTION_RUNTIME_RETIRED_OR_UNSUPPORTED identifies deprecated/unsupported action runtimes and runner compatibility.
- WORKFLOW_YAML_SYNTAX_ERROR and WORKFLOW_SCHEMA_OR_EXPRESSION_ERROR require parser/provider evidence tied to the exact workflow source or a real parser Check Run annotation.
- STEP_IMPLEMENTATION_FAILURE and STEP_FAILURE require an executed failing step and its evidence.
- STATIC_ANALYSIS_WARNING preserves ShellCheck/actionlint/linter findings separately.
- API_RATE_LIMITED is separate from Actions compute/billing quota.
- RUNNER_NOT_ASSIGNED_YET, OBSERVATION_WINDOW_IN_PROGRESS, LOG_PUBLICATION_PENDING, and UNKNOWN are lifecycle/evidence states, not quota proof.

A generic 403/404/429, runner_id=0, empty jobs/steps, BlobNotFound, missing run, or aggregate usage total never proves Actions quota exhaustion. Collector API failures remain separate from source workflow failures.

The public repository's standard GitHub-hosted runners do not consume included private-repository Actions minutes. This provides an independent compute path for configured private targets, but it is not independent of account suspension or GitHub-wide service outages.

See [GITHUB-ACTIONS-OBSERVABILITY-ARCHITECTURE.md](../docs/GITHUB-ACTIONS-OBSERVABILITY-ARCHITECTURE.md) for the complete evidence and security contract.

## Official source of truth

- Billing usage REST API: https://docs.github.com/en/rest/billing/usage
- Automating billing usage reports and account-level authorization: https://docs.github.com/en/billing/tutorials/automate-usage-reporting
- Product and SKU identifiers: https://docs.github.com/en/billing/reference/product-and-sku-names
- Actions billing, runner rates and storage accounting: https://docs.github.com/en/billing/concepts/product-billing/github-actions

## API endpoints and attribution

The collector uses GET /users/{username}/settings/billing/usage/summary and GET /organizations/{org}/settings/billing/usage/summary, filtered to product=Actions and the current billing month.

It also preserves the endpoint's repository-filtered usage data for the repositories returned by the owner-scoped inventory. Repository totals are attributed only when the API query succeeds. A missing token or denied request is UNKNOWN, never zero.

The enhanced billing usage-report endpoints (.../settings/billing/usage) can return repositoryName, but GitHub documents them as available only on the enhanced billing platform. The current collector uses the summary API; if repository-level attribution is not returned, it does not fabricate it.

The usage summary is public preview and only exposes the previous 24 months. GitHub can change this contract.

## Authorization: personal account plus one GitHub App for organizations

The private CI workflow uses these secrets:

- USER_BILLING_TOKEN: a fine-grained personal token for the personal account with Plan: read and Metadata: read for the personal repositories being inventoried.
- GITHUB_APP_ID and GITHUB_APP_PRIVATE_KEY: one GitHub App used to obtain short-lived organization installation tokens.

Configure the GitHub App with organization Administration: read. Metadata: read is the implicit read-only repository metadata permission. Install the App on each organization to monitor and grant access to all repositories if repository-level inventory is required. The App installation access token is minted during each CI run and expires after one hour. No per-org token secret is stored.

GitHub's endpoint-specific reference for the usage summary API explicitly supports fine-grained tokens: Plan: read for user billing and Administration: read for organization billing, including GitHub App installation tokens. The separate enhanced usage-report endpoint is only available on the enhanced billing platform; the automation tutorial's migration section recommends classic PATs for that report endpoint. Do not generalize that note to the summary endpoint used here. The workflow follows the summary endpoint's least-privilege contract and preserves HTTP status plus X-Accepted-OAuth-Scopes on failures.

The workflow's built-in GITHUB_TOKEN is separate: it only writes the dashboard to the private reporting repository and is not used for billing.

## Organization discovery and scale

targets.json is an explicit include list for coverage overrides. At runtime, prepare_app_tokens.mjs discovers all organizations where the GitHub App is installed, merges them with the explicit list, and mints an installation token for each available organization. Newly onboarded organizations require one App installation/authorization, not a new PAT or manually managed token secret. An organization without an App installation is recorded as APP_NOT_INSTALLED.

## Data semantics and limitations

- Linux, Windows and macOS are reported separately by SKU and minute unit.
- Artifact/shared storage, cache storage and custom image storage are reported separately by SKU and the unit GitHub returns.
- grossQuantity, discountQuantity and netQuantity are shown only when returned by the API.
- Storage billing accrues over time; current stored bytes and accrued billable storage are different measurements.
- Organization budgets are configuration; observed spend is compared using the returned Actions netAmount.
- Missing credentials, unsupported token types, denied billing roles or API errors remain UNKNOWN/PARTIAL.

## Private dashboard

The existing private workflow writes only:

- ops/github-actions-usage/dashboard.md
- ops/github-actions-usage/usage-latest.json
- ops/github-actions-usage/usage-history.json

No billing data is written to this public repository or printed in workflow logs. The private workflow runs daily and on scoped configuration changes. It has no workflow_dispatch path.

## Tests

Run:
  python -m unittest discover -s quota-monitor/tests -p 'test_*.py' -v
  node --test quota-monitor/tests/test_app_tokens.mjs
  node --test quota-monitor/tests/test_token_permissions.mjs
  node --test quota-monitor/tests/test_diagnostics.mjs
