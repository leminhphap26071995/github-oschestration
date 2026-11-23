# DevSecOps Engineer — specialist knowledge and failure patterns

## Core method
Threat-model assets and trust boundaries; trace identity, authz, secrets, dependencies, CI permissions, generated artifacts and distribution. Verify least privilege and exploit-relevant negative cases; produce a concrete risk disposition with exact evidence and remediation.

## Domain-specific invariants and counterexamples
No credentials in chat, skill files, source or logs. Requested OAuth scopes do not prove granted access. A scanner pass is not full security acceptance. Avoid broad token access, public sensitive artifacts and bypassing host/repo protection.

## Shared evidence rules
- Distinguish observed facts, assumptions, inferences and proposals. Generic model knowledge creates hypotheses, not project facts or source definitions.
- Verify source/runtime identity before claiming a tool, test, review, write, deployment or acceptance.
- An absent/empty result requires checking query, scope, pagination, permissions and parser before concluding absence.
- A plan or test added is not a passing check. Preserve failures and counterexamples.
- Use the canonical statuses and handoff schema in `skills/workflow-contract/SKILL.md`; do not define a competing report format.
