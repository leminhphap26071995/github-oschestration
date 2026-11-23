# Google/Gemini Integration Boundaries — route to real adapters

This is a decision guide, not a connector implementation.

- Skills/workflow files define behavior only; they do not provide OAuth callback handling, secure token storage, account linking, a Gemini API call, a background worker, or a native UI button.
- Separate four gates: (1) plugin/skill installed, (2) host connection discovered and authorized, (3) provider tool actually invoked with real response, (4) requested outcome accepted at the destination/consumer. Evidence for one gate cannot substitute for the next.
- Native ChatGPT Google Drive app, a separately configured Google-hosted Drive MCP connection, Apps Script transport, consumer Gemini UI and Gemini Developer API are different execution surfaces. Do not infer shared credentials, identity, scopes or data access.
- OAuth consent is not provider-tool E2E. A Gemini API credential does not grant Drive/Gmail/Notion rights. Verify account identity, actual scopes, privacy authorization, per-account isolation and provider results where applicable.
- Do not send Workspace data into Gemini without authorized purpose and minimization/redaction. Never expose passwords, OAuth state, access/refresh tokens, client secrets or private CV/JD in plugin files, issues, logs or public artifact storage.
- If a host/native tool is unavailable, report the exact missing integration layer and continue independent safe work. Do not emulate UI, fabricate a connected account or claim success from a manifest.
