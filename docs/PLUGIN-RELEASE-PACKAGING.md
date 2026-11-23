# UPW Plugin Release Packaging

## Consumer boundary

This repository builds the **ChatGPT Plugin Creator** package only. Codex, Claude Code, VS Code extensions and local CLI configuration are separate consumers and must not be bundled into this ChatGPT archive.

The canonical source remains `leminhphap-improvement/ai-workflow-archtiecture`. The public repository contains a sanitized, versioned copy of the ChatGPT overlay and packaging tests. The Plugin Creator backend remains the live release authority.

## UPW 0.1.174 specialist payload

- ChatGPT root manifest: `plugin.json`.
- ChatGPT onboarding: `skills/chatgpt-runtime-onboarding/SKILL.md`.
- CV update lifecycle: `skills/cv-update-lifecycle/SKILL.md` plus `references/cv-update-contract.md`.
- 35 unique professional roles: 30 base + 5 extension roles.
- 140 required role artifacts: `SKILL.md`, `mindset.md`, `knowledge.md`, `workflow.md` for every role.
- Every role has explicit scope, exclusions, decision rights, domain methods, source anchors, failure patterns and Junior/Mid/Senior/Principal behaviors.
- Generic level ladders, decision-discipline boilerplate and source-use boilerplate are centralized in shared contracts, not duplicated inside specialist artifacts.
- Shared references: professional level contract, specialization index and role quality gate.
- The 48 default-prompt entries remain; the update-routing entry now declares ChatGPT-native primary and GitHub backup.

## ChatGPT archive rules

The ZIP root must directly contain `plugin.json`, `references/` and `skills/`. It must not contain an enclosing `plugin/overlay/` directory.

The archive excludes:
- `.codex-plugin/`, `.agent-plugin/`, `.claude-plugin/`;
- Codex/Claude CLI manifests and local bootstrap files;
- `skills/codex-project-bootstrap/`;
- `references/codex-skill-mirror.json`;
- repository-only README, scripts and tests.

Plugin Creator requires detectable plugin content such as a top-level `skills/<name>/SKILL.md`. The packaging tests reopen the ZIP, verify its root layout and reject CLI-only paths. The onboarding path in the root manifest must resolve inside the archive.

## Owner-approved update request and CI

The package workflow is a **backup builder**, not the default update route. It runs only on an owner-approved request that records a concrete ChatGPT host blocker, `chatgpt_native_attempted=true`, exact plugin/current release/version, source commit and target version. It validates every source blob SHA, role count, 140 artifacts and the 48-entry prompt baseline; then runs conformance tests, builds the ZIP, computes SHA-256, records the blocker/provenance and publishes a versioned GitHub Release.

The CI package run proves the archive was built and tested. It does **not** update the live Plugin Creator plugin or prove ChatGPT loaded the new skills.

## Live update handoff

1. ChatGPT normally performs source recovery, payload preparation and Plugin Creator update directly.
2. Use this GitHub builder only when ChatGPT cannot assemble/hand off the complete archive or the native path is unavailable; record the exact blocker.
3. ChatGPT retrieves the exact artifact and invokes Plugin Creator with the expected release ID whenever that native update action is available.
4. Delete exact stale consumer paths only when explicitly authorized; omitted files are retained by overlay semantics.
5. Read back the new release ID/version, manifest, role registry and all 140 role artifacts.
6. Verify the actual ChatGPT consumer can load the updated role and lifecycle skills in a fresh runtime.
7. Update Notion with live release ID, source SHA, package digest, blocker, readback evidence and first unmet criterion.

GitHub is the backup builder/source mirror only; ChatGPT-native Plugin Creator remains the primary executor and publisher. A GitHub Release is not a live plugin update. A live plugin update is not proof of fresh runtime behavior. Keep source, package, live release/readback and runtime activation separate.


## Live Plugin Creator update receipt — 0.1.173

- Release: `pluginrel_6b046a1dc9b481918fff28dedd31a0ef`.
- The ChatGPT-native Plugin Creator update was executed by ChatGPT using the verified GitHub backup archive.
- `.agent-plugin/plugin.json` was removed. `.codex-plugin/plugin.json` was rejected by Plugin Creator as generated from retained source; it remains host-managed and was not part of the uploaded ChatGPT-only archive.
- The live file inventory and selected source files were read back; 35 roles and 140 role artifacts were confirmed.
