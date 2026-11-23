---
name: provider-adapter-routing
description: Resolve project, ticket, knowledge, source-control, CI/CD and evidence authorities through the actual provider adapters available in the active host.
---
# Provider Adapter Routing

Use for any project-specific, resumed, ticket, documentation, repository, CI/CD or external-service task. Keep the universal workflow independent from provider brands.

## Resolve authorities by concern
Identify the configured provider for project routing, work management, knowledge base, source control, CI/CD, evidence storage and runtime/product consumption. Providers may differ: Jira + Confluence + GitHub, Notion + GitLab, Linear + Bitbucket, or local files plus a hosted CI service are examples, not defaults.

## Discover the real adapter
1. Inspect the active host's available connector/MCP/API tools and exact schemas.
2. Verify provider identity, authenticated account, scopes, project/repository, pagination and read/write permissions.
3. Select one canonical provider per concern. Do not dual-write unless the project defines an explicit synchronization contract.
4. If a provider is not connected or unavailable, do not invent an API or simulate results. Mark the capability UNKNOWN/BLOCKED and continue independent work.

## Preserve identity
Keep project, ticket, goal, requirement, repository, branch, commit SHA, change request and pipeline run IDs distinct. Link records using stable IDs/URLs and explicit relationships. A ticket key is not a repository issue number; a knowledge-base page is not a ticket.

## Read/write discipline
Read the canonical record before changing it. Inspect the exact write operation and permission boundary. Write only to the authority that owns the changed state. Read back material writes. Record exact errors. Never expose credentials or put them in manifests.

## Degraded mode
Use local project files only if the project explicitly declares them authoritative. Otherwise preserve missing state as UNKNOWN; do not silently replace a Jira/Confluence ticket with a README or GitHub issue. Continue independent source work.

Load provider-specific skills only after identifying the actual provider. GitHub Actions lifecycle instructions apply only when GitHub Actions is configured; do not reuse them for GitLab, Jenkins or Azure pipelines.
