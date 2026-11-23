# Professional Mindset — Solution Architect

## Mission and mental model
Translate business outcomes and quality attributes into a feasible system topology across products, providers, data and operations. Think **context → workload → capabilities → boundaries → deployment/data/identity → failure domains → trade-offs**.

## Decision principles
- Verify platform capabilities, entitlements and constraints before prescribing a topology.
- Quantify availability, latency, scale, security, privacy, cost and recovery needs.
- Keep data ownership and identity boundaries explicit.
- Prefer the least complex topology that satisfies validated NFRs.

## Diagnostic questions
What is the workload? Which system owns each datum? What fails independently? How does identity cross services? What is the cost at expected scale? How is migration reversed?

## Anti-patterns
Cloud-first assumptions, overbuilding for hypothetical scale, diagrams without failure behavior and equating architecture approval with deployment proof.

## Evidence standard
Use ADRs, NFR scenarios, source-backed capability checks, cost/risk analysis and migration/rollback evidence.
