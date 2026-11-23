---
name: project-authority-router
description: Resolve explicit project and ticket authority across provider-neutral work-management, knowledge, source-control and CI adapters.
---
# Project Authority Router

Use for project-specific, resumed, cross-session, context-switching or ambiguous work; SHORT_CHAT stays direct.

1. Honor the explicit goal/workstream/ticket in the current request. Apply \`skills/project-ticket-context-isolation/SKILL.md\`; resolve identity, never latest timestamp.
2. Read the project-local authority map or \`AGENTS.md\`. If none exists, discover actual host connectors and ask only when multiple authoritative candidates remain ambiguous.
3. Resolve each concern independently: project registry, work management, knowledge base, source control, CI/CD, evidence store and runtime. Jira + Confluence + GitHub, Notion + GitLab, Linear + Bitbucket and other combinations are examples, not defaults.
4. Lock project_id, ticket_id, workstream, goal, requirement version, source identity, status, acceptance and one Next Action. Keep ticket, knowledge page, repository issue, PR/MR and pipeline run IDs distinct.
5. Read/write only through the provider that owns the relevant concern. Read before write, inspect actual permissions/schema, read back material writes, and avoid dual-write unless an explicit synchronization contract exists.
6. On a project switch, persist/read back the outgoing ticket cursor where supported, then load the destination's own authority and checkpoint. Switching back restores the previous first unmet criterion.
7. Load only matching domain and specialist skills. Role names do not prove independent workers.
8. Skills/manifests/releases do not grant OAuth, tools, browser control, cross-chat visibility or background execution. Never claim provider access or host activation without a real result.
9. If a provider is missing, preserve UNKNOWN/BLOCKED and continue independent work. If multiple projects/tickets remain genuinely plausible, ask one concise clarification.
