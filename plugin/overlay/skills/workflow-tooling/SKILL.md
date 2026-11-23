---
name: workflow-tooling
description: Resolve and use project-local deterministic workflow scripts through a versioned registry while minimizing context and preserving host authorization and execution evidence.
---
# Workflow Tooling

## Purpose
Use deterministic project scripts for repeatable discovery, validation, context compilation, routing and evidence checks. The skill is a routing contract, not a shell, permission grant or background worker.

## Discover the project adapter
1. Prefer `.lyonpro/workflow-tools.registry.json` and `.lyonpro/workflow_tools.py` in a portable project.
2. Otherwise check `contracts/workflow-tools.registry.json` and `scripts/workflow_tools.py` in the canonical repository.
3. If neither exists, do not invent a registry or assume scripts are installed. Use connected provider tools and the smallest relevant source reads.
4. Resolve only the active workflow and selected role/skill. Do not read every registry entry or every script into context.

Example from a portable project root:

```bash
python .lyonpro/workflow_tools.py resolve --root . --registry .lyonpro/workflow-tools.registry.json --role-registry .lyonpro/professional-role-packs.registry.json --workflow context-assembly --role-id devops-engineer
```

Canonical repository paths use `scripts/workflow_tools.py`, `contracts/workflow-tools.registry.json` and `contracts/professional-role-packs.registry.json`.

## Role selection/context-assembly execution boundary
For `role-selection`, `context-assembly`, `project.workflow` resolution or role-pack context compilation, execute the registered Python entrypoint only inside the project's configured automatic GitHub Actions workflow. Do not run `python role_pack.py`, `project.workflow` or equivalent role-preflight code through ChatGPT-local Python/container or local shell. No manual dispatch/rerun and no local fallback. Require `Git Tree → blob/receipt → runner_id → job_id → run_id + attempt → head_sha → actual execution`; otherwise mark the dependent role route BLOCKED/UNKNOWN.

## Resolve before executing
- Treat resolver output as `RESOLVED_NOT_EXECUTED`; it is not a script execution receipt.
- Inspect the exact entrypoint, argv, declared inputs/outputs, side effects, host requirements, approval policy and script hash.
- Invoke only the exact registered entrypoint through an authorized host terminal or CI runner. Do not construct shell strings, use `shell=True`, concatenate commands or invoke unregistered scripts.
- `READ_ONLY` helpers may run only when the host grants terminal execution. `LOCAL_WRITE`, network mutation, installation, credential access or host configuration changes require the applicable explicit approval.
- Preserve repository/ref/SHA, exact argv, exit code, stdout/stderr reference and script hash as the execution receipt.
- If the current host has no supported terminal executor, use available GitHub/Notion/provider connectors and mark the script `NOT_EXECUTED`. Never claim execution because a command was displayed or resolved.

## Context efficiency
- Prefer the role context compiler for one full primary role, compact supporting-role descriptors and exact bounded project files.
- Load supporting role knowledge and skills only when that specialist is actually invoked.
- Prefer compact JSON inventories, hashes and validation errors over loading whole repositories or script source.
- Script output proves only what the script measured; it does not prove independent agents, provider invocation, browser behavior or owner acceptance.
