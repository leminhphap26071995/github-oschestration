---
name: project-ticket-context-isolation
description: Enforce project- and ticket-scoped context selection, persistence, switching and recovery across unrelated workstreams.
---
# Project and Ticket Context Isolation

## Purpose
Prevent state leakage when the owner switches among projects, tickets, domains or work modes. A checkpoint is selected by explicit identity and authority—not recency, account-wide activity or whichever task was handled last. The routing invariant is `NEVER_LATEST_TIMESTAMP`.

## Identity contract
Every durable execution context is keyed by:
`PROJECT_ID | WORKSTREAM_TYPE | TICKET_ID/GOAL_ID | DOMAIN | REQUIREMENT_VERSION | SOURCE_AUTHORITY | REPO/REF/SHA | ACCEPTANCE | NEXT_ACTION`.

Project and ticket identity are mandatory for resumable project work. A role assignment, source lock, acceptance ledger, deadline or Next Action belongs only to its owning context unless an explicit cross-project dependency is recorded.

## State hierarchy
- Root `.ai-workflow/CURRENT.json`: index of project IDs and project checkpoint paths only. It must not contain a global active task, role, domain or Next Action.
- `.ai-workflow/projects/<project-id>/CURRENT.json`: project summary and ticket index.
- `.ai-workflow/projects/<project-id>/tickets/<ticket-id>/CURRENT.json`: ticket-specific execution cursor and acceptance ledger.
- External systems remain authoritative for their own state: Notion project/ticket records, GitHub source/receipts, provider/runtime observations and host settings.

## Resolution algorithm
1. Parse the current user request for an explicit project, workstream, ticket, goal or target.
2. Preserve the established current-conversation workstream only when the request clearly means continue that work.
3. Resolve persistent repository/branch through the owner-controlled routing registry; a one-off target never changes persistent routing.
4. Load only the matching project checkpoint and ticket checkpoint. Validate every identity field against the requested context and live source.
5. If the project is explicit but ticket is ambiguous, inspect that project's ticket index and source references; ask one short question only if multiple candidates remain genuinely plausible.
6. Never choose a checkpoint because it has the newest `updated_at`, is at repository root, or was edited in the previous turn.

## Switching procedure
1. Finish the current safe operation and persist the outgoing ticket cursor to its own canonical store.
2. Read back the outgoing write when the store supports readback; otherwise mark it UNSAVED.
3. Resolve and load the destination project's own checkpoint and exact ticket.
4. Verify destination source/ref/SHA and load only its matching domain and role bundles.
5. Keep both projects open in their own states. Switching does not close, complete, overwrite or migrate the outgoing project.
6. On switching back, recover the original ticket's first unmet acceptance criterion—not the most recent task from another project.

## Isolation invariants
- Game Mod, VS Code Extension, Career/Interview (including Papaya campaigns), AI Architecture, and other workstreams use separate project IDs and ticket checkpoints.
- Same owner, repository account, plugin or conversation does not imply shared task state.
- Cross-project dependencies must be explicit, typed and source-linked; they do not merge checkpoints.
- Project-level status cannot overwrite ticket-level evidence. A project index is not a substitute for a ticket cursor.
- Chat history and memory are discovery hints only. Live sources and validated checkpoint identity take precedence.

## Required negative tests
- Game Mod A → VS Code Extension B → Game Mod A restores A's source lock, roles, acceptance and Next Action.
- VS Code Extension → Career/Interview Papaya → VS Code Extension restores the VS Code ticket, not the interview campaign.
- Two tickets in one project do not overwrite each other's cursors.
- A forged ticket with a different project_id or domain is rejected.
- A newer timestamp in an unrelated project never changes routing.
- Ambiguous `continue` across multiple plausible workstreams asks for clarification instead of guessing.

## Acceptance
Pass only when identity validation and routing are enforced by the active state resolver, mutations are namespaced, readback succeeds, and positive/negative switching tests pass. A document, schema or root index alone is not proof of host enforcement or successful context recovery.
