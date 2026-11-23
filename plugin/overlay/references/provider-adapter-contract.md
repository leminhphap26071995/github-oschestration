# Provider-Adapter Architecture — Vendor-Neutral Project Operations

## Purpose
Keep the reusable workflow independent from any one ticket tracker, knowledge base, source-control host, CI provider or evidence store. A project may use Jira + Confluence, Notion + GitHub, Linear + GitLab, Azure Boards + Azure Repos, or another combination. These are replaceable adapters, not workflow prerequisites.

The workflow core owns reasoning and invariants. Providers own their data and expose capabilities through the tools/connectors actually available in the active host. A provider name in a manifest is not proof of connection, permission or successful invocation.

## 1. Separate authorities by concern

| Capability | Authority owns | Example providers (not requirements) |
|---|---|---|
| Project routing / registry | Stable project identity, canonical workstream, repository and provider pointers | Project registry, Jira project directory, Notion registry, local manifest |
| Work management | Epics, tickets, requirements, status, owners, dependencies, decisions, Next Action | Jira, Linear, Azure Boards, GitHub Issues, Notion |
| Knowledge base | Long-form specifications, ADRs, runbooks, architecture notes and reference material | Confluence, Notion, SharePoint, Docs repository |
| Source control | Versioned source, branches, commits, reviews and merge requests | GitHub, GitLab, Bitbucket, Azure Repos |
| CI/CD | Pipeline definitions, runs, jobs, logs, artifacts and deployment receipts | GitHub Actions, GitLab CI, Jenkins, Azure Pipelines, Buildkite |
| Evidence storage | Durable, integrity-preserving outputs and attachments | Repository artifacts, ticket attachments, object storage, approved document store |
| Runtime / product | Actual behavior and consumer-visible outcomes | Target environment, service, device, browser or application |

A project can use different providers for each row. Do not assume the work-management provider also hosts source code or the knowledge base.

## 2. Core-to-adapter contract
Core workflows may request these abstract operations: `resolve_project`, `get_work_item`, `search_work_items`, `read_knowledge`, `get_source_state`, `read_change_request`, `list_pipeline_runs`, `get_run_evidence`, `store_evidence` and `read_back_evidence`. These are capability names, not assumed APIs or tool names. The active adapter maps them to actual tools and schemas. Discover the real tool, identity, scope, pagination, permissions and response contract before invocation. If an operation is unavailable, preserve the gap as `UNKNOWN` or `BLOCKED`; do not simulate success.

## 3. Authority resolution
1. Current user instruction owns current intent and authorization.
2. The project routing registry selects the persistent project/workstream and provider pointers.
3. The work-management provider owns mutable ticket lifecycle and acceptance state.
4. The knowledge-base provider owns long-form project knowledge.
5. The source-control provider owns versioned source and review history.
6. The CI/CD provider owns pipeline execution records.
7. The runtime/provider owns observed product behavior.
8. The evidence store owns retained artifacts and integrity metadata.

Use the local repository's `AGENTS.md`, project authority manifest or owner-provided source map to locate these authorities. If sources disagree, do not silently merge or choose the newest timestamp. Resolve by concern-specific authority and preserve the conflict.

## 4. Identity and relationship rules
- Keep `PROJECT_ID`, `WORKSTREAM_TYPE`, `TICKET_ID`, `GOAL_ID`, `REQUIREMENT_VERSION`, `REPO`, `REF`, `SHA`, `CHANGE_REQUEST_ID` and `RUN_ID` distinct.
- A Jira issue key is not a GitHub issue number. A Confluence page is not a ticket. A pull request is not the canonical acceptance record unless the project explicitly says so.
- Link records across providers using stable IDs/URLs and explicit relationship types; never infer identity from matching titles.
- Keep project and ticket checkpoints namespaced. A root index may list project pointers but must not contain one global active task.
- Never select a ticket/checkpoint by latest modified timestamp alone.

## 5. Read/write and synchronization policy
- Read the canonical record before updating it. Inspect the adapter's actual write schema and permissions.
- Mutate only the provider that owns the relevant concern. Avoid dual-write unless the owner explicitly defines a synchronization contract.
- Read back every material write and compare the returned state with the requested change.
- If readback is unavailable, record `UNVERIFIED_WRITE`; never claim persistence.
- Preserve source timestamps, revision IDs, pagination cursors and exact errors.
- Treat connector failure as failure of that access path, not proof the provider record is absent.

## 6. Degraded mode and portability
- If no external work-management or knowledge-base connector is available, use project-local files only when explicitly designated authoritative. Otherwise ask for the canonical export or mark the state `UNKNOWN`.
- Continue independent source inspection, design, coding and local verification that do not depend on the missing provider.
- Do not hardcode Notion, Jira, Confluence, GitHub or GitLab API calls into core workflow instructions.
- Provider-specific skills (for example GitHub Actions lifecycle) are optional adapters loaded only after the actual provider is identified.
- Credentials remain in the host's approved secret store. Never place tokens, cookies, API keys or OAuth material in manifests, prompts, logs or checkpoints.

## 7. Provider substitution example
A project can move from Notion work management to Jira + Confluence while retaining GitHub source control. Update the authority map and connect/verify the Jira and Confluence adapters; preserve project, ticket, goal, requirement and source SHA identities; reconcile/migrate records; then retire the old adapter only after owner confirmation. The universal goal, recovery and engineering workflows do not change.

## 8. Acceptance
Pass only when core workflow files contain no mandatory vendor-specific endpoint, database, issue-key or authentication assumption; each adapter is independently discovered and permission-checked; different providers can own work management, knowledge, source, CI and evidence; missing tools, insufficient scopes, ambiguous identity, pagination, failed writes and failed readback are handled; provider substitution preserves identity; and runtime activation is verified separately from manifests.
