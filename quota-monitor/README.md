# GitHub Actions usage collector

This directory contains the reusable, read-only collector for the GitHub Billing Usage Summary API. The scheduled runner and generated dashboard are hosted in an existing private account repository; there is no need to create another report repository.

## Coverage and metrics

- Personal account and configured organization billing owners.
- All repositories returned by authorized owner-scoped inventory endpoints, including public and private repositories.
- Total consumed Actions minutes (grossQuantity), included/discounted minutes (discountQuantity), billable minutes (netQuantity), and net billed amount.
- Organization Actions budgets, including hard-cap enforcement. Budget spend is calculated from observed netAmount in the usage summary; the budgets endpoint returns configuration, not spend.

The usage summary is a public-preview API limited to the previous 24 months. It does not expose remaining included-minute allowance. The dashboard never invents a remaining balance or percentage. Missing token, permission, or API access is UNKNOWN, not zero.

## Private runner configuration

In the existing private operations repository, configure these Actions secrets:

- USER_BILLING_TOKEN: fine-grained token for the personal account with Plan: read and Metadata: read.
- ORG_BILLING_TOKENS_JSON: JSON map from each configured organization login to a token created with that organization as resource owner and Administration: read plus Metadata: read for its repositories.

Example secret value shape (replace with real token values in GitHub Secrets only):

    {"organization-a":"TOKEN_A","organization-b":"TOKEN_B"}

The private runner also stores targets.json, which defines the organization coverage list. A missing token for a configured owner creates an UNKNOWN row; it does not silently remove that owner from the dashboard.

Authentication documentation discrepancy: the billing endpoint reference lists fine-grained PAT and GitHub App token support, while GitHub's automation tutorial still says billing usage endpoints require a classic PAT. This collector uses documented least-privilege fine-grained permissions and records HTTP_403 as UNKNOWN. Do not broaden permissions merely to suppress an error; verify the live endpoint and use a separately authorized billing-capable token if GitHub rejects the token type.

## Dashboard destination

The private workflow writes only to its own private repository:

- ops/github-actions-usage/dashboard.md
- ops/github-actions-usage/usage-latest.json
- ops/github-actions-usage/usage-history.json

No billing data is written to this public source repository or printed in public workflow logs. The private workflow runs daily and on scoped configuration changes. It has no manual dispatch path.

## Local tests

    python -m unittest discover -s quota-monitor/tests -v
