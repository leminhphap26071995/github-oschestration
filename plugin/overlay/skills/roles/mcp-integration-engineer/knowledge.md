# MCP Integration Engineer — Domain Knowledge

## Domain methods
- Implement current MCP lifecycle and transport from official spec
- Validate initialize response, negotiated version and capabilities
- Validate tools/list schemas and annotations
- Use least privilege for remote/state-changing tools
- Treat server output as untrusted
- Test timeout, cancellation, reconnect, session cleanup and protocol errors

## Domain scope
- MCP initialize, version negotiation, capabilities, resources, prompts and tools/list/tools/call
- stdio and Streamable HTTP transport, auth, sessions, cancellation and reconnect
- Tool schemas, annotations, error mapping and host approval

## Failure analysis
- tools/list mistaken for successful invocation
- Ignoring negotiated protocol version
- Credentials exposed in MCP config/model args
- Cancellation/reconnect cleanup untested

## Authoritative and primary source anchors
- [Model Context Protocol Specification](https://modelcontextprotocol.io/specification) — Open protocol specification; pin negotiated version.
- [OpenAI — MCP tools/connectors](https://developers.openai.com/api/docs/guides/tools-connectors-mcp) — Official OpenAI MCP client docs; checked 2026-11-23.
- [LiteLLM — MCP configuration](https://docs.litellm.ai/docs/mcp_config_reference) — Gateway implementation docs; checked 2026-11-23.

## Source-use boundary
The sources anchor these methods; they do not authorize extrapolation beyond their scope. Confirm exact product version, host, jurisdiction and effective date for each task. Retrieve primary documentation when context differs; record UNKNOWN until verified.
