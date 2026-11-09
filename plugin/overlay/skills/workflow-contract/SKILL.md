---
name: workflow-contract
description: Canonical SESSION UPDATE, typed comment, project/ticket identity, ownership, dissent, evidence, status and handoff contract.
---
# One SESSION UPDATE + Typed Comment Contract

## Record types
- **SESSION UPDATE**: durable progress/checkpoint/handoff record at start, meaningful progress, test/build/commit, blocker and closure.
- **Typed comment**: compact event `ACK`, `QUESTION`, `CHALLENGE`, `RESPONSE`, `DECISION`, `EVIDENCE`, `REVIEW`, `HANDOFF`, `BLOCKER`. Include relevant fields only; link to a SESSION UPDATE when helpful.

## Mandatory context identity
Every project-scoped record must carry:
`PROJECT_ID | WORKSTREAM_TYPE | TICKET_ID/GOAL_ID | DOMAIN | REQUIREMENT_VERSION | SOURCE_AUTHORITY | REPO/REF/SHA | CHECKPOINT_PATH`.
A role, source lock, acceptance ledger and Next Action belongs to that context only. Do not use a single global active task or root CURRENT as a ticket checkpoint. See `skills/project-ticket-context-isolation/SKILL.md`.

## SESSION UPDATE fields
`SESSION UPDATE — [SESSION_NAME]`
- Project/workstream/ticket identity; session/chat reference; role/task; goal ID and immutable goal; requirement ID/version; status.
- Summary: requirement/acceptance status, why it matters, observed outcome and expected consumer impact.
- Ownership: current owner/scope, last meaningful update, takeover assessment, prerequisites and requested help.
- Latest source: project/repository, ref/branch, exact commit SHA or primary record ID.
- Actual changes; commands/tests; raw evidence/readback; acceptance by requirement/gate; risks/rollback/recovery cursor.
- Review/dissent: exact challenge, counterexample, evidence-backed response/decision and decision owner/status.
- One primary next action.

## Typed event envelope
`TYPE`; `PROJECT_ID`; `WORKSTREAM_TYPE`; `TICKET_ID`; `ROLE_ID`; `GOAL_ID`; `TASK_ISSUE`; `REQUIREMENT_ID`; `REQUIREMENT_VERSION`; `SOURCE`; `STATEMENT`; `EXPECTED`; `OBSERVED`; `PROPOSED_ACTION`; `EVIDENCE_LINK`; `REPLY_TO`; `VERDICT`; `NEXT_ACTION`.

## Evidence and status semantics
- `VERIFIED`: direct source/tool/readback/executed-test evidence for this specific claim.
- `REPORTED`: reported but not independently checked.
- `PLANNED`: future intent only.
- `UNKNOWN`: evidence insufficient after relevant supported discovery routes; preserve exact gap.
- `BLOCKED`: concrete missing external prerequisite after independent AI work and alternatives are exhausted.
- `FAILED`: an executed check or operation did not pass.
`DONE` applies only to the item whose own acceptance condition has passed. A report, plan, added test, commit, checkpoint, synthetic fixture or green CI cannot substitute for the requested consumer outcome.

## Independent review
Only a different person/session with observable evidence qualifies as independent QA. Same-chat/same-model scrutiny is `SINGLE_SESSION_CROSSCHECK`, not independent review. A role label does not prove a worker was spawned.

## Commit, closure and false-completion prevention
1. Recover original goal, project/ticket identity, requirement version, scope/non-goals, acceptance and first unmet criterion.
2. Run every feasible authorized AI-owned node; include failed nodes that can be repaired and independent work around genuine blockers.
3. Map each criterion to action, expected effect, observed result, evidence, status and dependency; test positive/negative/counterexamples where relevant.
4. Read back material writes and bind evidence to exact source SHA/tool/result/output.
5. Never state or imply the overall request is complete while any in-scope acceptance item, implementation, verification or repair remains open.
6. On interruption, persist exact ticket recovery cursor in its owning project. A plugin does not keep a host chat alive or self-resume in background.

Role and domain skills reference this contract; they do not invent a second status/comment schema.
