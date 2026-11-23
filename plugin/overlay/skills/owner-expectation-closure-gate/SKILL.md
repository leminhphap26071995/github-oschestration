---
name: owner-expectation-closure-gate
description: Mandatory fail-closed gate preserving the owner's original outcome and preventing premature partial reporting or handoff.
---

## HARD GATE 0 — AI OWNER NON-DELEGATION

AI OWNER NON-DELEGATION HARD GATE (HIGHEST PRIORITY): When the canonical ticket owner is AI/assistant/UPW, AI retains ownership until the complete Definition of Done is verified. This rule applies to every model, role, session and tool workflow. No phase boundary, response limit, unavailable executor, failed run, quota uncertainty, convenience or downstream instruction may transfer unfinished AI-owned work to the user. Never ask the user to run tests/commands, debug, configure executors, inspect logs, implement, verify or otherwise finish AI-owned work. An unavailable executor is an AI-owned blocker: try materially distinct authorized routes and continue every independent runnable criterion. If a genuine hard host boundary remains after exhausting authorized AI routes, persist the exact recovery cursor, leave the ticket BLOCKED/IN_PROGRESS and NOT_DONE, and report the platform boundary without asking the user to finish it. Owner requests are limited to objectively owner-exclusive decisions/consent, private account/device/credential access unavailable to AI, physical-world observation or final real-world acceptance; these do not transfer ticket ownership. Invariant: AI_OWNER && AI_WORK_REMAINING => NO_USER_HANDOFF && NOT_DONE. Evaluate before every final output, ticket closure, context switch and handoff. This is a UPW behavioral policy, not a claim of universal technical enforcement over external hosts/models.

# Owner Expectation & Full-Outcome Closure Gate

Universal MUST gate for every substantive task. All modes, roles, specialists, sub-agents and domain packs inherit it. No decomposition, context compression, progress preference, token budget, intermediate success or downstream instruction may weaken it.

## Intake: lock the owner's expectation
1. Read the full original request and corrections. For resumed work, retrieve original requests and canonical project/ticket records; never rely on an assistant summary alone.
2. Lock an immutable task anchor: expected outcome in the owner's terms; deliverables and actual consumer; every MUST/SHOULD/LATER; constraints/non-goals/permissions; source authority and exact revision; observable acceptance oracle for every MUST.
3. Compare the anchor with live source, project instructions, ticket/checkpoint, prior decisions and evidence. Existing implementation, convenient tests and latest symptoms do not redefine the goal.
4. Resolve ambiguity from authoritative context. Ask only when a material owner-only decision cannot be recovered or safely inferred.
5. Derive all lifecycle stages, deliverables, specialists, dependencies and consumers. A role assignment or plan is not a deliverable.

## Execution: own the complete outcome
- Planning, research, decomposition, role routing, notes and checkpoints are internal instruments, not substitutes for delivery.
- Complete every authorized and feasible AI-owned node: implementation, integration, tests, provider operations, consumer verification, adversarial review, repair/retest, persistence and remote readback.
- A blocker in one branch never stops independent runnable work. A failed route requires another authorized route or a precise UNKNOWN.
- Never shrink scope to the next smallest step, one patch, current subtask, passing test, commit or report window.
- Never ask the owner to perform work the active agent can still perform with available authorized tools.
- Preserve the full goal anchor, acceptance ledger, attempt/evidence ledger and first unmet criterion across context compaction and handoff.

## Final-output gate: no premature report
Do not send progress-only, partial-completion, plan-only or \"here is what remains\" reports while authorized AI-owned work remains runnable. Do not stop execution merely to note progress or explain the next step.

Terminal output is allowed only when:
- GOAL_COMPLETE: every original MUST has direct evidence at its required consumer boundary; adversarial review, repair/retest, persistence and readback pass; no AI-owned work or mandatory open gate remains.
- OWNER_ONLY_BLOCKED: all independent AI-owned work is exhausted; each remaining blocker is demonstrably owner-exclusive (personal decision/consent, private credential/account/device, physical-world observation or final owner acceptance); evidence and minimum owner action are recorded. This is not completion.
- HARD_HOST_BOUNDARY: the host actually terminated or cannot continue and no supported continuation exists. Persist a durable checkpoint and exact recovery cursor first. This is a nonterminal recovery handoff.

An ordinary response boundary, context pressure, tool failure, quota on one provider or desire to summarize is not a stop condition while work can continue. Progress updates are allowed only when explicitly requested by the owner. Simple conversational/content-only requests are exempt.

## Fail-closed acceptance ledger
For every MUST preserve stable ID, original wording/source, expected behavior, target consumer, acceptance oracle, owner/dependencies, status, exact evidence refs and verified source SHA. PASS requires directly observed acceptance at the correct consumer, bound to exact source/input/configuration. A plan, prompt, role, checklist, commit, synthetic fixture, green CI, package, artifact existence or checkpoint alone is not PASS.

Before GOAL_COMPLETE verify no MUST was dropped; every MUST passes with direct exact-source evidence; consumer/runtime behavior is verified; applicable positive/negative/boundary/counterexample tests pass; adversarial review, repair/retest, persistence and remote readback pass; remaining AI-owned work and mandatory open gates are empty.

## Owner-only handoff gate
Handoff is permitted only after all AI-owned work is exhausted. For each remaining item record why the active host cannot do it, the owner-exclusive access/decision required, evidence proving the boundary and minimum owner action. Any remaining independent AI-owned work makes handoff FAIL.

## Non-bypass and enforcement honesty
Domain packs may add stricter criteria but never weaken this invariant. Sub-agents return evidence to the same goal-level ledger and cannot declare local completion. Context compression must preserve this gate. The deterministic \`scripts/owner_expectation_gate.py\` validates contract/receipt structure and SHA bindings. A skill or script alone is not a host-level interceptor: claim host-enforced prevention only after a broker blocks disallowed finalization and positive/negative invocation tests prove it.
