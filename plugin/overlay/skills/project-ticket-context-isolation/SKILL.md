---
name: project-ticket-context-isolation
description: Route current-message intent across ephemeral topics and persistent project/ticket contexts without state leakage.
---
# Project, Topic and Ticket Context Isolation

## Purpose
Separate two decisions on every turn: (1) what the current message intends and which domain it concerns; (2) whether that intent requires a durable project/ticket checkpoint or only an ephemeral conversation context. Never collapse them into one global active context. Durable checkpoint selection is `NEVER_LATEST_TIMESTAMP`.

## Message intent first
Resolve the latest user message before consulting the persistent route or reading project checkpoints:
1. Apply safety, permissions and explicit authorization.
2. Extract structured intent: `intent_type`, explicit domain/project/ticket/goal/repository/branch, topic-change signal, and continuation clarity.
3. Explicit project/ticket/goal wins for this turn; resolve exact identity.
4. An explicit topic change or clearly new subject selects an ephemeral domain context. Load only that domain profile. Do not load the previous project's checkpoint, roles, acceptance or Next Action.
5. Standalone/content-only requests are direct; use a domain profile only when helpful. No repository lookup by default.
6. Preserve the current conversation context only for an unambiguous continuation.
7. Ask one concise clarification when intent/domain/target is genuinely ambiguous. Never guess from recency, a familiar project or newest timestamp.

## Context classes
- **Ephemeral:** topic/domain scoped, conversation-lifetime only. No project checkpoint, ticket, durable Next Action or project role assignment.
- **Persistent project:** `PROJECT_ID | GOAL_ID | DOMAIN | SOURCE_AUTHORITY`.
- **Persistent ticket:** `PROJECT_ID | TICKET_ID | DOMAIN | REQUIREMENT_VERSION | SOURCE_AUTHORITY | REPO/REF/SHA`, with its own acceptance ledger and Next Action.
- **Persistent route:** owner-controlled default project/repository/branch. Consult only for project work when the user authorizes that default or supplies no target. It is never the default conversational topic.

## Time invariants
- Minutes, days or months do not independently change the selected domain.
- A long gap does not erase an explicit continuation; revalidate source freshness.
- A short gap does not turn a new topic into continuation.
- Time and timestamps are freshness metadata, never intent or identity.

## Durable identity and state
- Root `.ai-workflow/CURRENT.json` is an index of project IDs and checkpoint paths only; no global active task/domain/role/Next Action.
- Project and ticket checkpoints are separately namespaced.
- Resolve project/ticket by explicit identity; validate project_id, ticket_id, domain, requirement version, source authority and exact REPO/REF/SHA.
- If project is explicit but ticket omitted, inspect only that project's ticket index; select only one valid candidate, otherwise ask.
- Reject mismatched identities; never substitute a checkpoint because it is newer.

## Switching and recovery
1. Resolve destination intent/domain before using outgoing context.
2. If leaving a durable ticket after changing its state, persist outgoing cursor to its canonical store and read it back; otherwise mark UNSAVED.
3. Load a project/ticket checkpoint only for persistent project work; validate its live source/ref/SHA.
4. Keep contexts independent. Switching does not close, complete, overwrite or migrate the outgoing project.
5. Switch-back restores the exact saved context identity, source lock, acceptance, roles and first unmet criterion.
6. Never claim host-wide enforcement from a skill or registry page; require positive and negative tests in the active host.

## Domain context directory
Use the owner-configured **UPW — Context Switching & Domain Context Registry** as the fast human-readable directory of domain IDs, aliases, profile pointers, authority boundaries and query hints. Use the versioned resolver/registry in the canonical UPW source repository when available. Load only the selected profile/source bundle.
- Do not hardcode owner-specific Notion page IDs in reusable plugin files.
- Notion owns mutable directory/profile pointers; GitHub owns versioned resolver contracts/tests; domain project boards/checkpoints remain authoritative for their own state.
- Unknown domains require bounded intake/research and explicit UNKNOWN status; never silently fall back to a generic role or unrelated project.

## Task-scoped execution repository routing

A persistent project route and a task's temporary execution target are different:
- `DEFAULT_REPOSITORY` is the owner-controlled route from the routing registry.
- `ACTIVE_EXECUTION_REPOSITORY` is the one repo/ref/SHA currently executing the selected task.

For each task, keep exactly one active execution repository. Never dual-push or mirror the same change into two repositories and never run equivalent CI/CD pipelines in parallel across copies. A temporary repository switch does not mutate the persistent routing registry or another task's checkpoint.

When the active repository is explicitly `QUOTA_EXHAUSTED`, load `skills/github-actions-quota-staging/SKILL.md`. Search all private, non-archived repositories accessible to the authenticated account across personal ownership and all accessible organizations, including outside the current organization. Choose a corresponding or purpose-suitable repository only after verifying write permission, workflow/toolchain compatibility, data boundary and a billing owner distinct from the exhausted owner. Do not infer billing ownership from organization membership alone, pre-check quota with speculative runs, or ask the owner to inspect billing.

Transfer the complete task state with source/destination repo/ref/SHA provenance; preserve full history when required, otherwise label a snapshot honestly. Read back destination HEAD and files, then switch only this task's ACTIVE_EXECUTION_REPOSITORY. Keep DEFAULT_REPOSITORY unchanged. Reconcile back once the original billing owner admits a fresh automatic run; push once, verify exact SHA and checks, then mark SYNCED. Never create parallel copies that both trigger the same work.

## Quota-aware staging
Use `skills/github-actions-run-lifecycle/SKILL.md` for exact evidence classification, then `skills/github-actions-quota-staging/SKILL.md` only after explicit `QUOTA_EXHAUSTED`.
- Keep `DEFAULT_REPOSITORY` separate from one task-scoped `ACTIVE_EXECUTION_REPOSITORY`.
- Search accessible private repositories across personal ownership and all organizations; the target may be outside the source organization.
- Require verified write permission, project/data suitability, workflow compatibility and a demonstrably distinct billing owner. Never use `huyquanghan-apps`.
- Do not pre-check quota, ask the owner for billing details, or infer quota from runner/startup/API symptoms.
- Transfer complete task state with provenance, read back destination HEAD, and switch only the task's active target. Never dual-push or run equivalent workflows in both repositories.
- Reconcile to the default repository only after fresh automatic admission and exact-SHA readback; keep `SYNC_PENDING` until then.

## Required regressions
- Papaya interview -> standalone Kubernetes: ephemeral software-engineering context; Papaya checkpoint untouched.
- Papaya -> Game Design -> Papaya: exact Papaya ticket/source/acceptance/Next Action restored.
- Career -> Finance -> Learning -> Career: no role/source/Next Action leakage.
- Explicit project with multiple tickets asks; never selects newest.
- Game Mod -> VS Code -> Game Mod and VS Code -> Papaya -> VS Code restore exact cursors.
- Forged project/ticket/domain identity is rejected.
- Same intent after a long gap resolves identically; a new topic immediately overrides conversation anchoring.
- Ambiguous continue asks for clarification.
- Explicit Actions billing exhaustion differs from generic API errors/rate limiting.
- Staging requires a suitable private repository, verified write access, a distinct billing owner and one active target; cross-organization repositories are eligible when all gates pass.

## Acceptance
Pass only when current-message intent routing precedes persistent lookup, ephemeral/durable contexts are isolated, identity checks and outgoing readback work, regressions pass, and the active ChatGPT/VS Code consumer demonstrates switching. A document, schema, plugin release or unit test alone is not host acceptance.
