# Unified AI Workflow Architecture — GitHub Orchestration

Portable, content-neutral orchestration across projects, domains and hosts, cloned from the canonical ai-workflow-archtiecture source at commit 15c7dcf0613b18b7d376e70224cbec16e0bf2626.

The reusable architecture, schemas, tests, domain packs and UPW plugin overlay are retained. Source-project .ai-workflow checkpoints are intentionally not copied; this repository starts with an empty project context index.

## Core contracts

- Final Goal: docs/FINAL-GOAL.md
- AI Architecture Workflow: AI-ARCHITECTURE-WORKFLOW.md
- Professional Capability Architecture: docs/PROFESSIONAL-CAPABILITY-ARCHITECTURE.md
- Context Isolation and Project Switching: docs/CONTEXT-ISOLATION-AND-PROJECT-SWITCHING.md
- GitHub Actions Run Lifecycle: docs/GITHUB-ACTIONS-RUN-LIFECYCLE.md
- Unified Failure and Quota Observability: docs/GITHUB-ACTIONS-OBSERVABILITY-ARCHITECTURE.md
- Execution Environment and Quota Governance: docs/EXECUTION-ENVIRONMENT-AND-QUOTA-GOVERNANCE.md
- UPW Plugin Release Packaging: docs/PLUGIN-RELEASE-PACKAGING.md

## GitHub Actions quota dashboard

quota-monitor/ contains the read-only billing collector and tests. The scheduled workflow and dashboard live in an existing private account repository, not in this public source repository. No additional report repository is required.

The private billing collector remains a separate account-level data source. It is not an independent observer of its own runner admission and its billing credentials must be explicitly configured. The public repository also runs a scheduled, read-only observer for explicitly configured private targets using repository Secrets. Public standard runners do not consume included private-repository Actions minutes; private target names, SHAs, run IDs and raw logs are redacted from public artifacts.

The integrated observer combines real workflow_run lifecycle events, exact source-workflow parsing, attempt-scoped jobs, Check Suite/Check Run annotations, bounded job-log retrieval, annotation readback, and the pinned GitHub API usage monitor. API rate-limit telemetry is separate from Actions compute/billing quota. Missing private credentials or missing provider evidence remains BLOCKED/UNKNOWN, never zero or an inferred quota failure.

See quota-monitor/README.md for collector contracts and docs/GITHUB-ACTIONS-OBSERVABILITY-ARCHITECTURE.md for the end-to-end evidence model.

## CI/CD

- conformance.yml: structural validation and regression tests.
- workflow-quality-gate.yml: real workflow parser and action-runtime checks.
- actions-run-diagnostics.yml: lifecycle observer, annotation readback, API usage telemetry and scheduled private-target polling.
- package-upw-plugin.yml: validates and packages the versioned UPW plugin overlay as an artifact.
- The private account billing collector remains external; this public repository never stores private billing snapshots or credentials.

All workflows in this repository use automatic triggers only; no workflow_dispatch is included. Standard GitHub-hosted runners are used because this repository is public.

## Context model

The root .ai-workflow/CURRENT.json is an index only. Project and ticket checkpoints are created in their own context when work begins. Never select context by latest modification time.
