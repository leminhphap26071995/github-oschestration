# Central Actions quota monitor

## Operating contract

This repository owns exactly one scheduled quota monitor. It runs every 30 minutes on this public repository's standard ubuntu-latest GitHub-hosted runner. Standard hosted runner compute for public repositories is free; larger runners remain billable. The monitor uploads no artifacts and stores no private source payloads. GitHub API rate limits still apply.

Organizations are discovered from the authenticated user's active memberships with one GitHub App User Access Token (UAT). No App installation is required per organization or repository. The same UAT is used for personal and organization billing, repository inventory, Actions runs, jobs and checks. An organization without billing-admin access or with an app-policy restriction is NO_ACCESS and remains ineligible.

## One-time GitHub App setup

Create one GitHub App and enable Device Flow. Generate an expiring User Access Token and refresh token using Device Flow with offline_access. Do not install the App in each organization.

Read permissions:
- User: Plan read
- Organization: Administration read
- Repository: Actions read, Checks read, Contents read, Metadata read

The authenticated user must be an organization billing administrator for the billing usage summary endpoint. Organization third-party app restrictions may require approval; the monitor does not bypass them.

## One-time repository Actions secrets

- GITHUB_APP_CLIENT_ID
- GITHUB_USER_ACCESS_TOKEN
- GITHUB_USER_REFRESH_TOKEN
- SECRET_ROTATION_TOKEN — fine-grained PAT scoped only to this repository with Secrets:write
- NOTION_API_TOKEN — integration shared with the configured private quota and annotation pages

The UAT remains read-only. The secret-writer PAT is used only to rotate this repository's two UAT secrets. The workflow refreshes after a 401, persists the new refresh token first, then the new access token. No App private key, installation ID, per-org PAT, per-repository secret or per-repository CI is needed.

## Discovery and collection

quota-monitor/targets.json contains exclusions only. Active organizations are discovered dynamically through GET /user/memberships/orgs. One user token is reused for all authorized organizations.

The collector reads the owner-level Actions usage summary and one organization budget endpoint per organization. It fetches repository-level usage only for repositories with an Actions repository-scoped budget. All other repositories are NOT_COLLECTED_BY_DESIGN, never zero. The billing summary API does not expose remaining included compute; no remaining-minute balance or percentage is inferred.

## Notion routing states

- FREE_TIER_AVAILABLE: fresh successful run on an exact standard GitHub-hosted runner in a public repository.
- AVAILABLE_VERIFIED: fresh successful standard runner evidence for a private/internal repository with billing collection and owner state clear.
- QUOTA_EXHAUSTED: exact provider quota annotation or applicable enforced budget.
- REPORTED_QUOTA_EXHAUSTED: owner-reported paid quota; private/internal repositories remain blocked.
- NO_ACCESS, PERMISSION_DENIED, API_RATE_LIMITED, NOT_CONFIGURED, UNKNOWN, STALE: ineligible.

Larger GitHub-hosted runners and self-hosted runners do not qualify for the free public standard-runner exception. Exact repository provider quota evidence and an explicit repository hard cap override that exception. Freshness is 60 minutes; annotation lookback is one day.

## Data-placement boundary

The public repository contains only generic monitor code and non-secret configuration. Private repository names, billing records and run receipts are sent to the configured private Notion pages, not committed or uploaded as public artifacts. Never log token values or publish private payloads to this repository.
