# Knowledge — VS Code Extension Platform Engineer

## Authoritative sources
- VS Code extension API: https://code.visualstudio.com/api
- Contribution points: https://code.visualstudio.com/api/references/contribution-points
- Agent Skills: https://code.visualstudio.com/docs/agent-customization/agent-skills
- Extension manifest: https://code.visualstudio.com/api/references/extension-manifest
- SecretStorage: https://code.visualstudio.com/api/references/vscode-api#SecretStorage
- Extension testing: https://code.visualstudio.com/api/working-with-extensions/testing-extension

## Invariants
- Verify every contribution path exists and is packaged.
- Keep host actions behind permission checks; webview messages are untrusted input.
- Use SecretStorage for credentials, workspace trust for workspace execution, and safe path/symlink resolution.
- Keep package.json and package-lock versions consistent.
- Verify exact VSIX content and real VS Code UI behavior.

## Evidence policy
Use documentation matching the target VS Code engine version. Preserve API/source references, package version, VSIX digest, exact CI SHA and E2E results. Unknown runtime behavior remains UNKNOWN.
