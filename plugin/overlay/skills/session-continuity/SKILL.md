---
name: session-continuity
description: Resume interrupted work from the correct project and ticket checkpoint, immutable goal anchor, live source and exact recovery cursor.
---
# Session Continuity — Recover the Right Goal Without Filling Gaps

## Truth boundary
This skill cannot keep a ChatGPT turn running after host termination, inspect hidden/other conversations without a supported authorized tool, schedule itself, or perform background work. Continuity comes from verified external records and a compact recovery capsule, not model confidence.

## At start or resume
1. Identify the explicit project/workstream and ticket/goal. Apply `skills/project-ticket-context-isolation/SKILL.md`; never choose a project because its checkpoint is newest.
2. Load `skills/goal-anchored-context-integrity/SKILL.md` and recover the original user expectation, immutable MUST criteria, scope/non-goals and goal version/digest.
3. Resolve persistent repository/branch through the Notion Routing Registry, then lock project_id, ticket_id, workstream_type, domain, repo/ref/SHA and canonical checkpoint path.
4. Read only the matching project and ticket checkpoint, then inspect live source, issue/ticket, project instructions, deterministic gates, tests, receipts and runtime evidence. Reconcile contradictions; current verified source beats stale plans/summaries.
5. Recover every original acceptance criterion, actual changes/evidence, failed attempts, rollback, first unmet criterion and one Next Action. Do not restart verified work or ask the owner to repeat recoverable context.
6. If the original goal, source identity or acceptance cannot be recovered, stop consequential action and mark the gap UNKNOWN. Never fabricate the missing bridge.
7. If multiple equally plausible projects/tickets remain and source lookup cannot resolve them, ask one short question.

## Switching projects or tickets
Persist and read back the outgoing ticket cursor before switching when supported. Load the destination's own checkpoint and roles; do not overwrite, close or transfer outgoing state. Switching back must restore the prior ticket's source lock, acceptance and Next Action. Game Mod, VS Code Extension and Career/Interview Papaya must never share a global active checkpoint.

## Compact resume capsule
`PROJECT_ID | WORKSTREAM_TYPE | TICKET_ID/GOAL_ID/VERSION/DIGEST | ORIGINAL_EXPECTATION | MUST_IDS | SCOPE/NON_GOALS | SOURCE_LOCK | VERIFIED_EVIDENCE+PROVENANCE | FAILED_ATTEMPTS | OPEN_GATES | LAST_ACTION/RESULT | ROLLBACK | FIRST_UNMET_CRITERION | NEXT_ACTION | STORE/READBACK_TIME`.

Keep the capsule source-linked, small and non-secret. Never store passwords, OAuth tokens, cookies, API keys or confidential customer data unless the canonical store and authorization explicitly allow it.

## During long work
- Checkpoint after material change/test/readback, at interruption boundaries, or before risky waits—not as empty status narration.
- Record exact source SHA/release/run/test/artifact IDs and next runnable action.
- Compress repetition, not the goal, requirements, source identity, provenance, open gates or recovery cursor.
- On scope/source/revision mismatch or an open challenge, stop dependent mutation, recover canonical contract and resolve the mismatch. Continue independent safe tasks.
- If a write capability is missing, mark UNSAVED; never claim persistence. Read back real remote writes.

## Context-break and correction trigger
When the owner says context is lost, a workflow name is wrong, the answer repeats, or a premise is challenged, treat it as a context-integrity incident. Recover the original goal and exact execution cursor from authoritative sources. Compare expected step -> actual tool action -> observed result; fix the earliest mismatch. A failed retrieval path is not a failed investigation: inspect endpoint, scope, pagination, attempt and permissions, then try another authorized route. Never use a hypothesis to reconstruct missing facts.

## Failure revalidation
After the first failed attempt, re-anchor to the original goal before retry. Before a second attempt or after a second failure of the same method, revalidate all MUSTs, source lock and prior evidence; change method/evidence route. Invoke project deterministic gates exactly as required. No third identical attempt without new evidence.

## Terminal gate
Before handoff, enumerate remaining research, implementation, test, verification and repair nodes and run every feasible authorized AI-owned node. If the host terminates the turn, the next turn must recover from the verified capsule; do not promise automatic self-resumption or background execution.
## Temporary output and 30-second heartbeat — owner requirement (2026-11-20)

TEMPORARY_OUTPUT is a nonterminal progress event. It is not FINAL_OUTPUT, goal completion, a handoff, or permission to stop the engineering loop.

- During an explicitly requested long-running Deep Work session, use a 30-second wall-clock heartbeat while the active host provides both a reliable clock and a nonterminal textual-output mechanism.
- At each interval, emit one concise TEMPORARY_OUTPUT summarizing only the actions and observed results since the previous heartbeat. Include elapsed session time, current requirement/phase, verified result, and the next concrete action. Do not expose hidden reasoning, credentials, private data, or speculative progress.
- The heartbeat must leave the task open and execution continuing. Never set a terminal/final state, ask whether to continue, or stop merely because a temporary update was emitted.
- If the host supports a distinct progress/log surface, render a bold primary status line and a separate muted pale-background log entry. Otherwise use plain text. Plugin instructions cannot force ChatGPT UI colors or create a new UI surface.
- If the host does not expose a reliable timer or nonterminal output event, record HOST_HEARTBEAT_UNAVAILABLE; do not fake a 30-second clock, use no-op tool calls as pings, invoke unsupported timers, or send a terminal final message as a substitute. Continue all runnable work, checkpoint at material changes and before risky waits, and resume from the exact cursor after a genuine host boundary.
- FINAL_OUTPUT is allowed only after every feasible authorized AI-owned requirement is verified, or when a concrete owner-only/hard host blocker remains and its recovery cursor is persisted. A response boundary is not proof of completion; it is also not a guarantee of background execution after host termination.

Notion evidence: the owner-provided ChatGPT screenshot recorded in Universal AI Workflow Architecture — ChatGPT Runtime shows one session processed for 74m 10s and resumed the correct Mega Man X4 checkpoint. Treat this as evidence that this duration occurred once, not as a guaranteed runtime limit, a guarantee for every future session, or proof of hidden background execution.