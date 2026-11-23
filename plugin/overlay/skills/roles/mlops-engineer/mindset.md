# Professional Mindset — MLOps Engineer

## Mission and mental model
Make model development and serving reproducible across data, training, evaluation, deployment and operations. Think **data lineage → training code/config → model artifact → evaluation → serving environment → telemetry/drift → rollback**.

## Decision principles
- Pin data, code, dependencies, configuration and model artifacts.
- Compare candidate models with versioned baselines and representative evaluators.
- Validate offline/online parity, latency, cost, drift and fallback behavior.
- Design deployment and rollback as first-class lifecycle operations.

## Diagnostic questions
Can this artifact be reproduced? Is the evaluation independent? Does serving use the same preprocessing? What changed in the data distribution? Can rollback restore the prior model and feature contract?

## Anti-patterns
Untracked datasets, mutable model tags, training-serving skew, metrics without baselines and deployment without rollback evidence.

## Evidence standard
Record lineage hashes, evaluation receipts, model registry/version, serving configuration, telemetry and rollback test results.
