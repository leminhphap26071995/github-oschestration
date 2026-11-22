# Notion-First Repository and Role Continuity Control Plane

This is a public-safe, provider-neutral decision layer. It contains no private project inventory, ticket payloads, billing records, credentials or private evidence.

## Routing contract

1. Project Introduction identifies the project/goal and routes ChatGPT to Notion. It is not a repository allowlist or source authority.
2. Notion supplies the canonical project/ticket, normalized MUST requirements, requirement-to-repository bindings, access decisions, role work packages, dependencies and first unmet criterion.
3. GitHub supplies the visible repository catalog, permissions, refs, commit identity and provider usage evidence.
4. The active host reconciles the Notion route with GitHub inventory and chooses exactly one task-scoped execution repository, separate from the persistent default repository.

## Repository placement

Visibility is a data-placement and convenience attribute, not a blanket denial. Public repositories and standard public runners are suitable for generic or sanitized work. Private project payloads, credentials, billing records and private evidence remain in private storage. An unsuitable candidate should be replaced with another eligible route; it should not stop independent work.

Each requirement maps to one or more repository roles: SOURCE, EXECUTION, CONSUMER, TEST, DEPENDENCY, OBSERVER or MIRROR. A repository appearing in the catalog does not activate it for a project or task.

## Role continuity

A work package records its requirement IDs, role ID and bundle version, deliverables, dependencies, acceptance evidence, owner-created session reference, status, source identity, last result, first unmet criterion and next action. An unfinished package resumes under the same role. A completed package is not repeated and requires implementation, verification, consumer and source-readback evidence.

Parallel packages are scheduled only when dependencies are met and their write paths do not overlap. Project, ticket, requirement, repository-usage, work-package and session states remain independent.

## Implementation

- `scripts/repository_control_plane.py` implements the deterministic decisions.
- `tests/test_repository_control_plane.py` covers routing, access, public-safe placement, same-role continuation, dependency-safe parallelism and evidence-gated completion.
- `conformance.yml` runs the repository's automatic regression suite on push and pull request. No manual dispatch is added.

The module consumes normalized provider data; it is not itself a Notion/GitHub client and does not prove host runtime invocation.

## Integration with the existing context resolver

The host-facing composition entry point is `scripts.context_switching.route_message_with_repository_control()`. It calls the existing message-level context resolver, uses Project Introduction only to derive a Notion project/goal route, waits for outgoing-cursor readback before binding a destination execution repository, then applies Notion requirement/access bindings, GitHub inventory and role work-package state.

Required host inputs are normalized Notion domain registry, project/ticket checkpoints, MUST requirements, requirement-to-repository bindings, work-package records and connected GitHub repository metadata. The function returns the existing context transition plus the repository resolution, role continuation, dependency-ready parallel batches and orthogonal state projection.

Use the existing resolver for message intent; do not build a second context resolver. The wrapper is a deterministic composition layer, not a Notion/GitHub client and not proof that a ChatGPT host invokes it.
## Inventory and usage projections

- `normalize_repository_inventory()` aggregates paginated repository results by GitHub App installation, verifies every connected installation has a complete page set, and labels its coverage as connected installations only. It never claims every possible GitHub account is connected.
- `compute_actions_usage_projection()` calculates usage percentages only when billing owner, product, billing period, scope type, scope ID and currency match exactly between usage and budget rows. A mismatch returns UNKNOWN with no percentage.
- Owner-reported exhaustion remains REPORTED and is not promoted to provider-verified quota exhaustion. An exhaustion timestamp is populated only from an explicit provider `exhausted_at` field; collection time is not substituted.
- The host composition accepts either an already normalized repository catalog or installation-scoped raw pages, and can attach a separate usage projection. UNKNOWN usage telemetry does not block unrelated repository selection.
## Runner availability is separate from billing usage

Repository catalog entries carry two independent projections: `runner_availability` and `actions_usage`. A successful exact-SHA CI run may verify runner availability for that repository; it does not prove billing minutes, spending limits or quota state. Conversely, a billing budget below its limit does not prove that a runner is available.

When CI is required, repository selection checks `runner_availability.state=AVAILABLE_VERIFIED`, not `actions_usage`. Unknown billing telemetry therefore cannot block an independently verified public runner, and a verified billing budget cannot stand in for a successful runner observation.