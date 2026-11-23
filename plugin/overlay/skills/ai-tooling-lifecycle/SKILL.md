---
name: ai-tooling-lifecycle
description: Discover, evaluate, install, configure, update and verify AI skills, tools, MCP servers, plugins, VS Code extensions, browser automation and model-routing integrations with explicit host approval and source provenance.
---
# AI Tooling Lifecycle

## When to use
Use for requests to add, install, update, connect, configure, migrate, troubleshoot or verify an AI skill, tool, MCP server, plugin, VS Code extension, browser automation tool, decision service or model router. Use before code changes or package installation.

## Specialist routing
Load the matching complete four-artifact bundle from `references/role-registry.extensions.json`:
- **ai-native-tooling-engineer** — general skill/tool/plugin discovery, source evaluation, installation and consumer integration.
- **mcp-integration-engineer** — MCP protocol, stdio/HTTP transport, auth, initialize, tools/list, tools/call, cancellation and cleanup.
- **vscode-extension-platform-engineer** — VS Code extension APIs, chatAgents/chatSkills, host/webview integration, SecretStorage, VSIX and release.
- **omniroute-model-routing-engineer** — OmniRoute CLI, dashboard, OpenAI-compatible API, model catalog, route and fallback.

Use role-specific skills: `mcp-integration-lifecycle`, `vscode-extension-maintenance` and `omniroute-model-routing`. For Playwright and Jev, also load `playwright-agent-tooling` or `jev-decision-integration`.

## Host and session boundary
- UPW's ChatGPT plugin supplies workflow guidance and specialist role context to the active ChatGPT conversation. It does not implement VS Code Agent Mode, access the owner's local workspace, spawn other ChatGPT sessions or create autonomous workers.
- The owner may open separate ChatGPT sessions for distinct specialist work packages on one ticket. Each session has its own context and must independently recover the same canonical ticket/source; no automatic transcript or memory sharing is implied.
- VS Code Agent Mode is a separate product/runtime responsibility in the GitHub AI workflow architecture repository. Its chatAgents, skills, workspace tools, execution loop, approvals, cancellation, permissions and receipts must be implemented and verified in that repository and actual VS Code host.
- A role or skill selects expertise/context only. It never grants permissions or proves an integration, worker, tool invocation or runtime capability.
- Never transfer VS Code Agent Mode implementation files/configuration into the UPW ChatGPT plugin. Never infer a VS Code capability from a ChatGPT plugin manifest or vice versa.

## Evidence-first lifecycle
1. Recover the desired outcome, target host, installation scope, compatibility, constraints and acceptance from the owner's request and canonical project source.
2. Discover the official/vendor source first. Record repository, docs, exact package, version, license, support matrix, runtime requirements and release provenance.
3. Inspect source, package metadata, install scripts, permissions, auth, data flow and known vulnerabilities. Compare native extension contribution, CLI, workspace skill, host resource catalog, MCP and direct API only for the selected host.
4. Prepare a preview of exact source/version, commands/config, affected scope, credential destination, permissions, expected tools and rollback.
5. Obtain explicit host approval before installing packages, running processes, changing settings, connecting MCP or sending data to an external API.
6. Keep credentials in SecretStorage or equivalent. Never include secrets in model tool arguments, JSON, source files, workspace settings or logs.
7. Verify the actual consumer loads the resource. For MCP, verify initialize and tools/list, then invoke a harmless tool. For APIs, verify authentication and a minimal typed request. For CLI, inspect --help and run a bounded smoke test.
8. Record separate states: DISCOVERED, REVIEWED, INSTALLED, CONFIGURED, CONNECTED, INVOKED, VERIFIED. A gate failure preserves the exact error and does not imply another host is unavailable.

## Installation surface decisions
- A VS Code Agent Skill, Omni Studio bundled skill, workspace skill and imported resource are distinct surfaces. Install into the surface the actual consumer reads.
- A plugin manifest imported as metadata is not an executable plugin. Never claim hooks, agents, commands or scripts run without a compatible runtime adapter and invocation evidence.
- A package installed in npm is not necessarily connected to a VS Code Agent runtime. A connected MCP server is not necessarily invoked. Verify every boundary.
- Prefer a supported native integration over arbitrary shell scripts. If a command is required, inspect exact docs and pin a version.

## UPW live-plugin update routing — ChatGPT primary, GitHub build backup

