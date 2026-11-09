---
name: context-recovery
description: Recover the exact project and ticket goal, requirement version, source revision, acceptance ledger and first unmet criterion before resuming.
---
# Context Recovery

1. Identify the explicit project/workstream and ticket/goal from the current request. Apply `skills/project-ticket-context-isolation/SKILL.md`; never select the most recently modified checkpoint.
2. Verify project_id, workstream_type, ticket_id, domain, goal/requirement version, repository/ref/SHA or provider record ID.
3. Read project instructions/contracts, project index, matching project checkpoint, matching ticket checkpoint, referenced task/issues and latest source/runtime evidence. Do not read another project's checkpoint as a substitute.
4. Reconcile source authority: live source and provider state outrank stale notes; checkpoints can lag behind newer evidence; chat history is secondary.
5. Rebuild the complete acceptance ledger and distinguish `VERIFIED`, `PENDING`, `CONFLICT`, `STALE_CHECKPOINT`, `UNKNOWN`, `BLOCKED` and `FAILED`.
6. Preserve exact identifiers, timestamps, hashes, errors, requirement IDs and provenance. Do not infer absence from an empty or unreadable result.
7. Resume at the first unmet requirement and execute its required work. Do not constrain the solution by patch size or assume the previous architecture is correct. Ask the owner only for an objectively demonstrated owner-exclusive prerequisite.

## Checkpoint fields
`PROJECT_ID | WORKSTREAM_TYPE | TICKET_ID/GOAL_ID | REQUIREMENT_VERSION | SOURCE_AUTHORITY | REPO/REF/SHA | ORIGINAL_ACCEPTANCE | VERIFIED_EVIDENCE | OPEN_GATES | LAST_ACTION | ROLLBACK | NEXT_ACTION | STORE/READBACK`.

Never write a global active task into a root context index. Never copy secrets, cookies, tokens or protected customer data into checkpoints. A plugin instruction does not reveal hidden chats or guarantee access to private connectors.
