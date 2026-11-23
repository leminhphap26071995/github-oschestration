---
name: execution-preflight
description: Source-aware preflight routing with mandatory GitHub Actions role-selection preflight and exact evidence correlation.
---
# Execution Preflight — GitHub Actions Role Gate

Read-only source recovery may use authorized GitHub/Notion connectors. `project.workflow` Python resolution and generated role-context compilation have one permitted execution path: the project's configured automatic GitHub Actions workflow. UPW's installed/native specialist skill bundles are a separate ChatGPT-native capability: the orchestrator may load the matching four-artifact bundle directly as model context when the task can be executed with available native host tools. This is not a `project.workflow` run, does not create an independent worker, and must not be reported as a CI role-preflight PASS.

## 1. Read-only source recovery
- Recover the explicit project/ticket, original goal, acceptance, repository/ref and exact source SHA.
- Inspect the exact commit's Git Tree, workflow YAML blob, branch/path filters, jobs, permissions, reusable workflows and expected receipt/artifact.
- Do not block remote reads on local Python, shell, DNS or filesystem probes.

## 2. Mandatory CI role preflight
- For every task requiring project.workflow/role_pack.py generated multi-role splitting or generated context compilation, run preflight only through the project's automatic GitHub Actions workflow, bound to the exact committed SHA and versioned task/request contract. Selecting one primary specialist from the canonical registry and loading its verified four-artifact bundle as native ChatGPT model context is a distinct route; it does not execute project.workflow, generate a multi-role split, or spawn a worker.
- Python and `project.workflow` may execute inside that GitHub-hosted runner. Never execute `project.workflow`, `role_pack.py` or role-selection Python through ChatGPT-local Python/container, local shell or another non-permitted host.
- Use only configured automatic events (`push`, `pull_request`, `workflow_run`). Never use `workflow_dispatch`, manual workflow buttons or manual reruns.
- Do not run `project.workflow`, role-pack Python, or claim generated/compiled role-context output before the exact-SHA CI receipt passes.
- Native skill-bundle loading is permitted for ChatGPT-native execution when its four files are available and verified. Select one accountable primary role; load supporting roles only when invoked. Do not claim independent workers or a CI receipt from prompt/skill loading.
- If the CI preflight is blocked or did not execute, mark only the CI-generated role-context gate `BLOCKED`/`UNKNOWN`; continue AI-owned work that can be performed through one verified native primary specialist context and available host tools. Do not perform a manual multi-role split or claim generated context. Never use local Python or shell as a substitute for `project.workflow`.

## 3. Mandatory evidence order
Every Actions-backed role preflight and engineering loop MUST follow this exact chain:

`Git Tree → blob/receipt → runner_id → job_id → run_id + attempt → head_sha → actual execution`

1. **Git Tree:** lock the exact commit's root tree; inventory workflow, request, receipt schema and expected output paths. Resolve truncated trees completely.
2. **blob/receipt:** read exact workflow/request blobs and retrieve the CI receipt. Verify schema, blob/content hashes, repository/ref, task and source commit/tree binding.
3. **runner_id:** validate runner correlation from the receipt and authoritative provider payload. Preserve PRESENT, explicit NULL and MISSING; raw zero is not proof of cause or execution.
4. **job_id:** bind the exact job to the runner and receipt. Do not infer it from a check-run ID or display name.
5. **run_id + attempt:** bind the job to the exact run and attempt; preserve relevant earlier attempts.
6. **head_sha:** cross-check receipt, run and job SHA against the locked commit SHA. Any mismatch breaks the chain.
7. **actual execution:** inspect executed step states, exit codes, logs and output/artifact hashes. IDs, runner assignment, green summaries and compiled prompts alone do not prove execution.

Never start provenance correlation from `runner_id`, a run/job wrapper, check-run ID or logs. Never skip a missing stage. A known `/actions/runs/{N}` URL supplies `run_id=N`, not runner_id; verify it against the exact run object. Failure-cause triage is a separate short path: inspect the exact-run annotation before fetching job/runner/step metadata. If payment/spending-limit/Actions-billing text is decisive, classify `QUOTA_EXHAUSTED` and stop; mark downstream job/runner fields `NOT_QUERIED_BY_DESIGN` unless already present in the source-bound receipt. Only continue the full provenance chain for non-decisive annotations or independent execution diagnosis.

## 4. Requirements and specialist methods
Use verified canonical role IDs and exact four-artifact bundle paths from the role registry. A native ChatGPT specialist invocation means the corresponding skill artifacts were loaded into this conversation and the work was performed with that context; it does not mean a separate worker was spawned. CI-generated `project.workflow` context remains gated by its own exact-SHA receipt. Load one primary role bundle and supporting bundles only when invoked; never fabricate role IDs, bundle contents or worker execution.

## 5. Local probes are conditional
Local probes never replace role preflight. ChatGPT Python/container is not the user's machine and is not an alternate role-preflight executor.

## 6. Evidence and closure
Record repository/ref/SHA, Git Tree SHA, workflow/blob SHA, receipt identity/hash, runner_id, job_id, run_id, attempt, head_sha, executed steps, exit result, output hashes, selected native specialist bundle(s) and first unmet acceptance criterion. Parse run URLs as run_id and apply the Run URL, identifier and report consistency gate in `skills/github-actions-run-lifecycle/SKILL.md`; when annotation-first short-circuit applies, explicitly mark unqueried downstream fields `NOT_QUERIED_BY_DESIGN`. CI PASS validates only its own gate, not product/consumer/owner acceptance. A failed or unexecuted gate requires evidence recovery; do not substitute local Python.


## Native role versus CI role-split boundary

The native ChatGPT route may load exactly one accountable primary role's canonical four-artifact bundle (SKILL.md, mindset.md, knowledge.md, workflow.md) from a verified registry path. Record it as NATIVE_PRIMARY_ROLE_CONTEXT_LOADED, not ROLE_SPLIT_PREFLIGHT_PASS, ROLE_PROMPT_INJECTED or an independent worker. Supporting specialist roles are loaded only when explicitly invoked and must not be represented as independent workers. The generated project.workflow/role_pack.py multi-role split remains CI-only and requires the exact-SHA receipt plus actual executed preflight steps.
