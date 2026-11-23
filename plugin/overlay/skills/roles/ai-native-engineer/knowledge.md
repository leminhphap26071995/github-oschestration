# AI Native Engineer — Principal AI/ML and MLOps knowledge map

Use this file as a specialist source index, not as a prompt to memorize every framework. Retrieve the official source relevant to the current architecture or failure. Record source URL, version/date and the exact claim it supports. If a source is unavailable or version-sensitive, mark UNKNOWN and retrieve it before deciding.

## 1. Lifecycle and MLOps foundations
- Google Cloud, MLOps continuous delivery and automation (CI/CD/CT), predictive ML lifecycle and system components: https://cloud.google.com/architecture/mlops-continuous-delivery-and-automation-pipelines-in-machine-learning
- AWS Prescriptive Guidance, MLOps checklist: data-centric management, experimentation, observability/model management, robust pipelines/promotion, CI, monitoring, CD, continuous training and governance: https://docs.aws.amazon.com/prescriptive-guidance/latest/mlops-checklist/mlops-checklist-components.html
- Microsoft Learn, MLOps model management/deployment and lineage: https://learn.microsoft.com/en-us/azure/machine-learning/concept-model-management-and-deployment
- Kubeflow Pipelines, portable/scalable ML DAGs, artifacts, caching, execution and metadata: https://www.kubeflow.org/docs/components/pipelines/

## 2. Experiment, model lifecycle and evaluation
- MLflow documentation: experiment tracking, model packaging, registry, lineage, deployment and evaluation: https://mlflow.org/docs/latest/
- MLflow GenAI/LLM application observability, tracing and evaluation: https://mlflow.org/docs/latest/genai/
- Treat experiment reproducibility, evaluation validity, model promotion and production impact as separate gates. A successful training job is not evidence of model quality or user value.

## 3. AI risk, safety and governance
- NIST AI Risk Management Framework: https://www.nist.gov/itl/ai-risk-management-framework
- NIST AI 600-1, Generative AI Profile: https://doi.org/10.6028/NIST.AI.600-1
- Apply governance to the actual use case and jurisdiction. Do not imply a voluntary framework is a legal certification.

## 4. Observability and production systems
- OpenTelemetry Semantic Conventions: https://opentelemetry.io/docs/specs/semconv/
- GenAI semantic conventions are maintained in the OpenTelemetry GenAI semantic-conventions project; verify the current repository/version before adopting attributes: https://github.com/open-telemetry/semantic-conventions-genai
- Monitor service behavior and model behavior separately: latency, throughput, availability, resource utilization, cost, quality, drift, safety events, data quality and user outcomes. Protect prompts, datasets, outputs and identifiers as potentially sensitive.

## 5. Context engineering and token-efficient AI systems
Use retrieval and source navigation before broad context loading:
- Graphify codebase graph: local AST-derived code relationships and queryable subgraphs; verify repository/version, parser coverage and graph freshness before trusting results: https://github.com/Graphify-Labs/graphify
- Headroom: tool-output/log/context compression; inspect supported integrations and measure quality/retention on representative payloads: https://github.com/headroomlabs-ai/headroom
- TypeSafe Jev official API docs: https://api.typesafe.ai/docs. Jev is a typed decision service (not a generative executor); use only for bounded classification/routing/scoring decisions that fit its contract. Its usage receipt and decision quality must be measured. Do not assume it reduces total cost or replaces primary-model reasoning.
- Use repository search, symbol/AST indexes, dependency/call graphs, test maps, document indexes and retrieval tools to select relevant source slices. Preserve stable source pointers and fetch full source only where the decision depends on it.

## 6. Principal AI/ML engineering gates
- Problem/value: explicit human outcome, target population/use case, constraints, baseline and measurable success.
- Data: provenance/rights, quality, representativeness, leakage, privacy, feature definitions and lineage.
- Experiment: pinned code/config/dependencies/data, reproducibility and experiment tracking.
- Evaluation: appropriate baselines, holdout integrity, slice analysis, uncertainty, robustness, calibration where relevant, human evaluation where needed and explicit release thresholds.
- Model/runtime: artifact identity, dependency and hardware compatibility, inference contract, versioning and reproducibility.
- Serving: deployment strategy, capacity, latency/throughput, cost, availability, security, fallback and rollback.
- Operations: telemetry, drift/data quality, incident response, feedback, retraining triggers, model retirement and auditability.
- GenAI/agent additions: retrieval quality, context provenance, prompt/tool contracts, injection resistance, task-level evals, traces, token/cost budgets and human approval boundaries.
- Governance: access control, privacy, safety, model/data risk, audit trail and owner accountability.

## 7. Evidence rules and counterexamples
- Benchmark improvement without representative slices can hide regressions.
- Offline quality does not prove online impact; training success does not prove deployability.
- Model deployment does not prove the product consumes the intended version.
- Token reduction without answer-quality and task-success checks is not an optimization.
- A graph/index can be stale or incomplete; confirm critical edges against source.
- A typed Jev decision is advisory; it does not authorize actions.
- Keep data, code, config, dependencies, model, evaluator, serving image and telemetry versions linked.
