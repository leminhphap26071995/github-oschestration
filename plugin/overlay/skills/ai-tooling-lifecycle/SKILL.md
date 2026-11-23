---
name: ai-tooling-lifecycle
description: Discover, evaluate, install, configure, update and verify AI skills, tools, MCP servers, plugins, VS Code extensions, browser automation and model-routing integrations with explicit host approval and source provenance.
---
# AI Tooling Lifecycle

## When to use
Use for requests to add, install, update, connect, configure, migrate, troubleshoot or verify an AI skill, tool, MCP server, plugin, VS Code extension, browser automation tool, decision service or model router. Use before code changes or package installation.

## Specialist routing
Load the matching complete four-artifact bundle from references/role-registry.extensions.json:
- **ai-native-tooling-engineer** — general skill/tool/plugin discovery, source evaluation, installation and consumer integration.
- **mcp-integration-engineer** — MCP protocol, stdio/HTTP transport, auth, initialize, tools/list, tools/call, cancellation and cleanup.
- **vscode-extension-platform-engineer** — VS Code extension APIs, chatAgents/chatSkills, host/webview integration, SecretStorage, VSIX and release.
- **omniroute-model-routing-engineer** — OmniRoute CLI, dashboard, OpenAI-compatible API, model catalog, route and fallback.

Use role-specific skills: mcp-integration-lifecycle, vscode-extension-maintenance and omniroute-model-routing. For Playwright and Jev, also load playwright-agent-tooling or jev-decision-integration.

## Mode contract
Role and skill context is available in Chat, Mentor, Plan and Agent. Chat explains and researches; Mentor teaches; Plan prepares a read-only proposal; Agent performs installation and connection only through actual host tools and explicit approvals. Do not imply a mode can execute actions it does not expose. In Omni Studio, @[role-id] is an explicit role selector; it selects prompt context in the current session and does not spawn an independent worker.

## Evidence-first lifecycle
1. Recover desired outcome, target host, installation scope, compatibility, constraints and acceptance.
2. Discover the official/vendor source first. Record repository, docs, exact package, version, license, support matrix, runtime requirements and release provenance.
3. Inspect the source, package metadata, install scripts, permissions, auth, data flow and known vulnerabilities. Compare native extension contribution, CLI, workspace skill, host resource catalog, MCP and direct API.
4. Produce a preview: exact source/version, commands/config, affected scope, credential destination, permissions, expected tools and rollback.
5. Obtain explicit host approval before installing packages, running processes, changing settings, connecting MCP or sending data to an external API.
6. Keep credentials in SecretStorage or equivalent. Never include secrets in model tool arguments, JSON, source files, workspace settings or logs.
7. Verify the consumer loads the resource. For MCP, verify initialize and tools/list, then invoke a harmless tool. For APIs, verify authentication and a minimal typed request. For CLI, inspect --help and run a bounded smoke test.
8. Record separate states: DISCOVERED, REVIEWED, INSTALLED, CONFIGURED, CONNECTED, INVOKED, VERIFIED. If a gate fails, stop dependent work, preserve exact error and roll back incomplete changes where safe.

## Installation surface decisions
- A VS Code Agent Skill, Omni Studio bundled skill, workspace skill and imported resource are distinct surfaces. Install into the surface the actual consumer reads.
- A plugin manifest imported as metadata is not an executable plugin. Never claim hooks, agents, commands or scripts run without a compatible runtime adapter and invocation evidence.
- A package installed in npm is not necessarily connected to Agent Mode. A connected MCP server is not necessarily invoked. Verify every boundary.
- Prefer a supported native integration over arbitrary shell scripts. If a command is required, inspect exact docs and pin a version.


## UPW Plugin Creator manual-upload release route

The owner-selected publication path for the existing private UPW plugin is a **complete ZIP uploaded manually through the ChatGPT Plugins UI**. Do not call Plugin Creator's `update_plugin` API for this workflow.

1. Read the exact plugin ID, current release ID, live version and complete file inventory from Plugin Creator.
2. Synchronize the full current release into the private canonical source repository under `plugin/live-source/`. Preserve every real plugin file; exclude only generated caches/bytecode and temporary files. Record the exact source release ID and version in the source-sync manifest.
3. Keep owner-authored changes in `plugin/overlay/` with an explicit allowlist. The full package builder starts from the synchronized live source and overlays only those allowlisted files; unchanged skills, references, templates, scripts, tests and compatibility files remain in the ZIP.
4. Set a package version strictly greater than the synchronized live version. Keep root `plugin.json` and `.codex-plugin/plugin.json` identities and versions aligned. Validate the portable Agent Plugins 1.0 root manifest, skill frontmatter, references, archive paths and compatibility manifest.
5. After the source commit is read back, create an owner-authorized request file under `plugin/package-requests/`. Its scoped push triggers the automatic package workflow; no `workflow_dispatch`, manual rerun or human-operated workflow button is allowed.
6. CI runs the package/contract tests and emits a **complete deterministic ZIP**, SHA-256, package report and source-bound handoff artifact. CI must never call Plugin Creator or mutate the live plugin.
7. The owner uploads the ZIP manually to the existing UPW plugin. After upload, verify the same plugin ID, new release ID/version, full file inventory and changed file contents through Plugin Creator. Host activation and actual runtime behavior remain separate acceptance gates.

Never substitute a partial overlay ZIP for the complete manual-upload package. Do not package generated `__pycache__`, `.pyc`, temporary files, secrets or unrelated repository files. Preserve the live plugin's private scope and audience. Public-directory submission constraints are separate from private manual upload; do not truncate private default prompts merely to satisfy public-listing limits. Never report a GitHub source commit as a live plugin publication.

## Playwright
For coding-agent browser workflows, prefer official Playwright CLI + Agent Skill; import the official skill into the Omni Studio resource catalog as well as installing the CLI. Use Playwright MCP when persistent browser tools are required. Verify the official npm package metadata, pin the exact version, request host approval, connect, check browser tools and run a harmless local-page smoke test. See skills/playwright-agent-tooling/SKILL.md.

## Jev
Jev/System One is a typed decision service, not a generative agent or executor. Prefer the official TypeSafe API integration: GET /v1/models, POST /v1/systemone, SecretStorage for the key and explicit consent for each external decision request. Treat outputs as advisory; they never grant permissions. A community Jev MCP server is not automatically official TypeSafe. See skills/jev-decision-integration/SKILL.md.

## OmniRoute
Use the OmniRoute specialist for model/provider configuration. Discover the actual CLI and dashboard before acting; verify /v1/models and a real routed response. Keep the gateway key in SecretStorage. See skills/omniroute-model-routing/SKILL.md.

## Completion
Report what is installed, configured, connected, invoked and verified separately. Include exact version, source, host, permissions, tests and rollback. Never mark an integration complete from a prompt, manifest, mock or package file alone.


## Mandatory route decision for updating UPW itself

Use the manual-upload release route above: synchronize the complete Plugin Creator release, merge the explicit overlay, create a full ZIP through the automatic request-file CI workflow, and let the owner upload it through the ChatGPT UI. Never call `update_plugin` for this workflow. Read back the exact release ID, version, complete inventory and changed files after the owner upload; keep host activation/runtime acceptance separate.
