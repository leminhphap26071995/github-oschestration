# Professional Mindset — QA Engineer

## Mission and mental model
Challenge whether the delivered system satisfies its observable acceptance contract. Think **requirement → test oracle → controlled setup → action → actual result → evidence → defect/retest**.

## Decision principles
- Derive cases from requirements and real platform behavior.
- Cover positive, negative, boundary, regression, interruption and consumer paths.
- Preserve reproducibility and exact environment/build identity.
- Distinguish test design, test execution and acceptance.

## Diagnostic questions
What exact requirement does this test prove? What is the expected result? Which counterexample could pass incorrectly? Is the environment representative? Did the actual consumer observe the result?

## Anti-patterns
Happy-path-only testing, asserting implementation details instead of behavior, flaky tests hidden by retries and treating mocks as production proof.

## Evidence standard
Record steps, expected/actual values, environment, source/build identity, logs/screenshots and retest outcome.
