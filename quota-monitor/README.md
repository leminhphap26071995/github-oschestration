# Actions usage monitor

A small scheduled collector for the personal account and explicitly configured Organizations. It uses GitHub's Billing Usage Summary API, enumerates private repositories, and queries usage per repository. The report is written only to a separate **private** report repository; this source repository is public.

## What it reports

- Actions usage by account/Organization and private repository.
- Total consumed minutes (`grossQuantity`), included/discounted minutes (`discountQuantity`), billable minutes (`netQuantity`) and net billed amount, with SKU/unit detail in `usage-latest.json`.
- Organization Actions hard-cap status when a billing budget is configured and the budget API is available.
- Daily snapshots in `usage-history.json` and a GitHub-rendered Markdown dashboard in `README.md` of the private report repository.

The usage summary API reports total, discounted/included and billable quantities, but does **not** expose the remaining included-minute allowance. The dashboard therefore never invents a remaining balance or percentage. `UNKNOWN` means the API did not establish the value; it does not mean zero usage or quota available.

## One-time setup

Create a private repository for the report, for example `github-usage-dashboard`. Do not point this at the public source repository.

In `github-oschestration` → Settings → Secrets and variables → Actions:

- Repository variable `QUOTA_MONITOR_ENABLED` = `true` (set this only after all secrets below exist).
- Secret `REPORT_REPOSITORY` = `owner/private-report-repo`.
- Secret `REPORT_TOKEN` = fine-grained token with `Contents: write` only on the private report repository.
- Secret `USER_BILLING_TOKEN` = fine-grained token for the personal account with `Plan: read` and `Metadata: read` for the account's private repositories.
- Secret `ORG_BILLING_TOKENS_JSON` = JSON object mapping each Organization owned by the account to its own token. Each token is created with that Organization as resource owner and has `Administration: read` plus `Metadata: read` for its private repositories. Example shape (use real tokens only in GitHub Secrets, never in this file):

```json
{"owned-org-a":"TOKEN_A","owned-org-b":"TOKEN_B"}
```

Only add Organizations the account owns and is authorized to bill-monitor. This explicit token map is the allowlist; app installations or repository visibility alone do not prove Organization ownership. Add a token when a new owned Organization should be monitored.

## Workflow

`.github/workflows/actions-usage-monitor.yml` runs daily and when monitor code/config changes on `main`. It uses only a standard `ubuntu-latest` runner. Standard GitHub-hosted runners are free and unlimited for public repositories. There is no `workflow_dispatch`.

The workflow is disabled until `QUOTA_MONITOR_ENABLED=true`. It checks out the private report repository, runs the collector, then commits the generated Markdown/JSON there. It does not upload usage data as a public artifact or print private repository metrics in public logs.

## API and permissions

- Personal account summary: `GET /users/{username}/settings/billing/usage/summary?product=Actions` (`Plan: read`).
- Organization summary: `GET /organizations/{org}/settings/billing/usage/summary?product=Actions` (`Administration: read`; caller must have billing access).
- Per-private-repository usage: same summary endpoint with `repository=owner/repo`.
- Organization budget: `GET /organizations/{org}/settings/billing/budgets` (`Administration: read`). A hard cap is reported only when `prevent_further_usage=true` and spend has reached the configured budget.

The usage summary endpoint is public preview and limited to the previous 24 months. GitHub's endpoint reference lists fine-grained PAT support, while its automation tutorial currently says billing usage endpoints do not support fine-grained PATs. The collector records authentication/permission errors as `UNKNOWN`; verify token compatibility against the live endpoint before enabling scheduled collection. Never replace least-privilege read access with broad write permissions just to suppress a 403.

## Plugin update boundary

The plugin workflow validates and packages `plugin/overlay/` as a versioned ZIP artifact. The current Plugin Creator integration is a ChatGPT-side action, not an API that this GitHub Actions workflow can invoke. After reviewing the artifact SHA and contents, use the Plugin Creator update action with the current release ID. A successful package job is not proof that the live plugin was updated or activated.
