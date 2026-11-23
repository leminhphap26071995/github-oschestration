---
name: role-context-loading
description: Load canonical professional context only after GitHub Actions verifies the task-specific role-selection receipt.
---
# Role Context Loading — CI-Gated

## Objective
Compose bounded professional context from canonical role packs. Role selection and context compilation are CI-gated; this skill does not authorize local Python or create workers.

## 1. Require the role-preflight receipt
- Before selecting a primary role, splitting supporting roles or compiling context, require a PASS receipt from the project's automatic GitHub Actions preflight on the exact task/source SHA.
- The receipt must prove: `Git Tree → blob/receipt → runner_id → job_id → run_id + attempt → head_sha → actual execution`.
- Verify project/task identity, repository/ref/SHA, workflow/blob, request hash, role IDs and bundle hashes, runner_id, job_id, run_id, attempt, head_sha, executed step result and output hash.
- Preserve PRESENT/NULL/MISSING. Missing is not zero; `runner_id=0` is not root-cause or execution proof.
- If absent, mismatched, incomplete or unexecuted, mark role routing BLOCKED/UNKNOWN. Do not manually select roles or use local Python as fallback.

## 2. CI-only selection and compilation
- Run `project.workflow`, `role_pack.py`, role selection, validation and context compilation only inside the configured GitHub Actions runner.
- ChatGPT-local Python/container, local shell, ad-hoc API scripts and manual role selection are prohibited substitutes.
- Use the exact committed task/config; no `workflow_dispatch` or manual rerun path.
- `COMPILED_NOT_EXECUTED` proves compilation only, not model invocation, independent worker, skill injection or specialist execution.

## 3. Canonical role packs
- Canonical registry: `contracts/professional-role-packs.registry.json`; portable registry: `.lyonpro/professional-role-packs.registry.json`.
- Merge extensions by stable role ID. Every bundle requires `SKILL.md`, `mindset.md`, `knowledge.md` and `workflow.md`; verify paths/hashes against the receipt.
- Missing specialist artifacts are a capability gap; never substitute generic model knowledge.

## 4. Lazy context and scope
- Load the primary role's complete four-artifact bundle and relevant shared skills.
- Keep supporting roles as compact metadata until actually invoked.
- Load only exact task context files; reject secret-bearing paths and credentials.
- Supporting roles challenge only within their expertise. Same-session role-perspective review is not independent QA.

## 5. Invocation evidence
A role label, selection, compiled prompt or CI preflight is not an independent worker invocation. Record actual invocation surface, model/tool receipt, loaded prompt hash and output validation separately. Retain the CI receipt reference/hash, role IDs, loaded/deferred state, context hashes, source revision and compiler status.


## Domain-specific role selection
A domain route may declare `role_selection.primary_roles` and `role_selection.supporting_roles`. Load the complete four-artifact bundle for each role actually invoked. Do not preload every supporting role by default; select from the claim/deliverable map and record loaded versus deferred roles. For CV review, HR/Talent Acquisition and Technical Hiring Manager are distinct primary perspectives; Interview Trainer and engineering specialists are supporting perspectives as required.
