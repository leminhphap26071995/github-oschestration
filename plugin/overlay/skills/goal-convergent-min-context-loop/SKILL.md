---
name: goal-convergent-min-context-loop
description: Understand the core concept before planning, route through minimal Notion context, continuously compare implementation with the ticket goal, schedule real executors from Git Tree ownership, and preserve concise role progress.
---
# Goal-Convergent, Minimal-Context Engineering Loop

This skill composes with goal-first-execution, context-switching-lifecycle, universal-context-graph-workflow, team-orchestration, workflow-contract and session-continuity. It does not create a second project resolver, status schema or worker runtime.

## 1. Core concept before plan

For every substantive task, understand what concept the owner's requirements express before designing technical changes. Build a compact CORE_CONCEPT_CARD:
- CORE_CONCEPT: underlying domain/system concept and behavior.
- WHY / USER_OUTCOME: why it matters and what becomes true for the user.
- DOMAIN_MODEL: actors/entities, state/lifecycle, input -> transformation -> output.
- INVARIANTS: truths that must hold in normal, failure and recovery paths.
- REQUIREMENT_MEANING: semantic meaning of every MUST; separate goal from examples, symptoms and implementation hints.
- SUCCESS_ORACLE: observable evidence at the real consumer.
- UNKNOWN: only material gaps unresolved by authoritative sources.

Then translate the card into versioned technical requirements and map every MUST to acceptance. Do not plan from the last symptom. Research canonical docs/source when the concept is unclear. Ask only for a consequential owner-exclusive ambiguity. Keep SHORT_CHAT and simple writing lightweight.

## 2. Minimum-context route

1. Read Project Introduction for purpose and the Notion route only; it is not repository authority.
2. Search Notion for UPW — Context Switching & Domain Context Registry and resolve exact project/ticket.
3. Read only the compact ticket route card and latest progress comments. Recover CORE_CONCEPT, MUST IDs/version, primary role/WP, requirement-to-repository relationship, exact repo/ref/SHA, ticket/requirement/WP/session states, first unmet criterion, blocker and next action.
4. Load the primary role's complete four-artifact bundle. Load supporting bundles only when requirements demand them.
5. Inspect the Git Tree at exact ref/SHA; locate relevant files, tests, callers and dependencies. Fetch only those blobs and direct dependencies. Expand retrieval only when evidence, acceptance or a blocker requires it.

The route card is an index, not a substitute for original requirements or raw evidence. Preserve exact IDs, errors, SHAs, negative evidence and acceptance while compressing repeated prose. Notion comments are the primary append-only progress history; properties and route cards are compact current-state projections.

## 3. Plan versus implementation versus goal

The original owner goal and MUST ledger are immutable unless the owner changes them. The plan is a mutable hypothesis. After every material action compare:
1. PLAN: intended source/state change;
2. ACTUAL: what changed at exact ref/SHA;
3. EXPECTED: predicted behavior/acceptance effect;
4. OBSERVED: actual tool/test/provider/consumer result;
5. GOAL GAP: each MUST as VERIFIED, OPEN, FAILED, BLOCKED or UNKNOWN;
6. NEXT: earliest causal repair or READY action advancing the complete Definition of Done.

Record drift, regressions, missing dependencies and failed hypotheses. Update the plan to reflect evidence; never weaken or redefine acceptance to make implementation appear complete. A green subtask, commit, test, CI run or response boundary is not goal convergence.

## 4. Git-Tree-derived executor fan-out

For multi-file or multi-discipline work, inspect the exact Git Tree and relevant dependency/call graph to derive package boundaries and non-overlapping read/write sets. Build a requirement-linked DAG and schedule all READY independent packages. Target concurrency is min(READY independent packages, real authorized executors available, resource/concurrency budget); it is not a fixed count.

Each executor needs a distinct actual invocation/context, role bundle, requirement subset, source SHA, owned paths, expected output and receipt. Use separate branches/worktrees only when the host supports them. Git Tree identifies source boundaries; it does not spawn workers or ChatGPT sessions. If no additional real executor exists, the current AI executor continues READY packages sequentially and does not claim a swarm. One Tech Lead integrates results and resolves interface conflicts. A blocked package does not block unrelated READY work.

## 5. Notion progress comments

Notion ticket comments are the primary append-only progress stream. After material work, append a role-scoped PROGRESS or SESSION UPDATE with project/ticket, requirement version, role, WP, requirement IDs, status, completed action, expected vs observed result, exact evidence, first unmet criterion, blocker and next action. Do not post no-op comments for routine tool activity. Page properties/route cards remain compact state projections. The user-facing output only summarizes these comments.

## 6. Owner-facing reporting — completion only

Execution progress is internal. For any substantive task, keep requirements, role routing, planning, tool calls, checkpoints, tests and intermediate results inside the execution loop. Do not emit live WritingBlocks, progress tables, phase summaries, partial results, routine recaps or permission-to-continue questions while AI-owned requirements remain runnable.

- Notion comments remain append-only durable role progress and evidence history when the project workflow requires them.
- GitHub remains the versioned technical source and records commits, tests, CI and artifacts.
- ChatGPT conversation output is not a progress stream. Do not mirror routine Notion/GitHub updates into chat.
- At goal completion, provide one integrated result against the original goal and every MUST. Create exactly one final WritingBlock only when the owner requests a structured report or the active project contract requires one; create it after execution, never as a live feed.
- If a genuine hard host boundary remains after exhausting independent AI-owned work, persist/read back the exact recovery cursor and report only the precise nonterminal blocker. Never transfer AI-owned work to the owner.
- SHORT_CHAT remains natural 1:1 dialogue with progressive disclosure and no unsolicited project artifacts.

## 7. Temporary output and session survival

TEMPORARY_OUTPUT is a nonterminal yield/checkpoint event, never FINAL_OUTPUT or goal completion. Align with contracts/session-survival.md: yield before 3 external tool calls, before about 20 seconds of anticipated silence, immediately before a slow/uncertain call, and again after a slow/uncertain call before chaining another external call.

At a forced yield, update the existing live progress WritingBlock using the same ID. Update only verified completed steps, the active role's current action (<=10 words), exact blocker/first unmet criterion, and next step. Do not create the former three-sentence yield message or another chat progress message.

Persist changed durable state before yielding; otherwise verify the existing cursor remains resumable. The WritingBlock is a UI projection and never replaces Notion comments or source evidence. A new UPW-tagged user turn resumes the same ticket, role and first unmet criterion; do not restart or ask whether to continue.

Textual/artifact output is an early-yield signal, not a guarantee against physical host timeout. A plugin cannot interrupt one tool invocation that exceeds the host timeout or continue in the background after host termination. Never fake timers, use no-op calls as pings, or claim background execution. Preserve the exact recovery cursor and resume on the next user-triggered turn.

## 8. Completion

Continue the engineering loop while authorized AI-owned work remains runnable. Do not stop at plan, ticket, role assignment, report, commit, test or CI. Close only after every original MUST is implemented and verified at its required consumer, all feasible AI-owned work is exhausted, adversarial review and repair/retest are complete, and material Notion/GitHub/Plugin writes are read back. If a genuine external boundary remains, preserve the exact cursor and leave the ticket non-Done.
