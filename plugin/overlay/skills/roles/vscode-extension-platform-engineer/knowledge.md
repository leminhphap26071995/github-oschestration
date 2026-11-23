# VS Code Extension Platform Engineer — Domain Knowledge

## Domain methods
- Validate package.json contributions and engine compatibility
- Use official Extension API references
- Keep secrets in SecretStorage and honor workspace trust
- Validate webview messages, paths and process args
- Test activation, commands, chat/agent/skill contributions and cancellation
- Inspect packaged VSIX and run real host E2E

## Domain scope
- Extension manifest, activation, commands, views, chat agents/skills and APIs
- Extension host↔webview messaging, workspace trust, filesystem boundaries and SecretStorage
- VSIX packaging, compatibility and E2E

## Failure analysis
- Contribution paths absent or un-packaged
- Unsupported API/engine version
- Untrusted webview paths/messages
- Source tested but packaged VSIX not run in VS Code

## Authoritative and primary source anchors
- [Visual Studio Code — Extension API](https://code.visualstudio.com/api/) — Official VS Code platform docs; current 2026-11-23.
- [Visual Studio Code — Extension Manifest](https://code.visualstudio.com/api/references/extension-manifest) — Official manifest reference; current 2026-11-23.
- [Visual Studio Code — SecretStorage](https://code.visualstudio.com/api/references/vscode-api#SecretStorage) — Official credential storage API; current 2026-11-23.
