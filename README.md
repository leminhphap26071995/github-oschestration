# Unified AI Workflow Architecture — GitHub Orchestration

Portable, content-neutral orchestration across projects, domains and hosts, cloned from the canonical ai-workflow-archtiecture source at commit 15c7dcf0613b18b7d376e70224cbec16e0bf2626.

The reusable architecture, schemas, tests, domain packs and UPW plugin overlay are retained. Source-project .ai-workflow checkpoints are intentionally not copied; this repository starts with an empty project context index.

## Core contracts

- Final Goal: docs/FINAL-GOAL.md
- AI Architecture Workflow: AI-ARCHITECTURE-WORKFLOW.md
- Professional Capability Architecture: docs/PROFESSIONAL-CAPABILITY-ARCHITECTURE.md
- Context Isolation and Project Switching: docs/CONTEXT-ISOLATION-AND-PROJECT-SWITCHING.md
- GitHub Actions Run Lifecycle: docs/GITHUB-ACTIONS-RUN-LIFECYCLE.md
- Execution Environment and Quota Governance: docs/EXECUTION-ENVIRONMENT-AND-QUOTA-GOVERNANCE.md
- UPW Plugin Release Packaging: docs/PLUGIN-RELEASE-PACKAGING.md

## GitHub Actions quota dashboard

quota-monitor/ contains the read-only billing collector and tests. The scheduled workflow and dashboard live in an existing private account repository, not in this public source repository. No additional report repository is required.

The dashboard covers the personal account and explicitly configured organizations, including public and private repositories. It reports total, included/discounted and billable Actions minutes, net billed amount, and organization Actions budget enforcement. Missing billing access is UNKNOWN, never zero. This public repository does not store billing data, private repository names, or credentials.

See quota-monitor/README.md for the collector contract and private-runner setup.

## CI/CD

- conformance.yml: structural validation and regression tests.
- package-upw-plugin.yml: validates and packages the versioned UPW plugin overlay as an artifact.
- The account-level Actions monitor runs from the existing private operations repository; this public repository contains only reusable collector source.

All workflows in this repository use automatic triggers only; no workflow_dispatch is included. Standard GitHub-hosted runners are used because this repository is public.

## Context model

The root .ai-workflow/CURRENT.json is an index only. Project and ticket checkpoints are created in their own context when work begins. Never select context by latest modification time.
