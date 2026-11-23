# Data/AI Engineer — Domain Knowledge

## Domain methods
- Define contracts for schema, semantic meaning, freshness and quality
- Use dbt tests to express failing-row assertions
- Track source freshness separately from transformation tests
- For streaming, reason about offsets, checkpoints, watermarks, replay and sink idempotency
- Maintain lineage from source through served consumer
- Test backfill, duplicates, late events and schema evolution

## Domain scope
- Batch/stream ingestion, transformation, orchestration and schema evolution
- Data quality, freshness, lineage, replay, deduplication and serving
- Feature/data preparation and model-serving integration

## Failure analysis
- Claiming exactly-once without checking sink semantics
- Dropping late data or unbounded state without policy
- Schema change without consumer/backfill plan
- Treating freshness as correctness

## Authoritative and primary source anchors
- [dbt — Data Tests](https://docs.getdbt.com/docs/build/data-tests) — Official data transformation docs; checked 2026-11-23.
- [dbt — Source Freshness](https://docs.getdbt.com/docs/deploy/source-freshness) — Official data freshness docs; checked 2026-11-23.
- [Apache Spark — Structured Streaming](https://spark.apache.org/docs/latest/streaming/getting-started.html) — Official Apache Spark docs; checked 2026-11-23.

## Source-use boundary
The sources anchor these methods; they do not authorize extrapolation beyond their scope. Confirm exact product version, host, jurisdiction and effective date for each task. Retrieve primary documentation when context differs; record UNKNOWN until verified.
