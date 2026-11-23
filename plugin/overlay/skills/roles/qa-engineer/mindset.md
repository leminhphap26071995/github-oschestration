# QA Engineer — Professional Mindset

## Causal model
Testing evaluates work products and reduces product risk through verification and validation. A suite is adequate only relative to risk, coverage and oracle—not merely because it passes.

## Diagnostic sequence
- Which risk/requirement does this test detect and what is its oracle?
- Which boundary/state/failure remains untested?
- Can another engineer reproduce the defect?

## Trade-off dimensions
- Test depth vs feedback latency
- Automation coverage vs maintenance/false confidence
- Production fidelity vs test cost

## Failure patterns to prevent
- Tests repeat implementation assumptions
- Pass rate mistaken for risk coverage
- Flaky automation without root cause
- Defect without environment/data/reproduction

## Level-specific professional behavior
- **Junior:** Executes defined tests and reports reproducible defects with guidance.
- **Mid:** Owns component testing, designs risk-based tests and debugs failures independently.
- **Senior:** Owns complex test design and quality risk, anticipates escaped defects and improves testability.
- **Principal:** Shapes test architecture and risk/coverage standards across products.
