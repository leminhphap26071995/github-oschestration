# GitHub Actions Observability and Quota-Routing Architecture

## 1. Purpose

Provide one reusable control plane that answers two separate questions:

1. What quota, billing, budget and provider-failure evidence is known for each repository and its billing owner?
2. Is there recent evidence that the repository can execute on a GitHub-hosted runner?

The monitor publishes a Notion routing snapshot. ChatGPT sessions read that snapshot before selecting a repository or triggering GitHub Actions.

## 2. Single workflow boundary

The only quota CI is .github/workflows/github-actions-quota-monitor.yml.

- Schedule: every 15 minutes.
- Pull requests and pushes: run the validation job only.
- Scheduled event: run the central monitor job.
- No workflow_run fan-out, per-repository monitor, manual quota probe or duplicate daily collector.

Other workflows in this repository have separate responsibilities: UPW release automation and workflow cleanup. They are not quota collectors.

Validation is consolidated into the central workflow: Python tests, Node tests, token-permission contract checks, actionlint and the workflow/action quality gate.

## 3. Discovery model

### Personal account

USER_BILLING_TOKEN supplies personal repository inventory and the user-level Actions usage-summary request. It is a single account credential, not one token per repository.

### Organizations

A GitHub App installation is enumerated for each monitored organization. The monitor mints installation tokens with read access to Administration, Actions, Checks and Contents. The installation must select all repositories.

The monitor discovers repositories from each installation. A newly created repository is included automatically. A new organization requires one App installation; it does not require per-repository configuration.

Excluded organizations are maintained centrally in quota-monitor/targets.json.

## 4. Collection model

The collector requests Actions usage-summary data at personal-account, organization and repository scope where supported, and organization/repository budget data where available.

The collector preserves:
- billing owner, product, period, scope and repository identity;
- usage totals and budget/hard-cap state;
- pagination and collection status;
- permission, rate-limit and API errors as explicit states;
- missing usage rows as unknown, never as zero.

GitHub documents the billing usage-summary endpoints as public preview. The API does not provide a reliable remaining included-compute balance. The monitor therefore does not manufacture a percentage of remaining included minutes.

## 5. Run and annotation evidence

The observer scans recent workflow runs across all branches for the configured lookback window. It binds repository, branch/ref, head SHA, run ID, run attempt and Check Run identity.

- Successful runs inside the 30-minute availability window are inspected for job evidence.
- Availability is verified only by a successful GitHub-hosted runner job with a nonzero runner ID and hosted runner labels. Self-hosted jobs do not prove included GitHub-hosted availability.
- Recent failed runs are inspected for runner/job evidence. Older failures are still inspected when annotations or provider quota output are present.
- A provider-owned GitHub Actions Check Run with runner_id=0 or terminal steps=[] triggers annotation retrieval even when annotations_count is zero.
- Annotations are retrieved and correlated to the exact run attempt and Check Run. If correlation cannot be established, the raw annotation is still published as UNMATCHED_CHECK_RUN_CORRELATION; it is not promoted to quota evidence.
- Runner IDs, empty steps, missing jobs and missing logs never classify quota.

The annotation relay writes private evidence to the GM-50 Notion page. The routing snapshot is written to the GM-51 Notion page.

## 6. Routing state machine

Repository state is derived from explicit evidence, with owner-level state applied to every repository under that billing owner.

| State | Meaning | Routing |
|---|---|---|
| AVAILABLE_VERIFIED | Recent successful GitHub-hosted job, fresh snapshot, no stronger block | Eligible if requirement mapping and access permit |
| NEAR_LIMIT | At least 80% of an enforced budget hard cap | Fallback-only |
| QUOTA_EXHAUSTED | Explicit provider Actions billing evidence or enforced hard cap | Block owner/repository |
| REPORTED_QUOTA_EXHAUSTED | Explicit owner report | Block every repository under owner until CLEARED |
| UNKNOWN | No reliable availability or exhaustion evidence | Ineligible |
| STALE | Snapshot older than 60 minutes | Ineligible |
| NOT_CONFIGURED | Required collector or Notion integration unavailable | Ineligible |
| PERMISSION_DENIED / API_RATE_LIMITED / NOT_DISCOVERED | Evidence collection incomplete | Ineligible |

A recent success is an observation, not a guarantee of future capacity. The monitor never treats a budget below its hard cap, a historical green run or a self-hosted run as proof of current included-runner availability.

## 7. Notion contract

GM-51 exposes a compact Quota Routing Snapshot property and a full evidence comment. The snapshot includes observation time, freshness, discovery coverage, owner state, repository state and eligible repository list.

GM-50 stores exact annotation receipts. Every receipt carries repository/ref/SHA/run/attempt/Check Run identity, annotation count, retrieval state, annotation body and classification. Unmatched receipts remain explicitly unmatched.

Owner reports are separate from provider evidence. REPORTED_QUOTA_EXHAUSTED remains active until a later explicit CLEARED owner record is present.

## 8. Privacy and trust boundaries

- The public repository contains code and non-secret configuration only.
- Billing payloads, owner reports and annotation bodies are written to private Notion pages.
- Workflow logs contain status/count summaries, not raw billing payloads or credentials.
- Tokens are GitHub Actions secrets and are never written to artifacts or repository files.
- Notion is the mutable routing/evidence control plane; GitHub is the technical source and provider evidence source.

## 9. One-time setup

See quota-monitor/README.md for the exact GitHub App permissions, personal fine-grained token permissions, Notion integration permissions and page-sharing steps. No per-repository configuration is required.
