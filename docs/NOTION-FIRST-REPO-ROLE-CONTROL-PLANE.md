# Notion-First Repository and Role Continuity Control Plane

This is a public-safe, provider-neutral decision layer. It contains no private project inventory, ticket payloads, billing records, credentials or private evidence.

## Routing contract

1. Project Introduction identifies the project/goal and routes ChatGPT to Notion. It is not a repository allowlist or source authority.
2. Notion supplies the canonical project/ticket, normalized MUST requirements, requirement-to-repository bindings, access decisions, role work packages, dependencies and first unmet criterion.
3. GitHub supplies the repository catalog, permissions, refs, commit identity and provider execution evidence.
4. The active host reconciles the Notion route with GitHub inventory and quota-routing state, then chooses one task-scoped execution repository, separate from the persistent default repository.

## Repository placement

Visibility is a data-placement and convenience attribute, not blanket permission. Public repositories and standard public runners are suitable for generic or sanitized work only when the requirement mapping and access decision permit. Private project payloads, credentials, billing records and private evidence remain in private storage.

Each requirement maps to one or more repository roles: SOURCE, EXECUTION, CONSUMER, TEST, DEPENDENCY, OBSERVER or MIRROR. A repository appearing in the catalog does not activate it for a project or task.

## Mandatory quota routing

Before any GitHub write that can trigger Actions, the host resolves the requirement-to-repository/access map and reads the current GM-51 Quota Routing Snapshot plus owner reports.

- Only a fresh AVAILABLE_VERIFIED repository is eligible. The snapshot must be no older than 60 minutes; availability requires a successful GitHub-hosted runner job within 30 minutes.
- NEAR_LIMIT is fallback-only.
- QUOTA_EXHAUSTED and REPORTED_QUOTA_EXHAUSTED block every repository under that billing owner.
- UNKNOWN, STALE, NOT_CONFIGURED, PERMISSION_DENIED, API_RATE_LIMITED and NOT_DISCOVERED fail closed.
- A self-hosted or historical green run and a budget below hard cap are not availability proof.
- Never choose an arbitrary repository, create per-repository config or use a speculative push/rerun to test quota.
- If no mapped route is eligible, continue independent non-triggering AI-owned work.

The single central quota monitor in github-oschestration auto-discovers personal repositories and repositories in installed organizations. New repositories need no per-repository config; a new organization requires one GitHub App installation.

## Role continuity

A work package records its requirement IDs, role ID and bundle version, deliverables, dependencies, acceptance evidence, owner-created session reference, status, source identity, last result, first unmet criterion and next action. An unfinished package resumes under the same role. A completed package is not repeated and requires implementation, verification, consumer and source-readback evidence.

Parallel packages are scheduled only when dependencies are met and their write paths do not overlap. Project, ticket, requirement, repository-usage, work-package and session states remain independent.

## Implementation

- scripts/repository_control_plane.py implements deterministic repository and role decisions.
- tests/test_repository_control_plane.py covers routing, access, public-safe placement, same-role continuation, dependency-safe parallelism and evidence-gated completion.
- The central github-actions-quota-monitor.yml validation job runs the regression suite on push and pull request. There is no separate conformance workflow.

The module consumes normalized provider data; it is not itself a Notion/GitHub client and does not prove host runtime invocation.

## Integration with the context resolver

The host-facing composition entry point is scripts.context_switching.route_message_with_repository_control(). It calls the existing message-level context resolver, uses Project Introduction only to derive a Notion project/goal route, waits for outgoing-cursor readback before binding a destination execution repository, then applies Notion requirement/access bindings, GitHub inventory, quota state and role work-package state.

Required host inputs are normalized Notion domain registry, project/ticket checkpoints, MUST requirements, requirement-to-repository bindings, work-package records, current quota snapshot and connected GitHub repository metadata. The function returns the context transition, repository resolution, role continuation, dependency-ready parallel batches and orthogonal state projection.

Use the existing resolver for message intent; do not build a second context resolver. The wrapper is a deterministic composition layer, not a Notion/GitHub client and not proof that a ChatGPT host invokes it.

## Inventory and usage projections

- normalize_repository_inventory() aggregates paginated repository results by GitHub App installation, verifies every connected installation has a complete page set, and labels coverage as connected installations only. It never claims every possible GitHub account is connected.
- compute_actions_usage_projection() calculates usage percentages only when billing owner, product, billing period, scope type, scope ID and currency match exactly between usage and budget rows. A mismatch returns UNKNOWN with no percentage.
- Owner-reported exhaustion remains REPORTED and is not promoted to provider-verified quota exhaustion. An exhaustion timestamp is populated only from an explicit provider exhausted_at field; collection time is not substituted.
- These normalized projections do not replace the live GM-51 Quota Routing Snapshot or its fail-closed routing policy.

## Runner and billing evidence

Runner availability and billing usage are distinct evidence dimensions. A successful run is eligible availability evidence only when it is recent and used a GitHub-hosted runner. It does not prove future quota. Budget below hard cap does not prove availability. runner_id=0 and empty steps trigger annotation recovery; they never prove quota exhaustion.
