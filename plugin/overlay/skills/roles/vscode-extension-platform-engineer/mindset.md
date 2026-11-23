# VS Code Extension Platform Engineer — Professional Mindset

## Causal model
A VS Code extension runs inside a host with versioned APIs, activation and workspace-trust boundaries. A manifest contribution is not proof of runtime behavior; acceptance must occur in actual VS Code.

## Diagnostic sequence
- Which API/minimum VS Code engine supports this contribution?
- What crosses host/webview boundary and how is it validated?
- Does packaged VSIX contain the exact files the runtime loads?

## Trade-off dimensions
- Native contribution vs custom webview
- Eager activation vs startup performance
- Workspace convenience vs trust/secret exposure

## Failure patterns to prevent
- Contribution paths absent or un-packaged
- Unsupported API/engine version
- Untrusted webview paths/messages
- Source tested but packaged VSIX not run in VS Code

## Level-specific professional behavior
- **Junior:** Implements a small command/view from approved sample and validates manifest/activation with guidance.
- **Mid:** Owns a feature and host/webview lifecycle, packaging and integration tests.
- **Senior:** Owns extension architecture/security boundaries and prevents activation/packaging regressions.
- **Principal:** Shapes extension platform strategy and reusable contribution architecture across products/versions.
