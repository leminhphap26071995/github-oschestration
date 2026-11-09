# GitHub Actions cost and usage collector

This directory contains the read-only collector and report enrichment used by the existing private monitoring workflow. It reads GitHub billing REST APIs; it does not modify monitored organizations or repositories.

## Official source of truth

- Billing usage REST API: https://docs.github.com/en/rest/billing/usage
- Automating billing usage reports and account-level authorization: https://docs.github.com/en/billing/tutorials/automate-usage-reporting
- Product and SKU identifiers: https://docs.github.com/en/billing/reference/product-and-sku-names
- Actions billing, runner rates and storage accounting: https://docs.github.com/en/billing/concepts/product-billing/github-actions

The collector retains the billing API's SKU, unit type, quantity and cost. The enrichment step separates:

- Linux runner SKUs: actions_linux*
- Windows runner SKUs: actions_windows*
- macOS runner SKUs: actions_macos*
- Actions artifact/shared storage: actions_storage
- Actions cache storage: actions_cache_storage
- Custom runner image storage: actions_custom_image_storage

Unknown Actions SKUs remain visible in the original usage rows. Storage quantities keep the API-returned unit (for example GB-hours); storage is never added to runner minutes. netAmount is the API-reported billed amount. Discounted usage is not a remaining balance.

## API endpoints and attribution

The collector uses GET /users/{username}/settings/billing/usage/summary and GET /organizations/{org}/settings/billing/usage/summary, filtered to product=Actions and the current billing month.

It also preserves the endpoint's repository-filtered usage data for the repositories returned by the owner-scoped inventory. Repository totals are attributed only when the API query succeeds. A missing token or denied request is UNKNOWN, never zero.

The enhanced billing usage-report endpoints (.../settings/billing/usage) can return repositoryName, but GitHub documents them as available only on the enhanced billing platform. The current collector uses the summary API; if repository-level attribution is not returned, it does not fabricate it.

The usage summary is public preview and only exposes the previous 24 months. GitHub can change this contract.

## Authorization: personal account plus one GitHub App for organizations

A repository admin/owner role alone does not grant billing access. User billing requires the account holder; organization billing requires an organization owner or billing manager.

The private CI workflow uses these secrets:

- USER_BILLING_TOKEN: a fine-grained personal token for the personal account with Plan: read and Metadata: read for the personal repositories being inventoried.
- GITHUB_APP_ID and GITHUB_APP_PRIVATE_KEY: one GitHub App used to obtain short-lived organization installation tokens.

Configure the GitHub App with organization Administration: read. Metadata: read is the implicit read-only repository metadata permission. Install the App on each organization to monitor and grant access to all repositories if repository-level inventory is required. The App installation access token is minted during each CI run and expires after one hour. No per-org token secret is stored.

GitHub's current REST endpoint reference lists fine-grained token support for billing (Plan: read for users; Administration: read for organizations, including App installation tokens). Its billing automation tutorial still says fine-grained PATs are unsupported and recommends classic PATs. This is an official-documentation discrepancy. The workflow follows the endpoint reference for least privilege and preserves HTTP status plus X-Accepted-OAuth-Scopes on failures; it does not silently widen permissions. Verify the actual token against the live endpoint before treating the integration as operational.

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
