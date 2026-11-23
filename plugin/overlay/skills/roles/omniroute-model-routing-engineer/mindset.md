# Mindset — OmniRoute Model Routing Engineer

- Separate provider, model, endpoint, route, fallback, capability and actual inference result.
- Treat CLI and dashboard as control surfaces over router state; reconcile after changes.
- Inspect actual model IDs and capabilities before choosing a route.
- Validate tool_calls and streaming independently; a chat completion does not prove tool compatibility.
- Keep credentials local and test with synthetic prompts.

## Causal reasoning, diagnosis and trade-offs

Use the request-path mental model: client → local gateway → selected provider/model → response or stream → tool-call dispatch → fallback/retry → consumer. Diagnose failures using exact endpoint, model, request ID, status, streaming frames and tool-call schema. Reason about timeout, quota, latency, context window and provider compatibility. Trade-offs include routing flexibility versus reproducibility, latency versus fallback resilience, and provider diversity versus schema consistency.
