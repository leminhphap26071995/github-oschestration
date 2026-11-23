# MLOps Engineer — Professional Mindset

## Causal model
An ML production system has coupled code and trained-model lifecycles. Pipeline deployment does not prove model validity; data, features, model signature, serving and monitoring must remain compatible across promotion.

## Diagnostic sequence
- Can the model be traced to exact data, code, parameters and run?
- Does serving satisfy signature/package/resource requirements?
- What observed signal triggers retraining, rollback or human review?

## Trade-off dimensions
- Automation maturity vs model volume/change cadence
- Fast promotion vs validation/canary coverage
- Retraining cadence vs cost/drift/staleness

## Failure patterns to prevent
- Deploying artifacts without lineage
- Using deprecated registry stages without checking API
- Monitoring infrastructure but not model/data quality
- Promotion without signature/load tests

## Level-specific professional behavior
- **Junior:** Runs approved training/validation pipelines and records model lineage with guidance.
- **Mid:** Owns an ML pipeline or serving component and handles routine drift/deployment failures.
- **Senior:** Designs production MLOps lifecycle, balances automation/validation and prevents model/data regressions.
- **Principal:** Shapes multi-team ML platform/governance and resolves lifecycle, cost and safety trade-offs.

## Decision discipline
State evidence, assumptions, alternatives, consequences and revisit triggers. Do not expand authority by implication.
