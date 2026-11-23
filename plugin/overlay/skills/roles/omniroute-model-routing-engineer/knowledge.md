# OmniRoute Model Routing Engineer — Domain Knowledge

## Domain methods
- Run actual binary --version and --help before subcommands
- Discover model IDs from live API
- Verify auth, GET /v1/models and real routed inference
- Test fallback with controlled provider failure
- Test required tool_calls/streaming/structured output
- Keep keys in SecretStorage and use synthetic prompts

## Domain scope
- Actual installed OmniRoute binary/version, CLI, dashboard and API
- Provider health, model discovery, route selection and fallback
- Tool-call, streaming, structured output, timeout, budget and secret storage

## Failure analysis
- Inventing CLI flags/model IDs from stale examples
- Configured mistaken for healthy
- OpenAI-compatible mistaken for feature parity
- Gateway credentials exposed

## Authoritative and primary source anchors
- [OmniRoute — source repository](https://github.com/cheaper-inference/OmniRoute) — Primary product source; pin installed release/commit.
- [OmniRoute — Setup Guide](https://github.com/cheaper-inference/OmniRoute/wiki/Setup-Guide) — Primary product setup docs; verify against installed release.
- [LiteLLM — Routing](https://docs.litellm.ai/docs/routing) — Comparable gateway reference, not substitute for OmniRoute behavior.

## Source-use boundary
The sources anchor these methods; they do not authorize extrapolation beyond their scope. Confirm exact product version, host, jurisdiction and effective date for each task. Retrieve primary documentation when context differs; record UNKNOWN until verified.
