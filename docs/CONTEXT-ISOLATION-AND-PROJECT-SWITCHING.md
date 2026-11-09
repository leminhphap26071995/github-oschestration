# Context Isolation and Project Switching Contract

The root .ai-workflow/CURRENT.json is a context index only. It must never contain one global active project, task, role, domain or Next Action.

State hierarchy:
- .ai-workflow/CURRENT.json: index of project IDs and project checkpoint paths only.
- .ai-workflow/projects/<project-id>/CURRENT.json: project summary and ticket index.
- .ai-workflow/projects/<project-id>/tickets/<ticket-id>/CURRENT.json: ticket recovery cursor and acceptance ledger.

Every checkpoint locks CONTEXT_ID, PROJECT_ID, WORKSTREAM_TYPE, TICKET_ID, DOMAIN, GOAL_ID, REQUIREMENT_VERSION, SOURCE_AUTHORITY and exact REPO/REF/SHA.

Resolve project and ticket from the explicit request first. If the user says continue, use the current conversation's established workstream only when unambiguous. If multiple workstreams are plausible, ask which one. NEVER_LATEST_TIMESTAMP: never select a checkpoint because it was modified most recently.

Before switching, persist the outgoing ticket cursor and read it back when supported. Then load the destination project's own checkpoint, verify its live source and load only its domain and role bundles. Switching never closes or overwrites the previous project.

Game Mod, VS Code Extension, Career/Interview and other workstreams must have separate project IDs and checkpoints. No role, source lock, acceptance ledger or Next Action may leak across them unless an explicit cross-project dependency is declared.

Acceptance sequences: Game Mod A -> VS Code B -> Game Mod A; VS Code -> Career Interview Papaya -> VS Code; two tickets within one project; ambiguous continue across projects; stale SHA reconciliation. Each must resume the correct source, roles, criteria and Next Action.

Project routing registry selects persistent repository/branch. Project work board owns mutable ticket state. GitHub owns versioned source and technical receipts. A checkpoint is a pointer, not proof.

A **project checkpoint** and a **ticket checkpoint** are separate recovery records. The project checkpoint indexes its tickets; each ticket checkpoint owns its own requirement version, source lock, acceptance ledger and Next Action. A project-level summary must not replace the ticket checkpoint when resuming implementation.
