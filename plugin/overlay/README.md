# ChatGPT-only UPW plugin source

This directory is the versioned ChatGPT consumer payload: root `plugin.json`, ChatGPT skills and the references those skills actually load. It is not a cross-runtime package.

**CLI separation is mandatory.** Codex/VS Code and Agent/Claude configuration lives under `.agents/plugins/upw/`; standalone workspace skills live under `.agents/skills/`; role bundles live under `.agents/upw-roles/`. Shared skill content may be mirrored deliberately, but CLI manifests, prompts, versions and runtime configuration are not part of the ChatGPT plugin and must not be copied here.

## ChatGPT-native update — default

ChatGPT-native Plugin Creator is the default live-publication route. Recover exact plugin ID/current release ID/version, inspect live files, update canonical source, prepare the changed payload locally when the active host supports it, invoke Plugin Creator with the exact current release ID, then read back the new release and every changed file.

## GitHub package builder — backup only

Use the sanitized package pipeline in `leminhphap26071995/github-oschestration` only when a concrete ChatGPT host limitation prevents local archive assembly/handoff or the native Plugin Creator path is unavailable. The fallback builds a complete ChatGPT-only ZIP, checksum and source-bound handoff metadata. ChatGPT remains responsible for invoking Plugin Creator after retrieving the artifact whenever the native update action is available. GitHub Actions/releases do not publish the live plugin.

`.upw-overlay-files.json` is the explicit allowlist for the partial overlay and currently contains only `plugin.json`; therefore `plugin/package_overlay.py` produces a manifest-only regression artifact, not a complete or uploadable plugin archive. Never treat that artifact as a release package.

Owner UI action is limited to demonstrable owner-exclusive consent/account/device operations. Do not ask the owner to perform routine packaging, upload or verification while an AI-owned route is available.
