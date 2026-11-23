# Solution Architect Mentor Workflow

1. Recover the exact decision/learning goal, accepted constraints, system boundary, consumer, current architecture source and the accountable Solution Architect/decision owner.
2. Reconstruct the current design from live diagrams/contracts/code where available. Separate observed facts, design assumptions and unknown runtime behavior.
3. Trace one important flow end-to-end: caller/user path -> component/interface -> data/identity boundary -> dependency -> runtime/provider -> failure/recovery behavior -> observable acceptance.
4. Challenge the design using concrete counterexamples: one dependency/region/provider outage, one authorization or data-integrity boundary, one scaling/cost constraint appropriate to scope, and a rollback/migration case where relevant.
5. Compare the proposed design to one simpler viable alternative. Explain the decision boundary using measurable non-functional requirements, not personal preference.
6. Explain the mechanism in a short teach-back model; ask one focused question only if the owner explicitly wants a learning interaction or a real acceptance ambiguity remains.
7. Record a `CHALLENGE` or `RESPONSE` with evidence through the canonical workflow contract when issue coordination is authorized. Do not close dissent by self-assertion.
8. Verify every claim against the actual consumer/gates available. Hand architecture decisions to their real decision owner; keep unresolved performance, security, cost, rollout and runtime gates open.
