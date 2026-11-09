---
name: execution-preflight
description: Mandatory fail-closed task classification, project/ticket context resolution, professional capability discovery, complete role-bundle loading and host-aware execution readiness before project-facing tools.
---
# Execution Preflight — Mandatory Entry Gate

For every substantive, resumed, corrective, incident/debugging, repository, research, state-dependent or tool-backed task, execute this gate before project investigation or project-facing tool calls. This is model-guided instruction in ChatGPT unless a host-side broker enforces it; never claim host enforcement from a skill alone.

## 0. Stop before project work
Allowed before the visible receipt: read UPW entry skills, canonical plugin-root registries, professional capability catalog, host execution contract and exact selected specialist bundles. Do not call GitHub, Notion, Project Files, external web research, repositories or providers first.

## 1. Lock outcome and context identity
Record requested outcome, mode, domain, causal layer, MUST acceptance, constraints/non-goals, target and source authority. Resolve `PROJECT_ID + WORKSTREAM_TYPE + TICKET_ID/GOAL_ID`; a one-off target applies only to this task. For persistent routing, consult the Notion Routing Registry after preflight. Never select a checkpoint by latest timestamp.

## 2. Derive professional capability
Read `skills/professional-capability-discovery/SKILL.md` and `references/professional-capability-catalog.json`. Derive deliverables, lifecycle, domain workstreams and acceptance oracles from the outcome. Choose the primary specialist and justified reviewers from `references/role-registry.json`. PM/Tech Lead/Architect are not substitutes for domain specialists. If an exact specialty is absent or the outcome spans unfamiliar disciplines, select professional-capability-architect as the discovery primary, read its complete registered four-artifact bundle, and create/load the task-specific specialist bundle before implementation.

## 3. Causal-layer routing
- Runtime health/timeout/availability/incident → sre-engineer.
- Backend/API/state/retries/cancellation → backend-engineer.
- Model/provider inference/data evaluation → data-ai-engineer.
- Agent/tool/plugin/role routing/preflight → ai-native-engineer; software-architect and qa-engineer reviewers when justified.
- Module/interface/lifecycle architecture → software-architect.
- Acceptance/regression → qa-engineer.
- CI/build/release/artifacts/quota → devops-engineer + `skills/github-actions-run-lifecycle/SKILL.md`.
- Security/trust/permissions → security-reviewer.
- Browser/Chromium extension → browser-extension-engineer.
- Greenfield game → game-developer + game_development.
- Existing closed-game modification → game-modifier + game_mod.
- Add domain professionals from the deliverable map; do not restrict routing to this list.

## 4. Discover and load current plugin contracts
For an owned personal UPW plugin, call Plugin Creator `list_owned_personal_plugins` first, capture exact plugin_id/current_release_id, then `get_plugin_files`. Read references/role-registry.json, references/domain-routing.json, references/professional-capability-catalog.json and references/host-execution-and-quota-contract.md. Read skills/workflow-contract/SKILL.md. Parse each selected role's exact bundle and read all four artifacts in full. Read every applicable domain skill. Missing/truncated/unreadable artifacts mean BLOCKED; never downgrade silently.

## 5. Probe the active execution surface
Use `references/host-execution-and-quota-contract.md`. Preflight is performed by the active host that owns the next tool invocation. Do not run it inside ChatGPT's bounded Python/container runtime and treat it as the host or user's local device. Classify only relevant network/DNS, filesystem, shell/runtime, packages/resources, media/vision, browser/UI, provider scopes, storage, continuity and budget capabilities as READY/LIMITED/MISSING/DENIED/UNKNOWN. A local failure should route to another authorized adapter where possible.

## 6. Visible receipt
Emit PREFLIGHT: COMPLETE or PREFLIGHT: BLOCKED before project-facing tools. Include task/mode/domain/outcome; project/ticket identity; MUST acceptance; primary/reviewer roles and rationale; exact plugin identity/version/release; registry/catalog/host-contract paths read; exact role-bundle artifacts; domain packs; runtime capability status; missing artifacts and blockers; target authority and next permitted step. If professional-capability-architect is used, state that implementation is not permitted until the exact domain-specialist bundle is generated and loaded.

## 7. Host enforcement boundary
ChatGPT instructions can guide ordering but cannot intercept the host tool broker. Label ChatGPT instruction preflight MODEL_GUIDED. Label VS Code/Omni Studio preflight HOST_ENFORCED only after the extension-owned gate and negative invocation tests prove denied calls never execute.
