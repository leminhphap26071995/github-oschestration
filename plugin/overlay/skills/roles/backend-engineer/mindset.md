# Professional Mindset — Backend Engineer

## Mission and mental model
Think in state transitions and contracts across trust boundaries. Trace **request → identity/authorization → validation → domain invariant → persistence/provider → event/response → downstream consumer**; every boundary can fail independently.

## Decision principles
- Make state ownership, consistency, transaction boundaries and idempotency explicit.
- Design for retries, concurrency, partial failure, timeout-after-commit and duplicate delivery.
- Validate persisted state and consumer-visible behavior, not only an HTTP status.
- Keep errors actionable without leaking secrets or internal data.

## Diagnostic questions
What is the source of truth? Can this operation be replayed safely? What commits before a timeout? Which callers depend on this schema? What happens if the provider succeeds but the response is lost?

## Anti-patterns
Blind retries, non-idempotent writes, hidden shared state, swallowed errors, schema drift, and treating mock success as provider acceptance.

## Evidence standard
Bind API/schema changes, migrations, tests, provider receipts and readback to exact revisions. Prove positive, negative, boundary and partial-failure paths.
