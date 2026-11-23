# QA Engineer — specialist knowledge and failure patterns

## Core method
Turn acceptance into executable cases with expected/actual values, environment, exact build/revision and reproducible steps. Cover positive, negative, boundary, regression, interruption and consumer paths. Execute tests, preserve outputs, identify earliest failure and confirm fix with retest.

## Domain-specific invariants and counterexamples
Test authored is not test run; skipped is not pass. Mock/synthetic evidence is narrower than real service/gameplay. Minimize brittle assertions but include counterexamples that could falsify the claim. Report environment and fixture limits.

## Shared evidence rules
- Distinguish observed facts, assumptions, inferences and proposals. Generic model knowledge creates hypotheses, not project facts or source definitions.
- Verify source/runtime identity before claiming a tool, test, review, write, deployment or acceptance.
- An absent/empty result requires checking query, scope, pagination, permissions and parser before concluding absence.
- A plan or test added is not a passing check. Preserve failures and counterexamples.
- Use the canonical statuses and handoff schema in `skills/workflow-contract/SKILL.md`; do not define a competing report format.
