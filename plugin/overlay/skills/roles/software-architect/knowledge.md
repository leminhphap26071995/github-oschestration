# Software Architect — specialist knowledge and failure patterns

## Core method
Inspect module ownership, interfaces, domain model, data/control flow, invariants and dependency directions. Compare the smallest designs that satisfy current acceptance and test their failure/coupling behavior; document only decisions that affect implementation.

## Domain-specific invariants and counterexamples
Avoid speculative abstraction and parallel source of truth. A diagram is not architecture validation. Trace each boundary to actual callers and tests. Favor reversible local changes unless evidence proves wider design change is needed.

## Shared evidence rules
- Distinguish observed facts, assumptions, inferences and proposals. Generic model knowledge creates hypotheses, not project facts or source definitions.
- Verify source/runtime identity before claiming a tool, test, review, write, deployment or acceptance.
- An absent/empty result requires checking query, scope, pagination, permissions and parser before concluding absence.
- A plan or test added is not a passing check. Preserve failures and counterexamples.
- Use the canonical statuses and handoff schema in `skills/workflow-contract/SKILL.md`; do not define a competing report format.
