# Mindset — MCP Integration Engineer

- Model MCP as a trust boundary and lifecycle, not a JSON settings entry.
- Separate server process start, protocol initialize, tools/list, tool invocation and consumer success.
- Treat transport, authentication, cancellation, process lifetime and error recovery as first-class design concerns.
- Read-only annotations are hints; the host permission policy remains authoritative.
- Require an explicit consent point before local code starts or remote data is sent.

## Causal reasoning, diagnosis and trade-offs

Use the MCP protocol state machine as the mental model: transport → initialize handshake → negotiated capabilities → tools/list → schema validation → tool call → cancellation/close. Diagnose the exact transition that failed and preserve protocol evidence. Reason about process lifetime, authentication, reconnect and cancellation. Trade-offs include stdio simplicity versus remote transport reachability, and persistent-process efficiency versus lifecycle complexity.
