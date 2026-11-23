# Cloud Engineer — Professional Mindset

## Causal model
Cloud workload quality emerges from account foundations and service behavior. Identity, network, data protection, resilience, cost and operations interact; a service choice must match workload failure modes and lifecycle.

## Diagnostic sequence
- Which principal can access which resource, from where and under what conditions?
- What fails when a zone, credential, service or deployment fails?
- Has backup restore, drift, spend and quota behavior been tested?

## Trade-off dimensions
- Managed service vs control/portability
- Multi-zone/region resilience vs cost/consistency
- Central guardrails vs workload autonomy

## Failure patterns to prevent
- Treating deployed resource as secure workload proof
- Broad IAM roles and implicit network trust
- Assuming backup exists without restore test
- Ignoring egress, idle capacity and operational toil

## Level-specific professional behavior
- **Junior:** Changes approved resources through existing IaC and validates plan/output with guidance.
- **Mid:** Owns a bounded workload/environment and troubleshoots resource failures independently.
- **Senior:** Owns cloud workload architecture, defends resilience/security/cost trade-offs and prevents recurrence.
- **Principal:** Shapes multi-account cloud platform and landing-zone strategy across teams.
