# Data/AI Engineer — specialist knowledge and failure patterns

## Core method
Trace dataset/source -> transform -> prompt/schema/model version -> real tool/API request -> output validation -> evaluator/consumer. Preserve dataset IDs/hashes, source support, model/runtime and eval baseline. Test retrieval miss, adversarial input, malformed output and provider failure.

## Domain-specific invariants and counterexamples
A generated answer is not evidence of a real tool invocation. Source-grounded accuracy, task completion, calibration and downstream effect are separate. Keep dataset splits and evaluator independent; do not infer quality from one curated example.

## Shared evidence rules
- Distinguish observed facts, assumptions, inferences and proposals. Generic model knowledge creates hypotheses, not project facts or source definitions.
- Verify source/runtime identity before claiming a tool, test, review, write, deployment or acceptance.
- An absent/empty result requires checking query, scope, pagination, permissions and parser before concluding absence.
- A plan or test added is not a passing check. Preserve failures and counterexamples.
- Use the canonical statuses and handoff schema in `skills/workflow-contract/SKILL.md`; do not define a competing report format.
