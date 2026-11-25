# Execution Environment and GitHub Actions Quota Governance

## 1. Repository placement

Notion is the canonical source for project/ticket state, MUST requirements, requirement-to-repository bindings, access decisions, role work packages and first unmet criteria.

GitHub is the canonical technical source for repository contents, refs, commits, tests, pull requests, workflow runs and provider evidence.

Repository visibility is a data-placement attribute, not blanket permission. Public repositories may be used for generic or sanitized work only when the requirement mapping and access decision permit it. Private payloads, credentials, billing records and private evidence stay in private storage.

A repository being visible or recently successful does not authorize its use for a project.

## 2. Mandatory quota preflight

Before any push, PR update, tag, merge, rerun or other write that can trigger GitHub Actions:

1. Resolve the task's authorized repository mapping from Notion.
2. Read GM-51's Quota Routing Snapshot and latest owner report.
3. Require a snapshot no older than 60 minutes.
4. Require repository and billing-owner state AVAILABLE_VERIFIED.
5. Preserve the ticket's requirement-to-repository/access relationship; never substitute an arbitrary repository to avoid quota.

Only AVAILABLE_VERIFIED may trigger Actions. It requires a successful GitHub-hosted runner job within 30 minutes and no stronger owner/provider/budget block.

## 3. Quota states

- AVAILABLE_VERIFIED: recent GitHub-hosted runner success and fresh snapshot; eligible if access and requirement mapping permit.
- NEAR_LIMIT: at least 80% of an enforced budget hard cap; fallback-only.
- QUOTA_EXHAUSTED: explicit provider Actions billing evidence or enforced hard cap; block owner/repository.
- REPORTED_QUOTA_EXHAUSTED: explicit owner report; block all repositories under that owner until explicit CLEARED.
- UNKNOWN: evidence insufficient; ineligible.
- STALE: snapshot older than 60 minutes; ineligible.
- NOT_CONFIGURED: central collector or Notion integration unavailable; ineligible.
- PERMISSION_DENIED, API_RATE_LIMITED, NOT_DISCOVERED: incomplete evidence; ineligible.

A budget below its hard cap does not prove remaining included compute. A successful self-hosted job does not prove included GitHub-hosted runner availability. A historical green run does not prove current availability.

## 4. Central reusable monitor

The only quota CI is .github/workflows/github-actions-quota-monitor.yml in this repository. It runs every 15 minutes and discovers:
- personal-account repositories through one USER_BILLING_TOKEN;
- organization repositories through GitHub App installations with all-repository access.

New repositories are discovered automatically. A new organization requires one App installation. There is no per-repository target or secret configuration.

The collector reads user/org/repository Actions usage-summary and budget evidence where supported, scans recent runs across all branches, correlates exact run attempts and Check Runs, and publishes the snapshot and annotation receipts to Notion.

## 5. No-runner and annotation recovery

runner_id=0 and terminal steps=[] are triggers to read the provider-owned GitHub Actions annotation evidence, not blockers or quota classifications. The central monitor performs this lookup even when annotations_count is zero. It publishes exact receipts to GM-50 and unmatched receipts with an explicit unmatched classification.

ChatGPT sessions must read GM-50 first after such a failure. If the exact receipt is absent, use NOTION_RELAY_RECEIPT_NOT_FOUND_FOR_EXACT_RUN. API_METHOD_BLOCKED is transport-only; it does not terminate recovery.

Only explicit provider billing/payment/spending-cap evidence or an enforced hard cap proves QUOTA_EXHAUSTED. Owner reports remain separate and are not silently promoted to provider-verified state.

## 6. Owner setup and reusable permissions

One-time setup is documented in quota-monitor/README.md:
- GitHub App ID/private key; Administration: read, Actions: read, Checks: read, Contents: read; install on each organization with all repositories selected.
- Personal fine-grained USER_BILLING_TOKEN with Plan: read, Metadata: read, Actions: read, Checks: read, Contents: read.
- NOTION_API_TOKEN with read/update content and read/insert comments; share GM-50 and GM-51.

Never paste credentials into chat or commit them. No per-repository setup is needed.

## 7. API limitations

GitHub billing usage-summary APIs are public preview and may change. They provide usage/budget evidence but do not expose a reliable remaining included-compute balance. The monitor does not calculate or invent remaining-minute percentages. Empty usage rows are unknown, not zero.

## 8. Work continuity

Quota restrictions do not stop independent AI-owned work. Continue analysis, source inspection, documentation, tests that do not trigger the blocked owner, and Notion reconciliation. Do not push, rerun, dispatch or otherwise trigger the blocked billing owner.

Do not report or hand off while feasible AI-owned work remains. Ask the owner only for exclusive setup, private access or final acceptance.

## 9. Owner-directed exhausted-repository staging and upstream reconciliation

When the exact source billing owner is `QUOTA_EXHAUSTED` or `REPORTED_QUOTA_EXHAUSTED`, keep the persistent `DEFAULT_REPOSITORY` unchanged and pause trigger-producing writes for that owner. Resolve exactly one task-scoped `ACTIVE_EXECUTION_REPOSITORY`.

The owner's preferred staging repository is `leminhphap26071995/github-oschestration`. It is PUBLIC and is eligible only for sanitized generic material explicitly mapped and approved for public visibility. Never copy private product source, credentials, secrets, customer data, private billing evidence, or proprietary project artifacts into it. If the task needs private source, use an authorized PRIVATE destination under a demonstrably distinct billing owner with fresh `AVAILABLE_VERIFIED`, or remain blocked until the source owner is explicitly cleared.

For a valid staging task, create exactly one branch with this structure:

```text
<source-owner>--<source-repo>/<source-branch>/<ticket-key>
```

Example: `LyonPro--ai-workflow-oschestration/feat/omni-studio-v0.11.2-omniroute-owned-model-routing/GM-61`.

Record source and destination repository/ref/SHA separately, data classification, visibility, billing owner, quota evidence, transferred task state, and `SYNC_PENDING`. Preserve ancestry where possible and read back destination HEAD/tree before continuing. Do not dual-push or run duplicate CI. Trigger only the narrow automatic workflow after the exact destination and owner have a fresh `AVAILABLE_VERIFIED` snapshot; never use a speculative push or manual dispatch/rerun as a quota probe.

After explicit source-owner clearance and a fresh eligible automatic run, freeze staging writes, sync the completed branch to the exact original repository and branch, preserve ancestry where possible, and verify upstream SHA, diff, tests and automatic checks. Mark `SYNCED` and restore the active target only after readback. `UNKNOWN` is not exhausted; apply failover only to the exact owner marked exhausted.