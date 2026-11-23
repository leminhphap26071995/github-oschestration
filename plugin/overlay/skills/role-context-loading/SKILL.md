---
name: role-context-loading
description: Load canonical professional context through native ChatGPT routing or an explicitly CI-compiled execution path.
---
# Role Context Loading — Host-aware

## Objective
Compose bounded professional context from canonical role packs without confusing ChatGPT-native model context with CI-generated role splitting or independent workers.

## 1. Recover the owner task and allocation
- Recover the complete owner goal, canonical Notion ticket, requirement version, exact source/ref/SHA, first unmet criterion and requirement-linked role allocation.
- PM/Product Lead owns scope and acceptance; Tech Lead owns architecture, dependencies and integration. Specialists challenge decisions within their professional boundaries.
- Use the current Notion registry and domain route. Do not infer role ownership from keywords, historical chat or an old source snapshot.

## 2. ChatGPT-native role context
- ChatGPT-native role selection is not gated by GitHub Actions. Select roles from the current owner intent, Notion role allocation and canonical domain-routing registry.
- This route loads context into the current ChatGPT model session only. It does not create workers, spawn sessions or prove independent invocation.
- Assign exactly one accountable primary role per workstream. Load that role's complete four-artifact bundle: `SKILL.md`, `mindset.md`, `knowledge.md` and `workflow.md`.
- Invoke supporting roles only when claims, risks or deliverables require their expertise. If a domain route declares `required_supporting_roles`, invoke each role when its declared condition is met; do not silently defer a required reviewer.
- Load the complete four-artifact bundle for every supporting role actually invoked. Keep optional supporting roles as compact metadata until invocation.
- Same-session perspectives must be recorded as `SINGLE_SESSION_CROSSCHECK`; they are not independent QA, an independent hiring panel or an external sign-off.
- A role label, registry entry or bundle readback proves availability, not that a role was independently invoked.

## 3. CI-generated execution path
- A GitHub Actions PASS receipt is required only when the project uses `project.workflow`, `role_pack.py`, generated multi-role context compilation or CI-created role work-package splits.
- The receipt must bind the exact task/source SHA and prove: `Git Tree → blob/receipt → runner_id → job_id → run_id + attempt → head_sha → actual execution`.
- Verify project/task identity, repository/ref/SHA, workflow/blob, request hash, role IDs and bundle hashes, runner_id, job_id, run_id, attempt, head_sha, executed step result and output hash.
- Missing, mismatched or incomplete evidence blocks only the CI-generated path. It does not block independently authorized ChatGPT-native role context.
- ChatGPT-local Python/container, local shell and ad-hoc API scripts are not substitutes for a required CI-generated receipt.

## 4. Canonical role packs
- Resolve the canonical registry from the active project's Notion context and authorized repository/ref.
- Merge extensions by stable role ID. Every invoked bundle requires `SKILL.md`, `mindset.md`, `knowledge.md` and `workflow.md`; verify exact paths and source hashes when available.
- Missing specialist artifacts are a capability gap; never substitute generic model knowledge.
- Load only exact task context files; reject secret-bearing paths and credentials.

## 5. Invocation evidence
Record role ID, accountable/supporting status, invocation surface, loaded/deferred state, source revision, bundle paths/hashes and output validation separately. Do not claim a separate worker, independent review or model injection without corresponding host evidence.

## Domain-specific role selection
A domain route may declare one `primary_roles` entry plus `required_supporting_roles` and optional `supporting_roles`. Invoke required supporting roles when their conditions hold. Select optional specialists from the claim/deliverable map; do not preload every optional role. For CV review, Talent Acquisition Specialist owns the overall review; Technical Hiring Manager is the required supporting reviewer for technical/engineering CVs; Interview Trainer and domain engineers are invoked only when the requested deliverables or claims require them.
