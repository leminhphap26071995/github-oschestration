# AI Architecture Workflow — Unified, Content-Neutral Core

## Universal invariants
- Select interaction mode before domain routing.
- Recover the explicit project/workstream and ticket before loading checkpoints or role bundles.
- Project and ticket state are isolated. Root CURRENT is an index only, never a global active task.
- Never choose a project from the latest modified checkpoint. Resolve explicit project/ticket or ask when genuinely ambiguous.
- Switching saves the outgoing ticket cursor and loads the destination ticket's own source lock, acceptance and roles; it does not overwrite or close the previous project.
- PM/Tech Lead coordinate; outcome-derived domain specialists own professional deliverables.
- Preflight is performed by the active host that owns the next tool invocation. ChatGPT sandbox is not the user's local machine or a host enforcement broker.
- CI is asynchronous: observe run admission, runner warm-up, job startup, steps, completion, logs and artifacts before classifying the result.
- Missing early jobs/steps/logs are pending/evidence gaps, not quota proof.

## Context authority
User instruction owns current intent. Notion Routing Registry selects persistent project/repository/branch. Project/ticket work board owns mutable lifecycle and Next Action. GitHub owns versioned source and technical receipts. Runtime/provider owns observed behavior. Prior chats are discovery hints only.

## Project/ticket checkpoint contract
- .ai-workflow/CURRENT.json: project index only; no global active context or task.
- .ai-workflow/projects/<project-id>/CURRENT.json: project summary and ticket list.
- .ai-workflow/projects/<project-id>/tickets/<ticket-id>/CURRENT.json: ticket execution cursor and acceptance ledger.
Every checkpoint carries project ID, workstream type, domain, goal, source authority/repository/ref/SHA, status, acceptance and Next Action. Never merge Game Mod, VS Code Extension and Career/Interview state.

## GitHub Actions asynchronous lifecycle
Poll requested/queued/waiting/pending through runner admission and warm-up. Empty jobs while run is in progress and empty steps while a job starts are not failures. After completion, collect attempts, jobs, steps, annotations, logs and artifacts; retry transient publication 404s with bounded backoff. Respect Retry-After. Observation-window expiry is not job failure.
QUOTA_EXHAUSTED requires explicit billing/minutes/spending-cap/payment evidence for the correct billing owner and period. runner_id=0, empty steps, missing logs, generic HTTP errors and connector wrapper failures do not establish quota exhaustion. Try materially different authorized API/CLI routes when an adapter fails.

## Professional capability discovery
Derive lifecycle, deliverables, disciplines, specialist roles and acceptance oracles from the outcome. Generic coordination roles do not substitute for domain expertise. Load complete specialist bundles and create task-scoped profiles when required. Every deliverable needs an owner, consumer, dependency and acceptance oracle.

## Host-aware execution
Probe relevant tools, permissions, network/DNS, filesystem, shell/runtime, media/vision, browser/UI, storage, budgets and continuity in the actual host that owns the invocation. Label ChatGPT instruction preflight MODEL_GUIDED. Label VS Code/Omni Studio HOST_ENFORCED only after negative broker tests prove denied invocations never execute.

## Closed-loop execution
RECOVER -> ROUTE -> PREFLIGHT -> INSPECT -> IMPLEMENT -> EXECUTE -> OBSERVE -> DIAGNOSE -> REPAIR/RETEST -> READBACK -> CHECKPOINT -> ACCEPTANCE.
A failed method is not a failed investigation. Recover the exact execution cursor, inspect alternative evidence routes, repair the earliest mismatch and continue all runnable AI-owned work.

Keep source/static, hosted CI, artifact, runtime/consumer and owner acceptance as separate gates. Never claim completion while an in-scope criterion remains pending, failed, unknown or blocked.