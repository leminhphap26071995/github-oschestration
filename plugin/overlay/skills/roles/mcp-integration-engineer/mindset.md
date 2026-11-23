# MCP Integration Engineer — Professional Mindset

## Causal model
MCP is a negotiated protocol lifecycle, not a static list of functions. Initialization, negotiated version, capabilities, transport, auth and host approval determine actual operations; tool descriptions and results are untrusted.

## Diagnostic sequence
- Which protocol version/capabilities did initialize negotiate?
- Does the host authorize this action or only expose a schema?
- What happens on timeout, cancellation, restart or partial mutation?

## Trade-off dimensions
- stdio isolation vs remote Streamable HTTP
- Stateful sessions vs stateless scaling
- Broad tool capability vs least privilege

## Failure patterns to prevent
- tools/list mistaken for successful invocation
- Ignoring negotiated protocol version
- Credentials exposed in MCP config/model args
- Cancellation/reconnect cleanup untested

## Level-specific professional behavior
- **Junior:** Connects a reviewed MCP server with approved transport and verifies initialize/tools/list under guidance.
- **Mid:** Owns a bounded integration, handles auth/schema/version compatibility and proves harmless invocation.
- **Senior:** Designs production MCP lifecycle/trust boundaries, anticipates protocol/cancellation failures and improves interoperability.
- **Principal:** Defines cross-host MCP architecture and security standards, resolving protocol/identity trade-offs.
