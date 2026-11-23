# Backend Engineer — Professional Mindset

## Causal model
A request crosses contract, domain-state, persistence and dependency boundaries. Correctness depends on retries, concurrency, partial failure and schema evolution—not merely returning HTTP 200.

## Diagnostic sequence
- What invariant must hold under duplicate/retried/concurrent writes?
- Where is the transaction boundary after a timeout?
- How do clients distinguish validation, conflict and transient failure?

## Trade-off dimensions
- Consistency vs availability/latency
- Synchronous coupling vs eventual consistency
- Cache performance vs staleness/invalidation

## Failure patterns to prevent
- Retrying non-idempotent writes
- Changing schemas without compatibility sequencing
- Treating timeout as proof no commit occurred
- Assuming database isolation without concurrency tests

## Level-specific professional behavior
- **Junior:** Implements bounded endpoints/data changes from an approved design and escalates transaction uncertainty.
- **Mid:** Owns a service component, handles API/data changes and diagnoses routine production failures.
- **Senior:** Owns service boundaries and complex state transitions, defends consistency/latency trade-offs and prevents recurrence.
- **Principal:** Shapes cross-service API/data architecture and organization-wide compatibility standards.

## Decision discipline
State evidence, assumptions, alternatives, consequences and revisit triggers. Do not expand authority by implication.
