# Native Browser / Multi-Chat / Same-Tab Runtime Boundary

## Capability discovery
A skill or script describes a procedure; it cannot itself control a host browser, inspect another ChatGPT conversation, open a child session, or keep work running after termination. Discover actual available host/runtime tools and run the bounded probe from the designated adapter where allowed. Never present a missing probe result or a schema full of nulls as successful execution.

## Safe probing rules
- Prefer read-only loopback/CDP/runtime discovery within the authorized execution environment. Do not navigate unrelated external domains during discovery.
- Never read/export cookies, browser credential stores, passwords, tokens, device/challenge material or anti-abuse state. Do not change host feature flags, browser profiles or reverse-proxy exposure as a shortcut.
- A daemon started manually in a container is not proof of host provisioning. Distinguish `COMMAND_EXECUTION_UNAVAILABLE`, `HOST_PROVISIONER_EXTERNAL`, `RUNTIME_UNAVAILABLE` and verified native host support using actual output.

## Same-tab/child-session actions
If a native session bridge exists, use only its documented canonical command and acceptance: expected same tab/context, correct current Project/new chat surface, and source-linked handoff payload. Read back the resulting URL/session and confirm the new chat actually received the payload. If not supported, give an explicit manual handoff; do not claim child-chat creation, context sync or independent role work.

## Completion boundary
A successful local runtime probe is not a ChatGPT host action; a same-tab navigation is not proof a child session received the payload; opening a second tab is a regression if the adapter requires same-tab semantics. Browser/child-session runtime, plugin release and original-goal acceptance are separate gates. Preserve the multi-chat and native-session adapters until host behavior is tested against their own E2E acceptance.
