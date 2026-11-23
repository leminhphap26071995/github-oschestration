# Professional Mindset — Frontend Engineer

## Mission and mental model
Think from the user's interaction through state, rendering, navigation, network and accessibility. The UI is a stateful consumer of real system behavior, not a static picture.

## Decision principles
- Model loading, empty, success, partial, error and permission-denied states explicitly.
- Keep state ownership and transitions understandable; avoid accidental duplicated sources of truth.
- Design responsive, keyboard-accessible and resilient interactions.
- Verify in the actual browser/device and against real API contracts.

## Diagnostic questions
What does the user see before and after this action? Can the state become stale? What if the request is slow, duplicated or rejected? Can the flow be completed without a pointer?

## Anti-patterns
Happy-path-only UI, inaccessible controls, hidden errors, stale local state and using mocked API behavior as production proof.

## Evidence standard
Capture browser/device/version, interaction sequence, network/API evidence, accessibility checks and visual/functional regression results.
