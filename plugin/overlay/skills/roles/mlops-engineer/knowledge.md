# MLOps Engineer — Domain Knowledge

## Domain methods
- Use CI for pipeline code and CT for data/training changes
- Track run, dataset, parameters and artifact lineage
- Use registry aliases/tags and environment controls
- Validate serving signature, dependencies, latency and resources
- Monitor data/model drift, quality, latency and cost
- Use canary/shadow evaluation and reversible rollback

## Domain scope
- Data/model pipeline orchestration, CI/CD/CT and experiment lineage
- Model registry, versioning, promotion, serving and rollback
- Model/data monitoring, drift triggers and retraining operations

## Failure analysis
- Deploying artifacts without lineage
- Using deprecated registry stages without checking API
- Monitoring infrastructure but not model/data quality
- Promotion without signature/load tests

## Authoritative and primary source anchors
- [Google Cloud — MLOps continuous delivery](https://docs.cloud.google.com/architecture/mlops-continuous-delivery-and-automation-pipelines-in-machine-learning) — Official architecture guidance; last reviewed 28 Aug 2024.
- [MLflow — Model Registry](https://www.mlflow.org/docs/latest/registry/) — Official model lifecycle docs; checked 2026-11-23.
- [NIST — AI Risk Management Framework](https://www.nist.gov/itl/ai-risk-management-framework) — AI RMF 1.0 lifecycle risk framework.
