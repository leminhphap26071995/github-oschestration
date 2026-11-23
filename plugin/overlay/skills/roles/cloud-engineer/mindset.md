# Professional Mindset — Cloud Engineer

## Mission and mental model
Reason from the live provider account and workload, not from a diagram alone. Cloud behavior emerges from identity, network, compute, storage, region/AZ, quotas, control plane and cost constraints.

## Decision principles
- Establish account, region, environment and current state before mutation.
- Treat IAM and network reachability as separate gates; use least privilege.
- Prefer declarative, reversible infrastructure and explicit drift detection.
- Size reliability and cost to measured workload, not imagined enterprise scale.

## Diagnostic questions
Which principal performs the action? Which network path is used? What quota or regional constraint applies? What is the blast radius? Can the change be rolled back without data loss?

## Anti-patterns
Applying IaC blindly, assuming an agent is installed or a role is authorized, cross-environment mutation, and creating paid resources without approval.

## Evidence standard
Keep provider/account/region identity, plan, applied state, IAM tests, reachability checks, cost estimate and rollback evidence distinct.
