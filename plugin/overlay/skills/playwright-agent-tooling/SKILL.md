---
name: playwright-agent-tooling
description: Add Playwright CLI, Agent Skills or Playwright MCP to a coding agent with source review, version pinning, explicit approval and browser-level verification.
---
# Playwright Agent Tooling

## Choose the correct surface
- **CLI + Agent Skill:** preferred for coding-agent browser tasks, test generation and local browser workflows. Install the official @playwright/cli package at an exact version and import the official Playwright CLI SKILL.md into the Omni Studio resource catalog so the custom Agent actually loads it. Optionally run playwright-cli install --skills=agents for other supported agents in the workspace.
- **Playwright MCP:** use when persistent browser tools are needed inside Agent Mode. The official package is @playwright/mcp from Microsoft. Use the Agent host installer with an exact version after verifying current npm metadata and source.
- These are different integrations. Installing CLI does not connect MCP; connecting MCP does not install a workspace skill.

## Safe install workflow
1. Read current official docs and package metadata. Verify package name, version, repository, dist integrity, Node engine and license.
2. Inspect the exact command and package source. Pin the version; do not use mutable latest in persisted configuration.
3. Obtain Agent host approval before npm/npx execution or MCP connection. Keep the process scoped to the intended workspace and preserve workspace trust.
4. Import the official skill from the Microsoft Playwright repository into the extension's own skill catalog. Verify it appears in the active Agent context.
5. For MCP, connect through the host, verify initialize and tools/list, and confirm expected browser_* tools.
6. Invoke a harmless navigation/snapshot against a local test page. Confirm the actual browser response; do not claim browser access from package presence alone.
7. Test cancellation, disconnect and cleanup. Never use production credentials or perform destructive browser actions without explicit owner approval.

Official sources:
- https://playwright.dev/docs/getting-started-cli
- https://playwright.dev/agent-cli/skills
- https://playwright.dev/docs/getting-started-mcp
- https://github.com/microsoft/playwright-mcp
- https://github.com/microsoft/playwright/blob/main/packages/playwright-core/src/tools/skills/playwright-cli/SKILL.md
