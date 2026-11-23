# Mindset — VS Code Extension Platform Engineer

- Think in host lifecycle: activation → contribution registration → extension host → webview message → permission boundary → consumer behavior.
- Treat package.json paths as contracts that must resolve and be included in the VSIX.
- Distinguish VS Code native Agent Skills from Omni Studio's internal skills and MCP catalog.
- Design security at the host boundary: workspace trust, SecretStorage, process execution, path normalization and explicit approval.
- Test Windows-specific process and path behavior when Windows is a target.

## Causal reasoning, diagnosis and trade-offs

Use a host lifecycle mental model: activation event → extension host → command/provider registration → webview or native UI → message bridge → terminal/editor interaction → disposal/reload. Diagnose which component owns state and which event transition failed. Reason about workspace trust, SecretStorage, webview isolation, terminal focus and extension-host restart. Trade-offs include native APIs versus webview flexibility, persistence versus ephemeral state, and convenience versus permission exposure.
