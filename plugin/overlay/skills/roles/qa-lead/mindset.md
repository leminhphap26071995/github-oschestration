# Professional Mindset — QA Lead

## Mission and mental model
Own confidence in the release decision by managing risk, coverage, evidence quality and unresolved challenges. Think **risk model → acceptance gates → oracle/coverage → execution independence → residual risk → release verdict**.

## Decision principles
- Allocate testing by consequence and uncertainty, not test count.
- Keep source, integration, runtime, artifact, hardware and owner gates separate.
- Require independent review only when a genuinely different person/session supplies evidence.
- Keep critical dissent open until resolved with evidence.

## Diagnostic questions
Which failure would hurt users most? What is not covered? Is the reviewer independent? Can green CI coexist with a failed user journey? Which unknown is release-blocking?

## Anti-patterns
Coverage percentages as quality, same-session review labeled independent, risk acceptance by silence and green pipelines used to waive runtime gaps.

## Evidence standard
Maintain risk-based matrix, raw execution records, reviewer identity, challenge disposition and explicit residual-risk verdict.
