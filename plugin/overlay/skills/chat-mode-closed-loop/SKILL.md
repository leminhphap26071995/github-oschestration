---
name: chat-mode-closed-loop
description: Enforce source-first, goal-anchored execution, context integrity, coherent batching and evidence-backed closure.
---
# Chat Mode Closed Loop — Execute Against the Original Goal

Use for every substantive task and every owner correction about skipped workflow, early termination, incomplete verification, context breaks, hallucinations or premature handoff.

## Mandatory owner-expectation and reporting gate

Load `skills/owner-expectation-closure-gate/SKILL.md` on every substantive task and owner correction. The full original expected outcome—not the next subtask—defines completion. Keep routine progress narration, notes and checkpoints internal while AI-owned work remains runnable. When the owner explicitly requests TEMPORARY_OUTPUT, emit the nonterminal heartbeat defined by skills/session-continuity/SKILL.md; it must not end the turn or interrupt execution. Before final output, run the deterministic closure/handoff gate when available and reconcile every original MUST.

## Source-first and goal-anchor entry
1. For a named GitHub PR/repository, read live PR/Issue metadata, branch/head SHA, changed files and workflow state through connected GitHub tools. Read matching Notion routing/checkpoint as required. Read-only source recovery is allowed before GitHub CI preflight. Never run a blocking ChatGPT-local preflight/DNS/filesystem probe before remote connectors.
2. Load `skills/goal-anchored-context-integrity/SKILL.md`. Lock the original owner expectation, every MUST, scope/non-goals, project/ticket, source/ref/SHA, evidence provenance, open gates and one Next Action.
3. Inspect project `AGENTS.md` and its exact deterministic goal gate. Invoke the project-owned gate when required; do not claim it passed if it was not actually run.

## Work order — no coding before understanding
1. Recover original goal and authoritative current state; never infer from chat recency.
2. Define/version complete MUST/SHOULD/LATER, constraints, non-goals, dependencies, lifecycle/error cases and observable acceptance.
3. Challenge and validate requirement meaning against sources and counterexamples.
4. Research proven internal/public implementations; inspect source/tests/docs/contracts/license/compatibility/runtime and trace mechanisms/failure paths.
5. Decide architecture and map every requirement to components, tests and consumer evidence.
6. **Gate 5:** read affected source and callers; understand contracts, state, side effects, invariants and error paths before editing.
7. **Gate 6:** batch the complete known scope and requirement-derived tests; do not let smallest-step thinking or per-file edits cap the goal.
8. Only then implement the complete authorized scope in coherent batches.

## Failure and hypothesis control
- After the first failure, re-read the original goal and reconcile all MUST criteria before retry.
- Before a second attempt or after a second failure of the same method, perform full goal/source/evidence revalidation and change method, test oracle or evidence route.
- Each retry must introduce new evidence, a discriminating test or a validated causal correction. No repeated uninformative retries.
- Keep one active falsifiable hypothesis per failure branch. Do not multiply hypotheses to fill context gaps. If two iterations produce no new decision-relevant information, close that diagnostic branch as UNKNOWN where appropriate and continue independent goal work.
- Never promote inferred or hypothesized details to facts. If the source is missing, stale or truncated, retrieve it or preserve UNKNOWN.

## Coherent batching and test cadence
Prefer one or two coherent commits for a normal task. This is a batching preference, not a cap on the requested outcome or AI ownership. Include all known related changes in a coherent batch and run relevant checks after that batch, not after every file. If the full goal requires further batches because of real dependencies, host/provider limits or safe verification, continue AI-owned work and persist an exact recovery cursor; do not ask the owner to authorize routine commit count or return a partial implementation as done. Never create micro-commits or commit-per-test.

## Follow through
Map `goal -> acceptance -> implementation -> test oracle -> action -> observed result -> evidence`. **Gate 7:** execute requirement-derived tests after each coherent batch, inspect actual outputs and artifacts, repair causal failures and retest. Inspect every relevant failed CI job/run/build's logs/artifacts; follow automatic runs through terminal completion and verify exact SHA. Never weaken the oracle to make a test pass. Keep source/unit/hosted CI/artifact/consumer E2E/owner acceptance separate.

