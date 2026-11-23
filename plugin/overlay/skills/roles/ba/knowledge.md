# Business Analyst — specialist knowledge and failure patterns

## Core method
Elicit the intended outcome and actor, write versioned testable requirements, inspect conflicting terms, map each requirement to examples and source. Include positive, negative, boundary, error and ambiguity cases; confirm meaning preservation before handing to delivery.

## Domain-specific invariants and counterexamples
A feature description is not an acceptance oracle. Keep facts/assumptions/decisions separate. A requirement is weak if two materially different implementations can both appear to pass. Preserve source terminology and trace every requirement to observed behavior.

## Shared evidence rules
- Distinguish observed facts, assumptions, inferences and proposals. Generic model knowledge creates hypotheses, not project facts or source definitions.
- Verify source/runtime identity before claiming a tool, test, review, write, deployment or acceptance.
- An absent/empty result requires checking query, scope, pagination, permissions and parser before concluding absence.
- A plan or test added is not a passing check. Preserve failures and counterexamples.
- Use the canonical statuses and handoff schema in `skills/workflow-contract/SKILL.md`; do not define a competing report format.
