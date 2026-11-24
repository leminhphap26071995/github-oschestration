# GitHub Orchestration

A public-safe automation repository. The single canonical GitHub Actions quota monitor lives here and publishes repository-routing evidence to Notion.

## Central Actions quota monitor

Workflow: .github/workflows/github-actions-quota-monitor.yml  
Implementation and one-time setup: quota-monitor/README.md

The monitor runs every 15 minutes and:

- Discovers repositories in every organization where the GitHub App is installed with all-repository access.
- Discovers repositories owned by the personal GitHub account through one user billing token.
- Collects Actions usage-summary and budget data at account, organization and repository scope where the API exposes it.
- Scans recent workflow runs across all branches, correlates exact run attempts and Check Runs, and retrieves provider annotations.
- Publishes exact or explicitly unmatched annotation receipts to the GM-50 Notion page and a routing snapshot to the GM-51 Notion page.
- Makes no per-repository configuration necessary. New repositories are discovered automatically; a new organization requires one App installation.

The quota snapshot is the routing control plane. Only a fresh AVAILABLE_VERIFIED repository may trigger Actions. That state requires a successful GitHub-hosted runner job within 30 minutes and no stronger owner, provider or hard-cap block. Self-hosted runs and historical green runs do not prove included-runner availability.

runner_id=0 and terminal steps=[] are annotation-recovery triggers, including when annotations_count is zero on the provider-owned GitHub Actions check. They are never quota classifications. A missing Notion receipt is NOTION_RELAY_RECEIPT_NOT_FOUND_FOR_EXACT_RUN; API_METHOD_BLOCKED is transport-only.

## Workflow inventory

| Workflow | Responsibility |
|---|---|
| github-actions-quota-monitor.yml | The only quota CI; scheduled collection plus validation on push and pull request |
| update-upw-plugin.yml | UPW plugin packaging and release automation |
| workflow-cleanup.yml | Explicit workflow cleanup automation |

The former separate diagnostics, conformance, workflow-quality, token-permission-audit and API-usage-smoke workflows have been consolidated into the central monitor's validation job. The duplicate private scheduled collector has been retired.

## Setup

Configure the four central secrets and the one-time GitHub App / Notion permissions described in [quota-monitor/README.md](quota-monitor/README.md). Do not add per-repository secrets, target files or scheduled workflows.

## API and evidence limitations

GitHub billing usage-summary APIs are public preview and may change. They expose usage and budget evidence, not a remaining included-compute balance. The monitor never derives a remaining-minutes percentage from usage totals. Missing, stale, permission-denied, rate-limited or otherwise unknown evidence fails closed; it is not interpreted as zero usage or available quota.

## Architecture and operating contracts

- [Quota monitor implementation and setup](quota-monitor/README.md)
- [Actions observability architecture](docs/GITHUB-ACTIONS-OBSERVABILITY-ARCHITECTURE.md)
- [Actions run lifecycle and annotation recovery](docs/GITHUB-ACTIONS-RUN-LIFECYCLE.md)
- [Execution environment and quota governance](docs/EXECUTION-ENVIRONMENT-AND-QUOTA-GOVERNANCE.md)
- [Notion-first repository and role control plane](docs/NOTION-FIRST-REPO-ROLE-CONTROL-PLANE.md)
- [Integrated workflow quality gate](docs/WORKFLOW-QUALITY-GATE.md)


## FREE_TIER_FIRST_CENTRAL_QUOTA_MONITOR

The central Actions quota monitor is free-tier-first: one public-repository workflow, one shared GitHub App User Access Token, no per-organization App installations, and fail-closed Notion routing. See quota-monitor/FREE_TIER_FIRST.md and quota-monitor/README.md.
