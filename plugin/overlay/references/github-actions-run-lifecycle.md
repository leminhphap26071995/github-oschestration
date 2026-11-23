# GitHub Actions Lifecycle and Role-Preflight Contract

The mandatory provenance order is **Git Tree → blob/receipt → runner_id → job_id → run_id + attempt → head_sha → actual execution**. It is an identity/provenance chain, not a quota-detection algorithm. Never start from runner_id, a run/job wrapper, check-run ID or log URL. Git Tree and exact blob/receipt establish source and intended execution; runner_id is only the third correlation field. Preserve PRESENT/NULL/MISSING and bind IDs to the same receipt/SHA. For failure cause, read the exact provider annotation first: explicit failed-payment/spending-limit/Actions-billing text is sufficient `QUOTA_EXHAUSTED` and short-circuits runner/step/log diagnosis. Require executed steps/logs/artifacts only when claiming that code actually ran.

Professional role selection, role splitting, `project.workflow` resolution and role-context compilation MUST run through the project's configured automatic GitHub Actions workflow. Python is permitted inside that hosted runner only. ChatGPT-local Python/container, local shell, manual role selection, `workflow_dispatch` and manual reruns are not alternate paths. If CI preflight does not actually execute or its receipt cannot be verified, mark role routing BLOCKED/UNKNOWN and do not dispatch specialists.

Keep quota diagnosis annotation-first and explicit-only. `runner_id=0`, NULL/MISSING fields, empty steps, queued states, missing logs and `BlobNotFound` do not prove quota or identify the cause. However, when the exact run's authoritative annotation explicitly says recent account payments failed, the spending limit must be increased, or equivalent Actions billing restriction applies, classify `QUOTA_EXHAUSTED` immediately; do not wait for or query runner/step/log metadata as a second check. Classify each job independently and continue unrelated runnable work.



## Run URL, identifier and report consistency gate

A GitHub browser URL `https://github.com/{owner}/{repo}/actions/runs/{N}` identifies **`run_id=N`**, not a `runner_id`. A URL ending in `/actions/runs/44651409187` must be reported as `run_id=44651409187`. `runner_id` is a separate job field and may be PRESENT, NULL, MISSING, or a raw numeric zero.

Before interpreting or publishing an Actions report:
1. Parse the numeric suffix from every run URL and preserve it as `run_id`.
2. Fetch the exact run object. Verify its returned `id` equals the URL's run ID; verify repository, workflow/path, event, head SHA, status, conclusion and `run_attempt`. If the values disagree, mark `IDENTITY_INCONSISTENT`, stop interpretation and perform one materially different authoritative retrieval.
3. Retrieve the check-run annotation bound to that exact run/source SHA. If it explicitly identifies failed payment, a spending-limit restriction or equivalent Actions billing block, classify `QUOTA_EXHAUSTED` immediately and stop. Do not fetch job payloads, runner metadata, steps or logs merely to reconfirm quota. For fields not already available from the source-bound receipt, report `job_id=NOT_QUERIED_BY_DESIGN` and `runner_id=NOT_QUERIED_BY_DESIGN`; never invent or substitute values.
4. Only when the annotation is not decisive, or when an independent executed-step failure needs diagnosis, fetch attempt-scoped jobs. Verify each job's `run_id`, `run_attempt` and `head_sha` match the exact run. Keep `job_id` and `runner_id` separate. Then inspect steps/logs only where execution actually occurred.
5. Cross-check every displayed URL, run ID, job ID, runner ID, attempt and SHA against the authoritative provider payload and source-bound receipt. Any disagreement requires one materially different retrieval before causal interpretation; do not repeat the same failed adapter call.

Required report fields: `run_url`, `run_id`, `run_attempt`, `job_id` and `runner_id` with explicit observed/not-queried state, `head_sha`, `workflow_path`, `annotation_source`, `failure_classification`, and `actual_execution_state`. A known run ID in a URL must never be omitted or relabelled as a runner ID.

## Connector annotation route

The exact-SHA check-run list returns check-run IDs, annotation counts and annotation URLs. Retrieve the exact URL only if the active connector allows it. If blocked, record API_METHOD_BLOCKED and attempt one materially different authorized route. Do not equate a blocked endpoint with no annotations. Distinguish owner-supplied exact text (REPORTED) from text actually retrieved by the connector.


## Workflow Quality Gate and no-runner annotation recovery

Required chain: Preflight Validation -> Real Failure Detection -> Annotation & Log Retrieval -> Root Cause Classification -> Evidence Receipt.

Preflight validates workflow YAML and GitHub Actions semantics with a pinned parser/linter, then resolves every referenced action metadata file and checks runs.using. Do not infer runtime compatibility from an action tag. Node.js 16 and Node.js 20 action runtimes are retired; Node.js 24 is the supported JavaScript action runtime. Unknown metadata or Node.js 18 is not a pass.

Real-failure tests must contain a genuine malformed workflow/configuration or runtime defect. Never print a prewritten ::error:: string to simulate parser output. Keep every test bound to the exact source SHA.

For a normal job-backed failure, retrieve exact run/attempt jobs, Check Run annotations by check_run_id, and job logs as separate channels. If the terminal source run has zero jobs and no console log, use an independent trusted observer on the exact SHA. Let actionlint parse the actual defective file; use a GitHub Problem Matcher to attach the real diagnostic to the observer Check Run. After observer completion, a separate workflow_run collector retrieves the exact annotation message via the Checks API.

Preserve provenance: an observer annotation belongs to the observer Check Run, not the original zero-job source run. Link both runs, check_run_id and source SHA. Publish a plain Markdown receipt plus raw JSON through repository Contents so ChatGPT can read it without downloading or extracting a ZIP.

Keep MISSING distinct from explicit runner_id=0 and steps=[]. A zero-job source run has no job object, so runner_id and steps are absent. Neither no jobs, runner_id=0, empty steps, BlobNotFound, missing logs nor generic HTTP errors prove quota. QUOTA_EXHAUSTED requires explicit provider evidence of Actions billing/minutes/spending-limit/payment restriction.

Acceptance cases: genuine YAML syntax failure; valid-YAML semantic defect; retired action runtime metadata; normal job-backed failure; zero-job/no-console-log source run; explicit runner_id=0 with steps=[] counterexample; blocked annotation endpoint recovered by authorized gh api; ChatGPT reads exact Markdown and JSON receipt. Annotation count alone is not message-level proof.
