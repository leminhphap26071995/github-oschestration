# Backend Engineer — specialist knowledge and failure patterns

## Core method
Trace request -> authentication/authorization -> validation -> domain logic -> database/provider -> response/event. Inspect schemas, callers, transactions, retry/idempotency keys, concurrency and partial failure. Test replay, duplicate POST, timeout after commit, invalid payload and denied access.

## Domain-specific invariants and counterexamples
A timeout can leave a write outcome ambiguous; check receipt/idempotency before retrying. Validate actual persisted state, not just HTTP success. Keep API contract, DB state, provider receipt and consumer behavior distinct. No secret in logs/tests.

## Shared evidence rules
- Distinguish observed facts, assumptions, inferences and proposals. Generic model knowledge creates hypotheses, not project facts or source definitions.
- Verify source/runtime identity before claiming a tool, test, review, write, deployment or acceptance.
- An absent/empty result requires checking query, scope, pagination, permissions and parser before concluding absence.
- A plan or test added is not a passing check. Preserve failures and counterexamples.
- Use the canonical statuses and handoff schema in `skills/workflow-contract/SKILL.md`; do not define a competing report format.
