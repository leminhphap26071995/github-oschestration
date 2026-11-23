---
name: github-actions-quota-staging
description: Recover from explicitly confirmed GitHub Actions quota exhaustion by switching one task to a suitable private repository under a distinct billing owner, preserving source identity and reconciling upstream.
---
# GitHub Actions quota recovery and task-scoped repository switching

Use only after `skills/github-actions-run-lifecycle/SKILL.md` classifies the exact failed job as `QUOTA_EXHAUSTED` from an authoritative provider annotation or runner/job log. Do not infer quota from runner metadata, empty steps, queued startup, generic HTTP errors, API limits or connector failures.

## 1. One active execution repository per task

Maintain two independent route values:
- `DEFAULT_REPOSITORY`: the owner-controlled persistent/default route from the project registry.
- `ACTIVE_EXECUTION_REPOSITORY`: the single repository/ref/SHA currently executing this task.

The default route does not change when a task temporarily switches repositories. For one task, exactly one repository is active at a time. Never dual-push, mirror-push, keep equivalent branches running in parallel, or trigger duplicate CI/CD in both copies. Independent tasks may have different active repositories.

## 2. Diagnose before switching

- Lock upstream owner/repo, branch, exact SHA, workflow path, event, run/attempt/job/step and timestamp.
- Follow the exact commit-to-workflow-to-run-to-attempt-to-job trace; inspect annotations and exact failed job/step logs.
- An executed compile, lint, test, assertion, dependency or E2E step is `STEP_FAILURE`: compare with original requirements, trace source/callers, repair and verify. Never switch repositories to evade a code/test defect.
- Classify mixed jobs independently. A quota-blocked job never masks another executed failure.
- One explicit provider annotation/log tied to the affected run that names exhausted Actions billing, included minutes, spending cap or required payment is sufficient. Do not ask the owner for a billing dashboard or usage summary.

## 3. Find an eligible alternate repository

Only after explicit `QUOTA_EXHAUSTED`:
1. Pause new trigger-producing pushes, PR updates, tags, merges and reruns for the exhausted billing owner. Continue independent work that does not consume that owner's exhausted Actions capacity.
2. Search the repositories and execution targets actually accessible to the authenticated account, across personal ownership and all accessible organizations. The alternate may be inside or outside the source repository's organization; organization membership is not a routing boundary.
3. Prefer a corresponding repository for the same project/workstream. A staging repository is acceptable only when its purpose, audience, retention and data boundary are suitable for this project.
4. Require private visibility, non-archived state, verified read/write permission, compatible automatic workflow/toolchain, and a billing owner distinct from the exhausted billing owner. Verify billing ownership from authoritative account/provider evidence; do not infer it solely from repository name or organization membership. If distinct ownership cannot be established, the candidate is not yet eligible.
5. Apply standing exclusions: never use or modify repositories owned by `huyquanghan-apps`. Never choose a public/unknown-visibility repository or an arbitrary unrelated private repository.
6. Do not pre-check quota through speculative probes or ask the owner to inspect billing. A real project push to the selected alternate target is the first automatic admission observation. Historical successful runs do not prove current quota availability.

## 4. Switch the task without duplicating execution

- Select one eligible destination and stop trigger-producing writes to the exhausted billing owner.
- Transfer the exact in-progress branch/state. Preserve full Git history and ancestry when clone/mirror semantics are required. If only a tree/blob/commit snapshot is supported, label it as a snapshot and record the missing history; never call it a full clone.
- Include all task state needed to continue: source/config, current requirements, completed requirement records, mappings/assets, tests, CURRENT/checkpoint, evidence, rollback and exact first-unmet criterion. Do not copy secrets, credentials, environment files, customer data, proprietary masters or unrelated private source.
- Record source and destination `repo/ref/SHA` separately. Read back destination branch HEAD, ancestry/history, tree and key files before relying on it.
- Update only this task's `ACTIVE_EXECUTION_REPOSITORY` and recovery cursor. Keep `DEFAULT_REPOSITORY` unchanged.
- Continue the actual task on the destination. Let its narrow automatic workflow run once for the relevant change; do not also push the same change to the exhausted repository or launch parallel equivalent workflows.

## 5. Reconcile to the default repository

When the original billing owner later admits a fresh automatic run:
- Freeze trigger-producing changes on the alternate task branch while reconciling.
- Sync/rebase the verified task state back to the default repository, preserving ancestry where possible.
- Push the reconciled change once and verify exact resulting upstream SHA, required automatic checks and readback.
- Only then mark `SYNCED` and move `ACTIVE_EXECUTION_REPOSITORY` back to the default route. Until then retain `SYNC_PENDING`; do not overwrite either side or assume they are equivalent.

## 6. No eligible target

If no private, suitable, writable target under a demonstrably distinct billing owner exists, keep hosted verification `UNKNOWN/BLOCKED`. Continue all independent source analysis, implementation, tests and other authorized work that do not require the exhausted runner. Do not ask the owner to perform a transfer that connected tools can perform.

## Execution boundary and acceptance

Respect automatic-only policy: no `workflow_dispatch`, manual reruns or human-operated workflow buttons. Record the exact quota message and run/job, exhausted billing owner, selected target and its owner/visibility/permissions, transfer method, source/destination identities, destination SHA, automatic run evidence, artifact identity and `SYNC_PENDING`/`SYNCED` state. A staging pass proves only the staged revision, not upstream CI or product acceptance. Keep artifact-storage quota, compute/billing quota, per-artifact size, retention, API rate limits and ordinary step failures distinct.