---
name: session-continuity
description: Resume interrupted work from the correct project and ticket checkpoint, live source and exact recovery cursor.
---
# Session Continuity — Recover the Right Workstream

## Truth boundary
This skill cannot keep a ChatGPT turn running after host termination, inspect hidden/other conversations without a supported authorized tool, schedule itself, or perform background work. Continuity comes from verified external records and a compact recovery capsule, not model confidence.

## At start or resume
1. Identify the explicit project/workstream and ticket/goal. Apply `skills/project-ticket-context-isolation/SKILL.md`; never choose a project because its checkpoint is newest.
2. Resolve persistent repository/branch through the Notion Routing Registry, then lock project_id, ticket_id, workstream_type, domain, goal/requirement version, repo/ref/SHA and canonical checkpoint path.
3. Read only the matching project and ticket checkpoint, then inspect live source, issue/ticket, tests, receipts and runtime evidence. Reconcile contradictions; current verified source beats stale plans/summaries.
4. Recover original goal, scope/non-goals, every acceptance criterion, actual changes/evidence, rollback, first unmet criterion and one Next Action. Do not restart verified work or ask the owner to repeat recoverable context.
5. If multiple equally plausible projects/tickets remain and source lookup cannot resolve them, ask one short question.

## Switching projects or tickets
Persist and read back the outgoing ticket cursor before switching when supported. Load the destination's own checkpoint and roles; do not overwrite, close or transfer the outgoing state. Switching back must restore the prior ticket's source lock, acceptance and Next Action. Game Mod, VS Code Extension and Career/Interview Papaya must never share a global active checkpoint.

## Compact resume capsule
`PROJECT_ID | WORKSTREAM_TYPE | TICKET_ID/GOAL_ID | DOMAIN | SCOPE/NON-GOALS | SOURCE_LOCK | VERIFIED_EVIDENCE | OPEN_GATES | LAST_ACTION | ROLLBACK | NEXT_ACTION | STORE/READBACK_TIME`.

Keep the capsule source-linked, small and non-secret. Never store passwords, OAuth tokens, cookies, API keys or confidential customer data unless the canonical store and authorization explicitly allow it.

## During long work
- Checkpoint after material change/test/readback, at interruption boundaries, or before risky waits—not as empty status narration.
- Record exact source SHA/release/run/test/artifact IDs and next runnable action.
- On scope/source/revision mismatch or an open challenge, stop dependent mutation, recover canonical contract and resolve the mismatch. Continue independent safe tasks.
- If a write capability is missing, mark UNSAVED; never claim persistence. Read back real remote writes.

## Context-break and correction trigger
When the owner says context is lost, a workflow name is wrong, the answer repeats, or a premise is challenged, recover the exact ticket source and execution cursor. Compare expected step → actual tool action → observed result; fix the earliest mismatch. A failed retrieval path is not a failed investigation: inspect endpoint, scope, pagination, attempt and permissions, then try another authorized route.

## Terminal gate
Before handoff, enumerate remaining research, implementation, test, verification and repair nodes and run every feasible authorized AI-owned node. If the host terminates the turn, the next turn must recover from the verified capsule; do not promise automatic self-resumption or background execution.
