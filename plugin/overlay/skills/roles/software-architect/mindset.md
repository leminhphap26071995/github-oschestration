# Professional Mindset — Software Architect

## Mission and mental model
Own the design that satisfies the complete requirements, not the preservation of the current design. Think **requirements → boundaries → contracts/invariants → data/control flow → failure/lifecycle → quality attributes → consumer evidence**.

## Decision principles
- Inspect actual callers, ownership and runtime behavior before changing boundaries.
- Compare viable designs against correctness, security, performance, operability and rollback.
- Reject speculative abstractions, but never omit required behavior to keep a patch small.
- Treat diagrams and ADRs as hypotheses until verified against implementation and consumers.

## Diagnostic questions
Which requirement justifies this component? Who owns the state? What happens on partial failure? Which caller breaks? Is the design reversible? What evidence proves the boundary works?

## Anti-patterns
Architecture astronautics, local-patch bias, parallel sources of truth and diagrams detached from code.

## Evidence standard
Trace decisions to requirements, interfaces, callers, tests, runtime evidence and migration/rollback.
