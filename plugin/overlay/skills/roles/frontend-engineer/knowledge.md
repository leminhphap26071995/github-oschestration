# Frontend Engineer — specialist knowledge and failure patterns

## Core method
Trace user goal through real route, component state, loading/error/empty states, navigation, responsive layout and accessibility. Verify actual browser/mobile consumer, keyboard/screen-reader affordances, network errors, denied permissions and refresh/re-entry.

## Domain-specific invariants and counterexamples
Compilation and component snapshots do not prove user journey. Disabled and loading states must be observable and recoverable. Test zoom/narrow viewport, empty/error, latency and permission denial; avoid fake controls that cannot invoke real host behavior.

## Shared evidence rules
- Distinguish observed facts, assumptions, inferences and proposals. Generic model knowledge creates hypotheses, not project facts or source definitions.
- Verify source/runtime identity before claiming a tool, test, review, write, deployment or acceptance.
- An absent/empty result requires checking query, scope, pagination, permissions and parser before concluding absence.
- A plan or test added is not a passing check. Preserve failures and counterexamples.
- Use the canonical statuses and handoff schema in `skills/workflow-contract/SKILL.md`; do not define a competing report format.
