# Unified AI Workflow Architecture — GitHub Orchestration

Portable, content-neutral orchestration across projects, domains and hosts, cloned from the canonical `ai-workflow-archtiecture` source at commit `15c7dcf0613b18b7d376e70224cbec16e0bf2626`.

The reusable architecture, schemas, tests, domain packs and UPW plugin overlay are retained. Source-project `.ai-workflow` checkpoints are intentionally not copied; this repository starts with an empty project context index.

## Core contracts

- [Final Goal](docs/FINAL-GOAL.md)
- [AI Architecture Workflow](AI-ARCHITECTURE-WORKFLOW.md)
- [Professional Capability Architecture](docs/PROFESSIONAL-CAPABILITY-ARCHITECTURE.md)
- [Context Isolation and Project Switching](docs/CONTEXT-ISOLATION-AND-PROJECT-SWITCHING.md)
- [GitHub Actions Run Lifecycle](docs/GITHUB-ACTIONS-RUN-LIFECYCLE.md)
- [Execution Environment and Quota Governance](docs/EXECUTION-ENVIRONMENT-AND-QUOTA-GOVERNANCE.md)
- [UPW Plugin Release Packaging](docs/PLUGIN-RELEASE-PACKAGING.md)

## GitHub Actions quota dashboard

See [quota-monitor/README.md](quota-monitor/README.md). The scheduled collector reports Actions usage for the personal account and explicitly configured owned Organizations, including private-repository breakdown. Metrics are written only to a separately configured private report repository; this public repository never stores billing details or private repository names.

## CI/CD

- `conformance.yml`: structural validation and regression tests.
- `package-upw-plugin.yml`: validates and packages the versioned UPW plugin overlay as an artifact.
- `actions-usage-monitor.yml`: daily billing usage collection and update of the private Markdown dashboard.

All workflows use automatic triggers only; no `workflow_dispatch` is included. Standard GitHub-hosted runners are used because this repository is public.

## Context model

The root `.ai-workflow/CURRENT.json` is an index only. Project and ticket checkpoints are created in their own context when work begins. Never select context by latest modification time.
