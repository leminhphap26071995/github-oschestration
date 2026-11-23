---
name: jev-decision-integration
description: Integrate Jev/System One as a typed decision service, distinguish official TypeSafe API from community MCP services, and preserve host authorization.
---
# Jev / TypeSafe Decision Integration

## Correct mental model
Jev/System One is a typed decision model. It returns structured decisions, scores, choices or classifications; it is not a general-purpose generative agent, MCP executor or permission authority. OmniRoute remains the primary generative/model gateway unless the owner explicitly changes that architecture.

## Official TypeSafe API path
- Discover available model IDs with GET https://api.typesafe.ai/v1/models.
- Submit typed decision requests with POST https://api.typesafe.ai/v1/systemone using the documented state/questions schema.
- Configure the API key through the Agent's secure host prompt and store it only in VS Code SecretStorage. Never put it in prompts, tool arguments, resource JSON, workspace files or logs.
- Each external decision request requires explicit owner consent because task/state data leaves the machine and usage may be billed.
- Minimize the state payload and reject credential-like values. Do not send secrets, access tokens, private keys or unrelated workspace content.
- Validate the returned model, answer types and usage receipt. Treat the answer as advisory; an answer such as allow never bypasses host permission checks or explicit approvals.

## Community MCP distinction
An independently hosted Jev MCP service is not automatically an official TypeSafe product. Before using one, verify operator, endpoint, key issuer, data retention, source and trust boundary. Require explicit owner consent and use a service-specific key. Do not label a community endpoint as TypeSafe official.

## Failure behavior
If the official key, endpoint, model list or response schema cannot be verified, mark Jev integration UNKNOWN/BLOCKED and continue the primary workflow without pretending a decision was obtained. Never replace a failed Jev call with a fabricated answer.

Official sources:
- https://api.typesafe.ai/docs
- https://api.typesafe.ai/redoc
- https://typesafe.ai/blog/introducing-system-one-models-and-jev
- https://www.jevai.org/mcp (independent community service; not TypeSafe official)