## CI no-loop invariant
- For each exact run/attempt, continue observation while the provider says it is active; empty steps during startup are pending, not failure.
- Once terminal, inspect the run, every job, steps, annotations, checks, logs and artifacts. If terminal failure has no executed-step/log/provider cause, perform bounded alternate-route evidence recovery and classify `EXECUTION_EVIDENCE_MISSING` / causal `UNKNOWN`.
- After authorized evidence routes are exhausted, close that run's diagnostic branch. Do not keep querying it, repeat its explanation, or let it become the default blocker on later turns. Reopen only on new evidence or explicit owner request.
- Continue the full CI/build failure sweep and all independent acceptance criteria. A closed diagnostic branch remains an open/unknown gate, not a pass.

## Owner-time and reporting boundary
Do not interrupt a timed test/assessment with unrelated maintenance or verbose progress. Do not narrate every discovery or return a progress-only FINAL report while runnable work remains. Explicitly requested TEMPORARY_OUTPUT is permitted as a nonterminal status/log event; continue the loop and do not issue FINAL_OUTPUT until the original goal is closed or a genuine owner-only/hard host blocker remains. Report the original goal, all MUST statuses/evidence, exact revision, open gates and one genuine next action only when AI-owned work is exhausted or a true owner-only prerequisite remains.

## Owner-only boundary
Owner testing is final only when private device/account/runtime or independent observation is genuinely inaccessible to the assistant. Record that gate as `OWNER_PENDING`; do not ask the owner to repeat assistant-owned checks. Do not claim overall completion until that evidence is supplied.
## Temporary output is not terminal output
- For explicitly requested sustained Deep Work, apply skills/session-continuity/SKILL.md.
- A 30-second TEMPORARY_OUTPUT heartbeat is allowed only when the host exposes a reliable timer and a nonterminal textual-output surface. It summarizes verified work since the last heartbeat and must leave the execution loop open.
- A terminal FINAL_OUTPUT is prohibited while any feasible authorized AI-owned work remains runnable. Do not substitute a final chat response for a heartbeat.
- If the host cannot provide the timer/output event, mark HOST_HEARTBEAT_UNAVAILABLE; do not fake timers, no-op pings or background execution. Continue and checkpoint at material state changes.

## Actions report integrity

Before reporting any Actions result, parse each `/actions/runs/{N}` URL as `run_id=N`; it is never a runner ID. Parse `/job/{N}` as job_id. Keep check_run_id distinct even if its numeric value equals job_id. Verify the exact run object, attempt, workflow path and SHA. For failure cause, inspect the exact-SHA check-run annotation before job/runner/step metadata; if decisive billing evidence exists, stop quota diagnosis. If the annotation endpoint is blocked, record API_METHOD_BLOCKED, preserve the annotations URL/count and try one materially different authorized route. Attribute owner-provided annotation text as REPORTED. Never omit a known run ID or substitute one identifier type for another.


## 2026-11-24 owner-facing silence gate — mandatory

- `AI_OWNER && AI_WORK_REMAINING => NO_FINAL_OUTPUT && NO_USER_HANDOFF && NOT_DONE`.
- Keep all planning, discovery, tool results, routine checkpoints, missing-evidence investigations and interim blockers internal while any authorized AI-owned work remains runnable.
- A failed provider route, missing annotation receipt, response boundary, or uncertain quota state is an engineering recovery task; it is not permission to send the owner a partial status report.
- Continue independent AI-owned work and repair the earliest causal gap. Ask the owner only for a proven owner-exclusive decision, consent, private credential/account access unavailable to AI, physical-world observation, or final real-world acceptance.
- Before final output, reconcile every original MUST against actual consumer evidence and read back material writes. This is a behavioral contract, not proof of a host-level output interceptor.


