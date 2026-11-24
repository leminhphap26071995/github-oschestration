# Execution Environment and GitHub Actions Quota Governance

## 1. Authority and data placement

Notion is the canonical source for project/ticket state, MUST requirements, requirement-to-repository bindings, access decisions, role work packages and first unmet criteria. GitHub is the canonical technical source for repository contents, refs, commits, tests, pull requests, workflow runs and provider evidence. Plugin Creator is the authority for the live UPW release and runtime manifest.

Repository visibility is a data-placement attribute, not blanket permission. Public repositories may host generic or sanitized work only when requirement mapping and access decisions permit. Private payloads, credentials, billing records and private evidence stay in private storage. A repository being visible or recently successful does not authorize its use for a project.

## 2. Mandatory free-tier-first quota preflight

Before any push, PR update, tag, merge, rerun or other write that can trigger GitHub Actions:

1. Resolve the task's authorized repository mapping from Notion.
2. Read the current Quota Routing Snapshot and latest owner report.
3. Require a snapshot no older than 60 minutes.
4. Prefer FREE_TIER_AVAILABLE repositories before any included-compute route.
5. For private/internal repositories, require AVAILABLE_VERIFIED and no owner/provider/budget block.
6. Preserve requirement-to-repository/access relationships; never substitute an unrelated repository to evade quota.

The priority is FREE_TIER_FIRST / ZERO_COST_FIRST. A public repository using an exact standard GitHub-hosted runner is free/unlimited for standard runner compute. Larger GitHub-hosted runners remain billable even on public repositories. Self-hosted runner infrastructure has external/unknown cost and is not assumed free. Private/internal standard runners consume the billing owner's included compute.

## 3. Quota and cost states

- FREE_TIER_AVAILABLE: fresh successful run on an exact standard GitHub-hosted runner in a public repository; eligible before included-compute repositories.
- AVAILABLE_VERIFIED: fresh successful standard runner evidence for a private/internal repository, with billing collection and owner state clear.
- NEAR_LIMIT: at least 80% of an enforced applicable budget hard cap; fallback-only.
- QUOTA_EXHAUSTED: explicit provider Actions billing evidence or an enforced applicable hard cap.
- REPORTED_QUOTA_EXHAUSTED: explicit owner report; blocks private/internal included-compute use until an explicit clear or stronger provider evidence changes the state.
- NO_ACCESS: authenticated user is not an organization billing administrator or organization policy blocks the app.
- PERMISSION_DENIED / API_RATE_LIMITED: billing evidence is inaccessible or rate-limited; ineligible.
- UNKNOWN: evidence insufficient; ineligible.
- STALE: snapshot older than 60 minutes; ineligible.
- NOT_CONFIGURED: central collector or Notion integration unavailable; ineligible.

A recent success cannot override current billing collection errors for private/internal repositories. A public standard-runner exception cannot override exact repository-level provider quota evidence or an explicit repository hard cap. runner_id=0, empty steps, missing logs, generic errors, and a budget below its cap are not proof of quota availability or exhaustion.

## 4. One central monitor, no per-repository CI

The only quota CI is .github/workflows/github-actions-quota-monitor.yml in github-oschestration. It runs every 30 minutes on the public repository's standard ubuntu-latest runner. No monitor is installed or configured in target repositories.

Organization discovery uses one GitHub App User Access Token (UAT) created with Device Flow and offline_access. The same user token is reused for the personal account and all active organizations returned by GET /user/memberships/orgs. The App is not installed in every organization. Organization billing usage is queried through the billing usage summary API using the UAT, subject to organization billing-admin access and organization app policy.

Required app permissions:
- User: Plan read.
- Organization: Administration read.
- Repository: Actions read, Checks read, Contents read, Metadata read.

Organizations where the authenticated user is not an admin or the organization blocks the app are recorded as NO_ACCESS / PERMISSION_DENIED. This is a security boundary, not a reason to create per-org installations automatically.

The expiring UAT is refreshed after a 401. The refresh token is rotated first, then the access token is persisted to Actions secrets. A fine-grained PAT with Secrets:write scoped only to github-oschestration performs secret rotation; it has no target-organization permissions. No App private key, installation ID, per-org PAT, per-repository target list, or per-repository CI is required.

## 5. API efficiency and evidence

The monitor performs one membership discovery, one owner-level Actions usage summary, and one organization budget read per discovered organization. Per-repository billing usage is queried only for repositories with an Actions repository-scoped budget. Other repositories are marked NOT_COLLECTED_BY_DESIGN, never zero. Recent run/annotation observation uses a one-day lookback; successful-run eligibility uses a 60-minute freshness window.

The billing usage summary API does not expose a reliable remaining included-compute balance. The monitor never calculates or invents remaining minutes or percentages. Empty usage rows are unknown, not zero.

## 6. Host capability and quota domains

MODEL_GUIDED and HOST_ENFORCED are distinct quota domains. MODEL_GUIDED describes model/provider-side limits; HOST_ENFORCED describes restrictions imposed by the execution host. Neither is inferred from GitHub Actions runner assignment. network/DNS and image are separate host capabilities and must be checked as explicit capabilities; their absence is not GitHub Actions quota evidence.

The monitor's public standard runner is a cost-placement choice, not proof that network/DNS, image, model-guided or host-enforced capabilities are available to another execution environment.

## 7. Annotation recovery

runner_id=0 and terminal steps=[] trigger Notion-first annotation recovery; they are not blockers or quota classifications. Correlate exact repository, ref, SHA, workflow run ID, attempt and Check Run ID. Only explicit provider billing/payment/spending-cap evidence or an enforced hard cap proves QUOTA_EXHAUSTED. Owner reports remain distinct from provider-verified evidence.

## 8. Work continuity

Quota restrictions do not stop independent AI-owned work. Continue analysis, source inspection, documentation, tests that do not trigger the blocked owner, and Notion reconciliation. Do not push, rerun, dispatch or otherwise trigger a blocked billing owner. Do not hand off while feasible AI-owned work remains. Ask the owner only for exclusive setup, private access or final acceptance.
