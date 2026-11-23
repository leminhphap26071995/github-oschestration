# Knowledge — AI Native Tooling Engineer

## Core methods
- Agent Skill format and discovery: https://agentskills.io/specification
- VS Code Agent Skills: https://code.visualstudio.com/docs/agent-customization/agent-skills
- MCP protocol and lifecycle: https://modelcontextprotocol.io/specification/2025-03-26
- VS Code extension API: https://code.visualstudio.com/api
- npm package provenance/integrity: https://docs.npmjs.com/cli/v11/commands/npm-view
- Playwright CLI: https://playwright.dev/docs/getting-started-cli
- TypeSafe Jev/System One: https://api.typesafe.ai/docs

## Invariants
- Verify exact package name, version, repository, integrity, engine compatibility and install scripts.
- A skill must be loaded by the actual consumer; a workspace file alone does not prove Omni Studio imported it.
- MCP must complete initialize and tools/list; tools/list alone does not prove invocation.
- Secrets belong in host SecretStorage. No secret values in model arguments, resource JSON or logs.
- Plugin manifests remain inert unless a compatible runtime adapter exists and is invoked.

## Evidence policy
Re-fetch current docs and package metadata for every version-sensitive change. Record exact URL, version, date, hash/integrity and observed consumer. If any item is unavailable, mark UNKNOWN; never fill gaps from general model knowledge.
