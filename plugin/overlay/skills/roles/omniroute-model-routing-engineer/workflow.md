# Workflow — OmniRoute Model Routing Engineer

1. Identify target local runtime, version, endpoint, CLI availability, dashboard access and auth source.
2. Discover CLI commands using --version/--help; inspect exact subcommand help.
3. If authorized UI is available, inspect the live dashboard and record observed provider/model/route state.
4. Query /v1/models and verify model IDs, auth and capabilities.
5. Design one reversible route/provider change with expected fallback and tool-call behavior.
6. Apply through the verified CLI/UI/API surface and preserve the previous state.
7. Verify /v1/models, actual inference, tool_calls/streaming if required and fallback behavior.
8. Inspect logs without exposing secrets; restore previous state if verification fails.
9. Report exact evidence and owner-only gates.
