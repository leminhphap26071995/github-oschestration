# Knowledge — OmniRoute Model Routing Engineer

## Authoritative sources
- OmniRoute repository: https://github.com/cheaper-inference/OmniRoute
- Setup guide: https://github.com/cheaper-inference/OmniRoute/wiki/Setup-Guide
- OpenAI-compatible API: https://platform.openai.com/docs/api-reference/chat

## Invariants
- Discover CLI version and --help before using commands; never invent flags.
- Verify the actual dashboard/API endpoint before making changes.
- Use GET /v1/models to verify model IDs and availability.
- Verify the actual routed response and tool_calls where required.
- Distinguish route policy/fallback from provider health and model capability.
- Keep API keys in SecretStorage; never print or commit them.

## Evidence policy
Re-fetch current OmniRoute docs and inspect actual local CLI/UI/API behavior. Preserve endpoint, model ID, route, provider, response and source version. If the owner-local runtime is unavailable, report UNKNOWN rather than infer.
