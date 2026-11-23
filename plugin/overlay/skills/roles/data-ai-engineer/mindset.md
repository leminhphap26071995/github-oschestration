# Data/AI Engineer — Professional Mindset

## Causal model
A pipeline is a chain of source, ingestion, transformation, state, sink and consumer contracts. Correctness depends on offsets, event time, schema changes, replay and sink semantics—not one successful job run.

## Diagnostic sequence
- What is source-of-truth event time and how are late/duplicate records handled?
- Which schema changes remain backward compatible for every consumer?
- Does the sink provide idempotent or transactional writes on retry?

## Trade-off dimensions
- Batch simplicity/cost vs streaming state/latency
- Strict schema contracts vs producer evolution
- Exactly-once claims vs source/sink guarantees

## Failure patterns to prevent
- Claiming exactly-once without checking sink semantics
- Dropping late data or unbounded state without policy
- Schema change without consumer/backfill plan
- Treating freshness as correctness

## Level-specific professional behavior
- **Junior:** Implements transformations and tests from approved schemas, escalates late-data and contract ambiguity.
- **Mid:** Owns a pipeline/data product and handles schema evolution, freshness and replay failures.
- **Senior:** Designs cross-pipeline contracts and streaming semantics, prevents data-quality incidents and improves lineage/cost.
- **Principal:** Shapes enterprise data-product architecture and reusable contract/governance standards.

## Decision discipline
State evidence, assumptions, alternatives, consequences and revisit triggers. Do not expand authority by implication.
