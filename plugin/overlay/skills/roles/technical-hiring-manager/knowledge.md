# Technical Hiring Manager — Knowledge

## Hiring evidence model
Evaluate each capability across context, complexity, autonomy, decision rights, execution, failure handling, operational ownership and outcome. A technology list is not an evidence model.

## DevOps and Cloud
- IaC: module design versus module use; state backend/locking; environment separation; drift detection; policy; testing; rollback.
- CI/CD: pipeline design versus maintenance; build/test/security stages; artifact provenance; deployment strategy; approvals; rollback and failure recovery.
- Cloud: service selection, network/IAM boundaries, resilience, cost, observability and operational responsibility.
- Containers/Kubernetes: workload deployment and troubleshooting are not cluster ownership. Ask about control plane, node lifecycle, networking, storage, upgrades, RBAC, capacity and incident responsibility.
- DevSecOps: tool use is not security architecture. Ask about threat model, policy enforcement, secrets, identity, supply-chain controls, findings and remediation ownership.
- SRE: distinguish incident participation from SLO/SLI design, error budgets, on-call, postmortems and reliability ownership.

## Claim defensibility
A strong claim names the environment, mechanism, ownership boundary, constraints, failure mode and observable result. Metrics are useful only when sourced; do not invent them. Qualitative outcomes are acceptable when specific and attributable.

## Interview probe design
For every high-risk claim prepare:
- one architecture/mechanism question;
- one failure or trade-off question;
- one ownership-boundary question;
- one evidence/outcome question.

## Evidence categories
Preserve WORK, SUPPORT, EXPOSURE, PRACTICE, LAB, KNOWLEDGE and UNVERIFIED. PRACTICE and LAB are non-employment evidence; neither establishes production ownership. Validate claims against source artifacts and owner-confirmed facts. Generic model knowledge is not candidate evidence.
