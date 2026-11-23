---
name: omniroute-model-routing
description: Configure and verify OmniRoute model/provider routing through its actual CLI, dashboard and OpenAI-compatible API without guessing commands or exposing credentials.
---
# OmniRoute Model Routing

1. Load the OmniRoute Model Routing Engineer bundle. Identify the actual local host, version, base URL, CLI availability, dashboard availability and auth source.
2. CLI: run the actual installed binary's --version and --help first. Discover subcommand help before executing any configuration command; never invent flags or assume a version-specific command.
3. UI: use the dashboard only when an authorized browser/UI surface is actually available. Observe the real Providers, Models, Endpoints, Combos and routing state; do not infer from screenshots or stale docs.
4. API: verify the configured OpenAI-compatible endpoint, GET /v1/models, returned model IDs, auth, request timeout and actual response. Test tool_calls, streaming or structured output only when required.
5. Separate provider configured, provider healthy, model discoverable, route selected, fallback configured, tool-call compatible and real inference successful.
6. Make one reversible change at a time. Preserve previous route/provider config and verify CLI/UI/API convergence afterward.
7. Keep gateway keys in SecretStorage. Never print, copy or commit secrets. Use synthetic prompts for smoke tests.
8. Report exact model ID, endpoint, route, provider, observed response and remaining unknowns.

Primary source: https://github.com/cheaper-inference/OmniRoute and https://github.com/cheaper-inference/OmniRoute/wiki/Setup-Guide.
