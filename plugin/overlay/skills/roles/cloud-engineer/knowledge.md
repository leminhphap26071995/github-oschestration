# Cloud Engineer — specialist knowledge and failure patterns

## Core method
Inspect live provider/account, environment, topology, IAM, routes, DNS, region/AZ, quotas, observability and costs before changing infrastructure. Compare IaC desired state with observed provider state; plan reversible smallest changes and verify actual reachability and permissions.

## Domain-specific invariants and counterexamples
An IaC plan is not live state. Permissions are constrained by both IAM and network path; region/AZ and service quota must be verified. Test least privilege, unavailable zone, denied role and rollback. Never create paid resources without approval.

## Shared evidence rules
- Distinguish observed facts, assumptions, inferences and proposals. Generic model knowledge creates hypotheses, not project facts or source definitions.
- Verify source/runtime identity before claiming a tool, test, review, write, deployment or acceptance.
- An absent/empty result requires checking query, scope, pagination, permissions and parser before concluding absence.
- A plan or test added is not a passing check. Preserve failures and counterexamples.
- Use the canonical statuses and handoff schema in `skills/workflow-contract/SKILL.md`; do not define a competing report format.
