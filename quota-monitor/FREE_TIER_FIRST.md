# Free-tier-first central quota monitor

## Goal
One monitor runs on a public GitHub repository using standard GitHub-hosted runners, discovers organizations reachable by one authenticated user, and publishes a fail-closed routing snapshot to Notion. No per-target-repository or per-organization monitor installation.

## Cost and placement rules

| Execution path | GitHub Actions compute | Routing rule |
|---|---:|---|
| Public repository + standard GitHub-hosted runner | Free / unlimited | Preferred when data-placement rules permit |
| Private/internal repository + standard GitHub-hosted runner | Uses billing owner's included compute | Require fresh availability evidence and no owner/budget block |
| Larger GitHub-hosted runner | Billable, including on public repositories | Never assume free |
| Self-hosted runner | Infrastructure cost is external/unknown | Not automatically eligible |
| Unknown runner class or stale evidence | Unknown | Fail closed |

The monitor runs on ubuntu-latest in this public repository. It does not upload artifacts, cache private payloads, or copy private source/evidence into the public repository. Private repository inventory and receipts are written only to configured private Notion pages. GitHub API rate limits still apply.

## One-token organization discovery
Use one GitHub App User Access Token (UAT) created through Device Flow with offline_access. The App is not installed in each organization. Discover active memberships through GET /user/memberships/orgs and reuse the same UAT for personal and organization billing, repository inventory, Actions runs, jobs, and checks.

Required app permissions:
- User: Plan read
- Organization: Administration read
- Repository: Actions read, Checks read, Contents read, Metadata read

Only organizations where the authenticated user is an administrator and organization policy permits the App can return billing evidence. Other organizations are NO_ACCESS / PERMISSION_DENIED. Do not create per-organization installations to work around denied access. Organization third-party app approval remains a security boundary.

## Expiring-token lifecycle
GitHub user access tokens expire after eight hours; refresh tokens rotate and expire after six months. The monitor refreshes only after the current UAT returns 401. It writes the new refresh token first, then the new access token to repository Actions secrets. The only credential allowed to write secrets is a fine-grained PAT scoped to this central repository with Secrets write; it has no target-organization permissions. The App UAT remains read-only.

## One-time repository secrets
- GITHUB_APP_CLIENT_ID
- GITHUB_USER_ACCESS_TOKEN
- GITHUB_USER_REFRESH_TOKEN
- SECRET_ROTATION_TOKEN — fine-grained PAT, this repository only, Secrets write
- NOTION_API_TOKEN

No App private key, App installation ID, per-org PAT, or per-repository configuration is required.

## Fail-closed routing states
- FREE_TIER_AVAILABLE: fresh successful run on an exact standard GitHub-hosted runner in a public repository; owner-level paid-quota exhaustion does not consume this free path.
- AVAILABLE_VERIFIED: fresh successful standard runner evidence for a private/internal repository, with billing collection and owner state clear.
- QUOTA_EXHAUSTED: exact provider billing annotation or enforced applicable budget.
- REPORTED_QUOTA_EXHAUSTED: owner-reported paid quota; blocks private/internal repositories until explicit clear or provider evidence changes.
- NO_ACCESS, PERMISSION_DENIED, API_RATE_LIMITED, NOT_CONFIGURED, UNKNOWN, STALE: ineligible.
- A successful run cannot override a current collection error for private/internal repositories.
- A public free-runner exception cannot override exact repository provider quota evidence or an explicit repository hard cap.
- runner_id=0, empty steps, missing logs, and generic errors are not quota evidence.

## API efficiency
- One organization membership discovery per scheduled run.
- One owner-level Actions usage summary and one organization budget read per discovered organization.
- Per-repository billing usage only for repositories with Actions repository-scoped budgets; others are NOT_COLLECTED_BY_DESIGN, never zero.
- Annotation/recent-run observation uses a one-day lookback; successful-run eligibility is bounded by 60 minutes.
- One scheduled monitor workflow; no per-repository quota workflows.