### Route A — ChatGPT-native default
1. Recover exact plugin ID, current release ID/version and live file inventory from Plugin Creator.
2. Inspect canonical ChatGPT source and exact branch/commit; keep ChatGPT and CLI payloads separate.
3. Make authorized source changes and prepare the changed ChatGPT payload in the active ChatGPT host.
4. Build the overlay locally when the host supports a reliable archive handoff.
5. Call Plugin Creator update with the exact current release ID; preserve rollback and delete-path semantics.
6. Read back new release ID/version and every changed file. Verify fresh ChatGPT runtime loading separately.

### Route B — GitHub backup builder, only when ChatGPT cannot build/hand off
Use this route only after a concrete host limitation prevents ChatGPT from assembling or handing off the complete archive, or the native Plugin Creator path is unavailable. Record the exact blocker; convenience or routine CI is not sufficient.
1. Keep ChatGPT as task owner and primary executor; commit canonical sanitized ChatGPT source to its authoritative repository.
2. Update the owner-approved source-sync and fallback request with exact source SHA, current release ID/version, target version and blocker evidence.
3. Let the scoped automatic GitHub workflow build and validate the complete ChatGPT-only ZIP, checksum and immutable handoff metadata.
4. Retrieve the exact artifact and verify source SHA, plugin ID, expected release ID, target version, role/artifact counts and archive digest.
5. ChatGPT then invokes Plugin Creator with that exact artifact whenever the native update tool remains available.
6. If Plugin Creator itself requires owner-only UI consent/account/device action, stop at that boundary and request only that action; do not hand off routine build, upload or verification.

### Separation and acceptance
- GitHub is the backup builder/source mirror, not the default executor and not the live publisher.
- A GitHub Action, ZIP, release or artifact does not mutate the live Plugin Creator plugin.
- Keep source commit, package digest, Plugin Creator release/readback and fresh-runtime activation as separate evidence.
- Never claim completion without live Plugin Creator readback and consumer verification.

## Playwright
For coding-agent browser workflows, prefer official Playwright CLI + Agent Skill; import the official skill into the appropriate runtime resource catalog as well as installing the CLI. Use Playwright MCP when persistent browser tools are required. Verify official package metadata, pin the exact version, request host approval, connect, check browser tools and run a harmless local-page smoke test.

## Jev
Jev/System One is a typed decision service, not a generative agent or executor. Prefer the official TypeSafe API integration, protect its key in SecretStorage and require explicit consent for each external decision request. Treat outputs as advisory; they never grant permissions.

## OmniRoute
Use the OmniRoute specialist for model/provider configuration. Discover the actual CLI and dashboard before acting; verify `/v1/models` and a real routed response. Keep the gateway key in SecretStorage.

## Completion
Report what is installed, configured, connected, invoked and verified separately. Include exact version, source, host, permissions, tests and rollback. Never mark an integration complete from a prompt, manifest, mock or package file alone.


## ChatGPT-only Plugin Creator archive contract

For a live **ChatGPT** plugin update, package the ChatGPT consumer surface only:
- Include the root `plugin.json`, the referenced ChatGPT onboarding skill, required `skills/<skill-name>/SKILL.md` files, complete required role bundles, and the references those skills load.
- ZIP paths must be relative to the plugin root. The archive root must directly contain `plugin.json` and `skills/`; never add an enclosing repository or `plugin/overlay/` directory.
- Include at least one top-level `skills/<skill-name>/SKILL.md` so the Plugin Creator archive parser can identify plugin content.
- Exclude `.codex-plugin/`, `.agent-plugin/`, `.claude-plugin/`, Codex/Claude CLI manifests and CLI-only bootstrap skills. Those belong to the user's local VS Code/CLI environment, not the ChatGPT plugin.
- Validate the ZIP by reopening it, listing exact root-relative entries, parsing the root manifest, resolving `onboardingSkill`, and verifying every registry role's complete four-artifact bundle.
- Include `delete_paths` only for user-owned stale paths that are confirmed present and deletable. Plugin Creator may retain platform-generated `.codex-plugin` or `.agent-plugin` manifests; do not repeatedly request deletion of platform-generated files. Their presence in the backend is not a ChatGPT runtime dependency, and the ChatGPT archive itself must exclude them.
- A successful GitHub package/CI run proves the ZIP was built and tested, not that Plugin Creator accepted it or that ChatGPT loaded it. Read back the live plugin and test the actual ChatGPT consumer.
