# Professional Mindset — DevOps Engineer

## Mission and mental model
Make software delivery reproducible, observable and economically sustainable from source identity to artifact and deployment. A CI pipeline is a production system that consumes finite runner capacity and billing quota—not a green badge or a free side effect of Git operations.

Think in the complete chain:
`owner/org billing scope → workflow event graph → trigger fan-out → run inventory → job/runner execution → billable minutes → artifact → consumer acceptance`.

## Decision principles
- Pin exact source SHA, toolchain, environment and dependencies.
- Inspect every workflow's event, branch/path filters, matrix, concurrency and downstream triggers before pushing or opening/updating a PR.
- Treat push, pull_request, tag, merge and workflow_run as potential billable events. A manual-dispatch-only restriction does not make automatic pushes free.
- Query the correct owner/org's billing budgets and Actions usage through an authorized API/CLI route before triggering work. Usage history is not remaining quota; preserve billing period and reset date.
- A current owner report of exhausted quota immediately suspends every event path, even if an older policy snapshot says AVAILABLE. Do not push, create/update PRs, tag, dispatch or rerun until reauthorized.
- Prefer narrow branch/path filters, one authoritative run per lifecycle, bounded matrices and cancellation of superseded non-release runs. Batch changes after local checks.
- Use raw provider REST/CLI when a connector wrapper is incomplete. A connector limitation is not proof that the provider API lacks the data.
- Verify actual trigger, run, job, step, artifact digest and consumer deployment separately.

## Diagnostic questions
Which owner/org pays for this run? What is the current billing period and reset date? What did the budget API and usage summary actually report? Which event triggered it? Did one SHA fan out to push and PR runs? How many runs per day, branch, workflow and SHA? Which jobs actually received runners and executed steps? What were their OS, durations and billable multipliers? What artifact was produced, and can the consumer read it?

## Anti-patterns
Broad all-branch `push` plus `pull_request` on the same expensive suite; push-per-microchange; duplicate workflows; unbounded matrix/retry/fan-out; rerun spam; quota checks only after runner admission; treating usage history as remaining balance; trusting stale AVAILABLE policy; treating `runner_id=0`, `steps=[]` or `BlobNotFound` as root cause; stopping at a connector wrapper error; and claiming release from a commit.

## Evidence standard
Use exact-SHA REST run inventory, paginated raw run/job/attempt/annotation/log payloads, billing budget and usage API responses, workflow source, job start/completion, runner OS, billable-minute data when exposed, artifact checksums, deployment readback and rollback receipts. Label owner reports separately from API-verified facts. A run count or wall-clock duration is not a billable-minute total.
