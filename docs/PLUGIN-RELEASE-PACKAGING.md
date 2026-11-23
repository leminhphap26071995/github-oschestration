# Plugin Release Packaging

## Scope and ownership

The canonical plugin release source is maintained under `plugin/overlay/`. It contains a versioned overlay for the existing UPW plugin identity. It is not a second plugin and does not replace the Plugin Creator backend as the release authority.

## Role-routing payload completeness — UPW 0.1.168

The 0.1.168 overlay restores the missing professional-routing layer rather than shipping only manifests:

- Root, Codex and Agent manifests are all 0.1.168; the 48 root/Codex default-prompt entries remain byte-for-byte equal to the live 0.1.166 prompt arrays.
- Four runtime registries are packaged: `role-registry.json`, `role-registry.extensions.json`, `domain-routing.json`, and `professional-capability-catalog.json`.
- Both routing entry skills are packaged: `professional-capability-discovery/SKILL.md` and `ai-tooling-lifecycle/SKILL.md`.
- Every unique role advertised by the base and extension registries has all four artifacts: `SKILL.md`, `mindset.md`, `knowledge.md`, and `workflow.md`. The registries contain ten entries and nine unique role IDs because `ai-native-tooling-engineer` is intentionally present in both registries.
- The nine complete bundles are AI Native Tooling Engineer, DevOps Engineer, Software Architect, QA Engineer, Security Reviewer, Professional Capability Architect, MCP Integration Engineer, VS Code Extension Platform Engineer, and OmniRoute Model Routing Engineer.
- `plugin/validate_overlay.py` parses all three manifests and both role registries and fails closed on any missing or malformed role artifact, mismatched manifest prompt, invalid discovery contract, or generic-role fallback.

Domain-specific packs remain routed adapters and are not copied into this generic role payload. Their project-specific source and evidence retain their existing source authority.

Release `upw-v0.1.167` is superseded because its Agent compatibility manifest retained version 0.1.166. Apply only `upw-v0.1.168`, which aligns all three manifests.

Canonical private source revision: `0b142e75792504f741e2ad0670054f8b70d58734`.

## Automatic CI

`.github/workflows/update-upw-plugin.yml` runs on a push to `main` that changes the owner-approved update request file. It runs only when an owner-approved `.github/upw-plugin-update-request.json` is committed to `main`. It validates the exact UPW Plugin Creator ID, expected current release ID and current live version, then requires the overlay version to be newer and both manifests to preserve the current default prompt. It validates the overlay, creates a ZIP whose root is the plugin root, checks ZIP integrity, computes SHA-256, records source/release provenance and uploads a short-lived handoff artifact. No `workflow_dispatch` is added.

The ZIP is an overlay: omitted files are retained by Plugin Creator's update operation. This avoids storing a duplicate full plugin archive in the repository.

## Create/update handoff

1. Read the live UPW plugin metadata and files through Plugin Creator; record its exact plugin ID, current version and current release ID.
2. Refresh the repository overlay from the intended current plugin source; preserve plugin identity, default prompts, omitted files, audience and scope.
3. Set `.github/upw-plugin-update-request.json` with owner approval, exact plugin ID, expected current release ID and current version. Commit it to `main` with `[upw-plugin-update]` in the commit message; both the changed request path and this explicit marker are required to run the preparation job.
4. Verify artifact source SHA, ZIP integrity, SHA-256 and handoff metadata. The workflow rejects an overlay version that is not newer than the recorded live version or whose manifests do not preserve the default prompt.
5. Use the native Plugin Creator update action with the exact plugin ID and expected release ID. GitHub Actions cannot invoke that Plugin Creator mutation.
6. Read back the new release ID/version and every changed file; record the release ID and source SHA in the owning project/ticket checkpoint.

**Boundary:** GitHub Actions can validate and package the plugin but cannot invoke the current ChatGPT Plugin Creator action. The actual create/update remains a separate Plugin Creator operation after artifact review. The GitHub Release is the owner-facing package handoff. A green packaging workflow or GitHub Release does not prove Plugin Creator update, host activation or actual skill invocation.
