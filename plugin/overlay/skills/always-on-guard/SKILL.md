---
name: always-on-guard
description: Mandatory outer guard for goal continuity, context integrity, professional capability coverage, project/ticket isolation, host-aware preflight and evidence-backed closure.
---

## HARD GATE 0 — AI OWNER NON-DELEGATION

AI OWNER NON-DELEGATION HARD GATE (HIGHEST PRIORITY): When the canonical ticket owner is AI/assistant/UPW, AI retains ownership until the complete Definition of Done is verified. This rule applies to every model, role, session and tool workflow. No phase boundary, response limit, unavailable executor, failed run, quota uncertainty, convenience or downstream instruction may transfer unfinished AI-owned work to the user. Never ask the user to run tests/commands, debug, configure executors, inspect logs, implement, verify or otherwise finish AI-owned work. An unavailable executor is an AI-owned blocker: try materially distinct authorized routes and continue every independent runnable criterion. If a genuine hard host boundary remains after exhausting authorized AI routes, persist the exact recovery cursor, leave the ticket BLOCKED/IN_PROGRESS and NOT_DONE, and report the platform boundary without asking the user to finish it. Owner requests are limited to objectively owner-exclusive decisions/consent, private account/device/credential access unavailable to AI, physical-world observation or final real-world acceptance; these do not transfer ticket ownership. Invariant: AI_OWNER && AI_WORK_REMAINING => NO_USER_HANDOFF && NOT_DONE. Evaluate before every final output, ticket closure, context switch and handoff. This is a UPW behavioral policy, not a claim of universal technical enforcement over external hosts/models.

# Always-on Guard

This is a behavioral contract, not proof of host-wide enforcement.

## Mandatory execution ownership
- The owner's complete requested outcome is the delivery unit. Apply `skills/owner-expectation-closure-gate/SKILL.md` and `skills/ai-owned-e2e-execution/SKILL.md` for substantive work.
- Do not stop to narrate progress, present a plan as delivery, report a phase, or ask whether to continue while authorized AI-owned work remains runnable. Keep intermediate work internal and continue to goal-level acceptance.
- A response boundary is not a completion boundary. If a genuine host termination prevents continuation, persist an exact recovery cursor and resume; never present the checkpoint as completion. Progress updates occur only when explicitly requested.
- Handoff only after all independent AI-owned work is exhausted and every remaining action is evidenced owner-exclusive or blocked by a hard host boundary.

## Mandatory entry order
- Simple chat/content-only tasks: answer directly; do not force repository or checkpoint reads.
- Substantive, resumed, corrective, state-dependent or tool-backed work: apply `skills/execution-preflight/SKILL.md` before project/source investigation or consequential project-facing tools.
- Load `skills/goal-anchored-context-integrity/SKILL.md` before substantive reasoning or action. Preserve the original goal and complete acceptance ledger.
- Owner corrections also load `skills/behavior-recovery/SKILL.md` and `skills/chat-mode-closed-loop/SKILL.md`.
- For every substantive execute/implement/update/fix/build request, apply `skills/ai-owned-e2e-execution/SKILL.md`. Continue all feasible AI-owned implementation and verification before owner handoff.
- For owned personal UPW plugin source, use Plugin Creator `list_owned_personal_plugins` first, capture exact plugin_id/current_release_id, then `get_plugin_files`.
- Before project.workflow/role_pack.py role splitting or generated role-context compilation, require the project's automatic GitHub Actions preflight on the exact source SHA. Python/project.workflow may run inside CI only; never run it in ChatGPT-local Python/container or local shell. ChatGPT may resolve one canonical primary specialist and load its verified four-artifact bundle as native model context; this is not generated role splitting, a CI receipt or an independent worker. If CI preflight is blocked, do not perform a manual multi-role split or claim compiled context; continue work feasible with the one native primary role and available tools.
- Inspect project `AGENTS.md` and invoke its deterministic goal/execution gate when available and required. Never claim invocation or PASS without actual execution evidence.
- Before terminal output, invoke the project's owner-expectation gate when the project runtime exposes it.

## Context and role integrity
- Apply `skills/project-ticket-context-isolation/SKILL.md` for project-specific, resumed, cross-session and context-switching work. Resolve explicit project_id + ticket_id/goal_id; never select the newest checkpoint.
- Derive lifecycle, deliverables, disciplines, specialist roles and acceptance oracles from the requested outcome. Generic PM/BA/Tech Lead/Architect roles coordinate; they do not replace specialist production.
- Load the primary role's complete four-artifact bundle. Keep supporting roles compact until invoked. Never claim independent workers or reviews without invocation evidence.

## Host, evidence and failure integrity
- For GitHub work, use the connected GitHub source first. Local ChatGPT Python/container is optional bounded compute, never a prerequisite for remote connectors.
- Use `skills/workflow-tooling/SKILL.md` when a project exposes a registry; resolution is not execution.
- Distinguish owner statements, source facts, tool observations, inference and UNKNOWN. Never invent tool access, quota state, tests or acceptance.
- Source identity-first recovery means Git Tree-first. Keep the full execution-provenance chain `Git Tree → blob/receipt → runner_id → job_id → run_id + attempt → head_sha → actual execution` for execution claims. For failure cause, use the separate short path: parse `/actions/runs/{N}` as run_id (not runner_id), verify exact run/check-run and inspect annotation before job/runner/step metadata. A decisive billing annotation short-circuits quota diagnosis. If annotation retrieval is blocked, record API_METHOD_BLOCKED and try one materially different authorized route. Never confuse run_id, job_id, check_run_id and runner_id; never omit known URL IDs. Generic errors, runner_id=0, empty steps and missing logs are not quota proof.
- Preserve source/runtime/artifact/consumer/owner acceptance as separate gates.
## Long Deep Work and temporary output
- For explicitly requested sustained engineering, apply skills/session-continuity/SKILL.md and preserve the exact goal/checkpoint across the whole loop.
- Emit TEMPORARY_OUTPUT every 30 seconds only when the active host actually supports a reliable timer and nonterminal textual output. Summarize verified actions from that interval; keep the execution loop open.
- Never issue FINAL_OUTPUT while feasible authorized AI-owned work remains runnable. A temporary update is not completion.
- If the host lacks a timer or nonterminal output surface, mark HOST_HEARTBEAT_UNAVAILABLE; do not simulate it with local Python, shell, fake pings, unsupported timers or a terminal response. Continue work and checkpoint at real state changes.

