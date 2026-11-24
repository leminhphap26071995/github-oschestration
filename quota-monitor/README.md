# GitHub Actions quota and repository-routing monitor

This repository is the **single central quota-monitor CI**. It discovers the personal account and every eligible organization where the GitHub App is installed, collects Actions usage/budgets at account and repository scope, reads exact provider-owned Actions annotations, and publishes the routing snapshot to Notion.

The workflow runs on a public GitHub-hosted standard runner. Private billing and repository data is sent directly to the private Notion control page. It is never committed to this public repository, printed in logs, or uploaded as an Actions artifact.

## What the monitor verifies

- Personal-account Actions usage through `GET /users/{username}/settings/billing/usage/summary?product=Actions`.
- Organization Actions usage and budgets through the organization billing summary and budget APIs.
- Per-repository Actions usage for every discovered repository.
- Recent successful workflow-run evidence (freshness window: 30 minutes).
- Exact provider-owned `GitHub Actions` check-run annotations. If `annotations_count > 0`, the relay reads the annotation receipt. `runner_id=0` and terminal `steps=[]` are recovery triggers, never quota conclusions by themselves.
- Owner-reported exhaustion stored in Notion. A report remains blocking until a later explicit `CLEARED` owner record is added.

An empty usage response is **UNKNOWN**, not zero. A budget that is below its hard cap does **not** prove included Actions minutes remain. The monitor only labels a repository `AVAILABLE_VERIFIED` when a successful workflow run is observed inside the freshness window and no owner/provider/budget exhaustion signal overrides it.

## One-time setup — no per-repository configuration

### 1. GitHub App (organization inventory)

Configure one GitHub App with read-only permissions:

| Permission | Access |
|---|---|
| Administration | Read |
| Actions | Read |
| Checks | Read |
| Contents | Read |
| Metadata | Read (implicit) |

Install the App on each organization to monitor and select **All repositories**. The CI discovers installations automatically and enumerates repositories; newly created repositories are included without adding per-repo config. The protected organization `huyquanghan-apps` is excluded in `targets.json` and cannot be added by installation discovery.

Add these repository Actions secrets to `leminhphap26071995/github-oschestration`:

- `GITHUB_APP_ID`
- `GITHUB_APP_PRIVATE_KEY`

The App installation permissions must be approved by each organization owner/admin after the permission update.

### 2. Personal-account token

Create one fine-grained PAT scoped to all repositories owned by the personal account, with read-only permissions:

- Plan: Read (personal Actions usage summary)
- Metadata: Read (repository inventory)
- Actions: Read
- Checks: Read
- Contents: Read

Store it as `USER_BILLING_TOKEN`. No organization or per-repository token map is required; the GitHub App handles organization installations.

### 3. Notion integration

Create one Notion integration token with:

- Read content
- Update content
- Read comments
- Insert comments

Share the GM-51 quota-control page and GM-50 annotation-receipt page with the integration. Store the token as `NOTION_API_TOKEN`. The two page IDs and freshness policy are non-secret configuration in `notion-targets.json`; do not create one page/config per repository.

## Repository discovery and routing

`targets.json` intentionally has an empty `organizations` list. `prepare_app_tokens.mjs` discovers all organization installations and mints short-lived installation tokens. An installation with `repository_selection != all` is reported as partial coverage.

The Notion page property **Quota Routing Snapshot** is refreshed every monitor run. Full evidence is added as a Notion comment when routing state changes and at least once every six hours.

Routing states:

| State | Meaning | May a ChatGPT session select it? |
|---|---|---|
| `AVAILABLE_VERIFIED` | Recent successful workflow run within 30 minutes; no stronger exhaustion signal | Yes, after requirement-to-repository mapping |
| `NEAR_LIMIT` | Configured hard-cap budget reached the 80% alert threshold | Prefer another eligible repository |
| `QUOTA_EXHAUSTED` | Provider annotation or enforced hard cap proves exhaustion | No |
| `REPORTED_QUOTA_EXHAUSTED` | Owner-reported; awaiting provider confirmation/owner clearance | No |
| `UNKNOWN`, `STALE`, `NOT_CONFIGURED` | No current availability proof | No |
| `PERMISSION_DENIED`, `API_RATE_LIMITED` | Collection incomplete | No |

Quota is a routing constraint, not a repository-selection policy. UPW must first resolve the requirement's authorized repository; it may only choose an alternative when Notion's requirement-to-repository map permits it. Never route private payloads to a public repository merely because its runner is available.

## CI layout

`.github/workflows/github-actions-quota-monitor.yml` is the one central monitor CI. It runs every 15 minutes and contains the repository conformance/quality checks for push and pull-request events. It does not subscribe to `workflow_run`, avoiding the previous observer fan-out.

The redundant `actions-run-diagnostics`, API-usage smoke, token-permission audit, standalone conformance, and standalone workflow-quality workflows are consolidated into this workflow. The independent UPW package-release and explicit workflow-cleanup automations remain separate; they are not quota monitors.

## Local tests

```bash
python -m unittest discover -s quota-monitor/tests -p 'test_*.py' -v
node --test quota-monitor/tests/*.mjs
node scripts/workflow-quality-gate.mjs
```

## Authoritative API references

- [GitHub REST API — billing usage summary](https://docs.github.com/en/rest/billing/usage)
- [GitHub REST API — billing budgets](https://docs.github.com/en/rest/billing/budgets)
- [GitHub Apps — installation access tokens](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-an-installation-access-token-for-a-github-app)
