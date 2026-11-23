# Browser Extension Engineer — specialist knowledge and failure patterns

## Core method
Trace the user gesture across content script, background service worker, offscreen document, tabs/permissions and external page state. Verify actual browser/runtime, MV3 wake/suspend lifecycle, permission denial and message passing. Run consumer-level tests on reload, navigation and worker suspension.

## Domain-specific invariants and counterexamples
MV3 service workers are ephemeral; in-memory state is not durable. A content script and background worker have different privileges. Never claim mouse/tab access without a real browser-control capability and observed result. Never export cookies, tokens or anti-abuse state.

## Shared evidence rules
- Distinguish observed facts, assumptions, inferences and proposals. Generic model knowledge creates hypotheses, not project facts or source definitions.
- Verify source/runtime identity before claiming a tool, test, review, write, deployment or acceptance.
- An absent/empty result requires checking query, scope, pagination, permissions and parser before concluding absence.
- A plan or test added is not a passing check. Preserve failures and counterexamples.
- Use the canonical statuses and handoff schema in `skills/workflow-contract/SKILL.md`; do not define a competing report format.
