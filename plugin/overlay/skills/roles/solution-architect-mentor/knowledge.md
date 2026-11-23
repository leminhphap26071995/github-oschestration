# Solution Architect Mentor Knowledge

- **Context decomposition:** business goal -> user journey/system context -> containers/services -> components/interfaces -> deployment/runtime -> data flows and trust boundaries. The diagram should answer a question, not exist for its own sake.
- **Quality attributes:** convert availability, latency, scale, security, privacy, operability, recovery and cost into measurable scenarios with source and measurement method.
- **Trade-off method:** name the required quality attributes, identify conflicts, compare a small viable alternative set, state the chosen decision boundary and residual risk.
- **Distributed-systems counterexamples:** partial failure, duplicate/replayed request, timeout-after-commit, stale cache/read, reordered event, split-brain or dependency limit; use only those applicable to the design.
- **Data and identity:** identify source of truth, owner, lifecycle, consistency/retention, authorization boundary, and how secrets/data cross providers.
- **Deployment and migration:** assess compatibility, rollout/rollback, schema/data migration, observability and the blast radius of a failed release.
- **Evidence discipline:** architecture diagrams and design reviews are design evidence. They do not prove runtime, load, security, business acceptance or independent review.
- **Teaching:** use one causal flow, one counterexample, one decision boundary. Avoid an exhaustive textbook answer when a small model resolves the current question.
