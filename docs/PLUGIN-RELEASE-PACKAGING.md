# UPW Plugin Release Packaging

## Consumer boundary

This repository builds the **ChatGPT Plugin Creator** package only. Codex, Claude Code, VS Code extensions and local CLI configuration are separate consumers and must not be bundled into this ChatGPT archive.

The canonical source remains `leminhphap-improvement/ai-workflow-archtiecture`. The public repository contains a sanitized, versioned copy of the ChatGPT overlay and packaging tests. The Plugin Creator backend remains the live release authority.

## UPW 0.1.170 payload

- ChatGPT root manifest: `plugin.json`.
- ChatGPT onboarding: `skills/chatgpt-runtime-onboarding/SKILL.md`.
- CV update lifecycle: `skills/cv-update-lifecycle/SKILL.md` plus `references/cv-update-contract.md`.
- 35 unique professional roles: 30 base + 5 extension roles.
- 140 required role artifacts: `SKILL.md`, `mindset.md`, `knowledge.md`, `workflow.md` for every role.
- New roles: Talent Acquisition Specialist and Technical Hiring Manager. These are distinct from Interview Trainer and Tech Lead.
- The 48 live default-prompt entries are preserved exactly.

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

The package workflow runs only on a push to `main` that changes `.github/upw-plugin-update-request.json` and includes `[upw-plugin-update]` in the commit message. It validates the exact plugin ID/current release ID/current version, source commit, role counts and live default-prompt baseline; then runs conformance tests, builds the ZIP, computes SHA-256, records provenance and publishes a versioned GitHub Release.

The CI package run proves the archive was built and tested. It does **not** update the live Plugin Creator plugin or prove ChatGPT loaded the new skills.

## Live update handoff

1. Read back the live plugin ID, release ID, version and current files.
2. Apply the exact ZIP through Plugin Creator using the expected release ID.
3. Delete exact stale CLI-only paths using `delete_paths`; omitted files are retained by overlay semantics.
4. Read back the new release ID/version, manifest, all role registries and all 140 role artifacts.
5. Verify the actual ChatGPT consumer can load the ChatGPT onboarding and CV update skill in a fresh runtime.
6. Update Notion with live release ID, source SHA, package digest, readback evidence and first unmet criterion.

A GitHub Release is not a live plugin update. A live plugin update is not proof of fresh runtime behavior. Keep those states separate.
