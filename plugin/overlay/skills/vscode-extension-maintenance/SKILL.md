---
name: vscode-extension-maintenance
description: Maintain VS Code extensions and Agent runtimes through current extension APIs, secure host integration, reproducible VSIX packaging and real consumer verification.
---
# VS Code Extension Maintenance

1. Load the VS Code Extension Platform Engineer bundle. Recover exact repository, branch, SHA, version, issue and acceptance.
2. Inspect package.json contributions, extension activation, commands, views, chatAgents, chatSkills, prompts, instructions, dependencies and package-lock. Confirm each path exists and is packaged.
3. Read current official VS Code API documentation for the contribution point and engine version. Distinguish native VS Code Agent Skills from the extension's own resource catalog.
4. Trace extension host ↔ webview messages, cancellation, state, permissions, workspace trust, path/symlink boundaries, process lifecycle and SecretStorage. Never trust model-provided paths or credentials.
5. Design the smallest complete change from requirements. Preserve existing settings, sessions, permission boundaries and update/rollback behavior.
6. Add contract/unit tests and real VS Code UI E2E for changed behavior. Build the exact VSIX, inspect its manifest and packaged assets, and verify version/source metadata.
7. Observe automatic CI on the exact SHA. Do not manually dispatch or rerun if repository policy forbids it. Read all job/step/artifact results.
8. Separate source/unit/CI/package/real VS Code/owner-local acceptance. A VSIX file alone is not proof of runtime behavior.
