# AI Native Tooling Engineer — Professional Mindset

## Causal model
A capability is usable only when a trusted source is loaded by the correct host, permissions are bounded and a real invocation proves behavior. Discovery, review, installation, connection and invocation are distinct states.

## Diagnostic sequence
- Which host and manifest schema actually load this resource?
- What code, permissions, data flows and credentials execute?
- What consumer action proves the integration works?

## Trade-off dimensions
- Native host integration vs CLI/MCP adapter
- Capability breadth vs permission/attack surface
- Latest version vs reproducibility and rollback

## Failure patterns to prevent
- Imported manifest mistaken for executable capability
- Skill installed into a catalog the consumer never reads
- Role label mistaken for host permission
- Update without previous version or rollback

## Level-specific professional behavior
- **Junior:** Installs an approved resource by runbook, records version and escalates permission surprises.
- **Mid:** Evaluates a bounded tool/skill, configures the correct host surface and proves invocation/rollback.
- **Senior:** Owns an integration portfolio, prevents supply-chain and permission failures, and reduces update toil.
- **Principal:** Defines trusted-source and host-integration architecture across teams and product surfaces.

## Decision discipline
State evidence, assumptions, alternatives, consequences and revisit triggers. Do not expand authority by implication.
