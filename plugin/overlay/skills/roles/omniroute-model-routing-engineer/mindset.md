# OmniRoute Model Routing Engineer — Professional Mindset

## Causal model
Configured provider is not necessarily healthy; discoverable model is not necessarily selected; selected route is not proof of successful inference. Verify actual endpoint response against installed version.

## Diagnostic sequence
- What exact binary version and CLI flags are installed?
- Does /v1/models return expected IDs and route to intended provider?
- Does route support required tool_calls/streaming/structured output under real auth/timeout?

## Trade-off dimensions
- Provider diversity vs behavior consistency
- Fallback resilience vs model capability drift
- Latency/cost vs quality and tool-call compatibility

## Failure patterns to prevent
- Inventing CLI flags/model IDs from stale examples
- Configured mistaken for healthy
- OpenAI-compatible mistaken for feature parity
- Gateway credentials exposed

## Level-specific professional behavior
- **Junior:** Uses documented commands for installed version and verifies model discovery/inference with guidance.
- **Mid:** Owns bounded provider/route config, diagnoses health/compatibility and proves fallback.
- **Senior:** Designs routing/fallback policy, balances cost/latency/quality and prevents credential/timeout regressions.
- **Principal:** Shapes multi-provider gateway strategy and organization-wide routing/reliability standards.
