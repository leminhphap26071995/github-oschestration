# AM - AI Manager: Repository Bootstrap

This repository is the canonical, content-neutral AI workflow architecture. The immutable cross-host target is [docs/FINAL-GOAL.md](docs/FINAL-GOAL.md); read it before changing universal contracts. Before acting, read the final goal, `AI-ARCHITECTURE-WORKFLOW.md`, `docs/AI-WORKFLOW-SEQUENCE.md`, `docs/ARCHITECTURE-BOUNDARIES.md`, `ai-workflow.instance.json`, `.ai-workflow/CURRENT.json`, the applicable domain pack, repository instructions, exact branch/HEAD, issues, source and evidence.

1. Classify the workspace as EXISTING, EMPTY or UNKNOWN. Inspect existing state before asking questions.
2. If empty, interview one question at a time; clarify goal, why, deliverable, measurable acceptance, constraints, baseline/assets, style, collaboration/autonomy, approvals, privacy and continuity.
3. Reflect a concise charter and ask the user to confirm if critical ambiguity remains.
4. Keep Project Instructions under 8,000 characters and use them only as a router. Put detailed workflow and domain acceptance in this repository.
5. Execute the full applicable loop: recover, inspect, plan, do authorized work, verify, self-critique, repair/retest, persist and verify readback.
6. Compare every original acceptance criterion; do not stop at a plan, manifest, role name, commit or synthetic test.
7. Keep reusable core, domain packs and private project/runtime data separate. Never persist secrets in the template.
8. Use VERIFIED, REPORTED, PLANNED, UNKNOWN, BLOCKED or FAILED. Resume from the first unmet criterion using live state.
9. A plugin cannot guarantee background execution after host termination. Claim a worker only when a real executor is configured and verified.

## Architecture maintenance rule

Changes to universal routing, authority, mode selection, recovery, evidence, adapter interfaces or safety policy belong in the core architecture documents and must be reflected in the sequence diagram. Changes to a domain method belong in its domain pack. Changes to project content belong in that project's own workspace. Do not copy project payloads into this repository. Any architecture change must remain consistent with the immutable final goal; if the owner changes the goal, create a new goal version and impact-trace affected acceptance evidence.

## Global automation policy — no manual GitHub Actions dispatch (owner decision, 2026-10-30)

- Do not add or retain `workflow_dispatch` in GitHub Actions workflows for this repository. The sole organization exception is repositories owned by GitHub organization `huyquanghan-apps`; this exception does not apply to other organizations or personal repositories.
- Do not replace manual dispatch with another human-operated workflow button, input form, or manual rerun path. For normal work, follow Unified Project Workflow: inspect the exact source/ref, make the authorized change, commit/push it, and let the narrowest relevant automatic trigger run. Docs-only changes use source readback and appropriate local checks; do not create CI just to simulate a manual action.
- Replace parameterized dispatch with version-controlled, validated request/config files and scoped `push.paths` triggers. Preserve explicit authorization, privacy, destructive-action, and release gates as data/approval checks in the request contract; never convert a human authorization requirement into an unattended side effect.
- Use native lifecycle events where they are the true cause: `push` for committed source/config/request changes, `pull_request` for review checks, `release`/tag push for releases, `workflow_run` for dependent automation, and `schedule` only for genuinely recurring work. Avoid broad push triggers; scope paths and branches.
- One-off diagnostics and parameterized experiments are run by the active Unified Project Workflow executor against the exact target, not by a manually dispatched Actions workflow. Record source SHA, commands, output, and acceptance evidence. Do not claim a hosted run if no automatic event actually started it.
- Update tests, docs, scripts and downstream consumers that assume manual dispatch. Add a negative conformance check that rejects `workflow_dispatch` in workflow YAML. Do not leave dead inputs or branches that depend on the removed event.
- Organization exclusion: do not change repositories owned by `huyquanghan-apps`. This is the only exception. Repositories in `leminhphap-improvement`, `LyonPro`, `lyon-game`, and personal accounts are in scope when accessible.