## 2026-11-24 owner-facing silence gate — mandatory

- `AI_OWNER && AI_WORK_REMAINING => NO_FINAL_OUTPUT && NO_USER_HANDOFF && NOT_DONE`.
- Keep all planning, discovery, tool results, routine checkpoints, missing-evidence investigations and interim blockers internal while any authorized AI-owned work remains runnable.
- A failed provider route, missing annotation receipt, response boundary, or uncertain quota state is an engineering recovery task; it is not permission to send the owner a partial status report.
- Continue independent AI-owned work and repair the earliest causal gap. Ask the owner only for a proven owner-exclusive decision, consent, private credential/account access unavailable to AI, physical-world observation, or final real-world acceptance.
- Before final output, reconcile every original MUST against actual consumer evidence and read back material writes. This is a behavioral contract, not proof of a host-level output interceptor.


## 2026-11-24 correction — no-runner state triggers Notion annotation recovery

This section is the controlling failure-recovery rule and supersedes any older wording that treats a no-runner/empty-step observation or a blocked GitHub annotation endpoint as a terminal blocker.

### Trigger semantics — NOT a root-cause classification

For an exact repository/ref/SHA/run-attempt, any of these observations triggers immediate annotation recovery:
- A raw attempt-scoped job contains the numeric value `runner_id: 0` (not a missing or null field).
- A terminal failed run has an exact job payload with `steps: []`.
- The exact-SHA Check Run reports `annotations_count > 0`.

These are workflow-routing signals only. `runner_id=0`, `steps=[]`, no jobs, blank runner metadata, missing logs and `BlobNotFound` are not a cause, quota diagnosis, or user-facing blocker. Preserve PRESENT/NULL/MISSING; never coerce missing fields to zero or an empty list. If the run is still active, continue observing its lifecycle; do not call startup metadata a terminal failure.

### Mandatory Notion relay path — immediately after the trigger

1. Parse `run_id` from the exact `/actions/runs/{N}` URL; verify repository, workflow path, event, ref, head SHA and `run_attempt`. Keep `job_id`, `check_run_id` and `runner_id` distinct.
2. Resolve the configured Notion annotation-relay destination from the current ticket/observer configuration (currently the GM-50 relay page; never guess a page ID). Query its discussions and paginate until every page/comment is read.
3. Correlate the receipt against **all** identity fields available: repository, branch/ref, exact head SHA, workflow run ID, attempt, Check Run ID and workflow identity. Verify receipt schema, annotation pagination/completeness and whether the annotation belongs to the source Check Run or a separate observer Check Run.
4. Interpret only the matching receipt's actual annotation body. An explicit provider-owned Actions billing/payment/spending-cap message is sufficient for `QUOTA_EXHAUSTED`; other messages must be classified by their actual content. Annotation count alone is not message-level evidence.
5. If no exact receipt exists, record `NOTION_RELAY_RECEIPT_NOT_FOUND_FOR_EXACT_RUN`. This means the relay evidence has not arrived or does not cover that ref/run; it does **not** mean annotations are absent and does not close the diagnostic branch.

### Missing-receipt recovery remains AI-owned work

When the exact receipt is missing, continue investigating and repairing the relay path before reporting any blocker: observer workflow trigger coverage (`workflow_run` filters and schedule), configured target repository/ref/branch, exact-SHA run discovery, Check Run pagination, private-target credentials/secrets presence, Notion API authorization/page sharing, publication errors, and receipt deduplication. Use the configured independent observer; do not assume a main-only observer covers PR branches. A scheduled poll covers only the refs actually configured in its private target inventory. Keep secrets out of chat. Provisioning an owner's private secret or granting account/page access is owner-exclusive only if no authorized AI route can perform it; continue every other AI-owned criterion around that boundary.

A GitHub connector rejection such as `API_METHOD_BLOCKED` is only a transport result. It must route to the Notion relay immediately; it is never the terminal diagnosis while the Notion route or relay implementation/configuration remains unexamined. Do not publish generic `UNKNOWN / API_METHOD_BLOCKED` before this recovery. Only after the Notion relay and materially distinct authorized routes have been checked, and relay/configuration repair work is exhausted or genuinely owner-exclusive, may the causal result remain `UNKNOWN` with the exact missing evidence named.

### Owner-facing output gate

`AI_OWNER && AI_WORK_REMAINING => NO_USER_HANDOFF && NOT_DONE`. Do not send progress reports, phase summaries, interim blockers, partial results or permission-to-continue questions while any authorized AI-owned work remains runnable. Treat missing evidence as an engineering task, not as a reason to interrupt the owner. Final output is allowed only after all feasible AI-owned requirements, verification, repair/retest and readback are complete; a genuine host termination must preserve the exact recovery cursor without being described as completion.
