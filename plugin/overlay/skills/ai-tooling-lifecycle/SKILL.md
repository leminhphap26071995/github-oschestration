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

## UPW live-plugin update vs GitHub CI routing

Treat the live ChatGPT plugin and the GitHub source/release as two distinct delivery surfaces. GitHub is the versioned technical source; Plugin Creator is authoritative for the installed/live ChatGPT plugin and current release.

### Route A — direct Plugin Creator update (default for live plugin changes)
Use the native Plugin Creator update operation when the requested change affects UPW plugin skills, prompts, manifests, references or support files and does not require a repository-built artifact:
1. Recover the exact plugin ID and current release ID/version from Plugin Creator.
2. Read the current plugin files/archive and inspect the exact paths to change.
3. Update and commit the canonical GitHub source first, preserving source provenance and synchronized manifest versions.
4. Build a valid overlay archive containing the root `plugin.json` plus every changed file and required manifest. Omitted files remain intact; do not delete files unless explicitly intended.
5. Call Plugin Creator update directly with the host-uploaded archive and the exact current release ID as the optimistic concurrency guard. This operation is the publication step; do not route through GitHub Actions merely to update the live plugin.
6. Read back the new release ID/version and every changed file from Plugin Creator. Verify manifests, skill contents and plugin identity.

### Route B — GitHub Actions / CI (only when repository work requires it)
Use CI when at least one is true:
- The changed source includes workflow/build/test/package/release contracts that require the repository's defined CI gates.
- The owner explicitly requests a GitHub release/artifact or a repository-owned release pipeline.
- A source-defined automatic release workflow is the actual authorized publication mechanism and its trigger/consumer behavior is verified.

CI validates/builds/releases GitHub repository artifacts. It does NOT, by itself, update the live ChatGPT plugin. If CI produces the archive, use that artifact as input to the native Plugin Creator update unless an independently verified source-defined automation already performs that exact live update. Never assume a GitHub release equals a Plugin Creator release.

### Owner manual action — exceptional host boundary only
Do not ask the owner to upload, click Publish, run CI, copy files or perform routine plugin maintenance while an authorized native Plugin Creator route is available. First exhaust the direct tool route and any supported host-uploaded archive path. Request owner action only for a demonstrated owner-exclusive consent/account/device operation or a hard host boundary that the connected tools cannot cross. Record the exact failed capability and preserve AI ownership; a blocker does not transfer the work to the owner.

### Failure classification
- Plugin Creator archive/manifest validation error: repair the archive and retry after re-reading current release; it is not CI quota exhaustion.
- Plugin Creator access/permission error: inspect plugin scope and editor/owner authorization; do not switch to CI unless the requirement is specifically a GitHub artifact.
- Plugin Creator daily quota exhaustion: only an explicit provider quota signal permits the documented quota fallback. CI is not automatically a substitute for publishing the live plugin.
- GitHub Actions failure: classify from exact run-scoped provider evidence; do not infer quota from missing logs, runner_id=0 or zero steps.
- After any successful update, verify the new live release and changed-file readback separately from GitHub commit/CI evidence.
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
- When updating an existing ChatGPT plugin, pass exact stale CLI-only paths through `delete_paths`; omitted files are retained by overlay semantics.
- A successful GitHub package/CI run proves the ZIP was built and tested, not that Plugin Creator accepted it or that ChatGPT loaded it. Read back the live plugin and test the actual ChatGPT consumer.