## 2026-11-24 correction — no-runner state triggers Notion annotation recovery

This section is the controlling failure-recovery rule and supersedes any older wording that treats a no-runner/empty-step observation or a blocked GitHub annotation endpoint as a terminal blocker.

### Trigger semantics — NOT a root-cause classification

For an exact repository/ref/SHA/run-attempt, any of these observations triggers immediate annotation recovery:
- A raw attempt-scoped job contains the numeric value `runner_id: 0` (not a missing or null field).
- A terminal failed run has an exact job payload with `steps: []`.
- The exact-SHA Check Run reports `annotations_count > 0`.

These are workflow-routing signals only. `runner_id=0`, `steps=[]`, no jobs, blank runner metadata, missing logs and `BlobNotFound` are not a cause, quota diagnosis, or user-facing blocker. Preserve PRESENT/NULL/MISSING; never coerce missing fields to zero or an empty list. If the run is still active, continue observing its lifecycle; do not call startup metadata a terminal failure.

### Mandatory Notion relay path — immediately after the trigger

1. Parse `run_id` from the exact `/actions/runs/{N}` URL; verify repository, workflow path, event, ref, head SHA and `run_attempt`. Keep `job_id`, `check_run_id` and `runner_id` distinct.
2. Resolve the configured Notion annotation-relay destination from the current ticket/observer configuration (currently the GM-50 relay page; never guess a page ID). Query its discussions and paginate until every page/comment is read.
3. Correlate the receipt against **all** identity fields available: repository, branch/ref, exact head SHA, workflow run ID, attempt, Check Run ID and workflow identity. Verify receipt schema, annotation pagination/completeness and whether the annotation belongs to the source Check Run or a separate observer Check Run.
4. Interpret only the matching receipt's actual annotation body. An explicit provider-owned Actions billing/payment/spending-cap message is sufficient for `QUOTA_EXHAUSTED`; other messages must be classified by their actual content. Annotation count alone is not message-level evidence.
5. If no exact receipt exists, record `NOTION_RELAY_RECEIPT_NOT_FOUND_FOR_EXACT_RUN`. This means the relay evidence has not arrived or does not cover that ref/run; it does **not** mean annotations are absent and does not close the diagnostic branch.

### Missing-receipt recovery remains AI-owned work

When the exact receipt is missing, continue investigating and repairing the relay path before reporting any blocker: observer workflow trigger coverage (`workflow_run` filters and schedule), configured target repository/ref/branch, exact-SHA run discovery, Check Run pagination, private-target credentials/secrets presence, Notion API authorization/page sharing, publication errors, and receipt deduplication. Use the configured independent observer; do not assume a main-only observer covers PR branches. A scheduled poll covers only the refs actually configured in its private target inventory. Keep secrets out of chat. Provisioning an owner's private secret or granting account/page access is owner-exclusive only if no authorized AI route can perform it; continue every other AI-owned criterion around that boundary.

A GitHub connector rejection such as `API_METHOD_BLOCKED` is only a transport result. It must route to the Notion relay immediately; it is never the terminal diagnosis while the Notion route or relay implementation/configuration remains unexamined. Do not publish generic `UNKNOWN / API_METHOD_BLOCKED` before this recovery. Only after the Notion relay and materially distinct authorized routes have been checked, and relay/configuration repair work is exhausted or genuinely owner-exclusive, may the causal result remain `UNKNOWN` with the exact missing evidence named.

### Owner-facing output gate

`AI_OWNER && AI_WORK_REMAINING => NO_USER_HANDOFF && NOT_DONE`. Do not send progress reports, phase summaries, interim blockers, partial results or permission-to-continue questions while any authorized AI-owned work remains runnable. Treat missing evidence as an engineering task, not as a reason to interrupt the owner. Final output is allowed only after all feasible AI-owned requirements, verification, repair/retest and readback are complete; a genuine host termination must preserve the exact recovery cursor without being described as completion.
