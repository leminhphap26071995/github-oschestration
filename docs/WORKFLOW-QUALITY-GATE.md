# Workflow Quality Gate and Annotation-First Diagnostics

## Required execution chain

Preflight Validation → Real Failure Detection → Annotation & Log Retrieval → Root Cause Classification → Evidence Receipt

This is a reusable engineering gate, not a text-based error emitter.

## 1. Preflight Validation

- actionlint parses every workflow YAML file and validates GitHub Actions structure, expressions, keys, action inputs and common semantic mistakes.
- The runtime inventory resolves each referenced action's action.yml / action.yaml metadata and reads runs.using.
- Node.js 16 and Node.js 20 action runtimes are retired on GitHub-hosted runners; Node.js 24 is the supported JavaScript action runtime for this policy.
- Unavailable action metadata is UNKNOWN, not a pass. The gate fails closed rather than claiming runtime compatibility.
- Problem Matcher converts actual actionlint diagnostics into GitHub Check Run annotations.

## 2. Real Failure Detection

A test fixture must contain a real malformed YAML or invalid workflow structure. Never emit a prewritten ::error:: string to simulate a parser or framework defect.

For a workflow file that GitHub cannot parse, GitHub can create a failed workflow run before any job is created. In that state the source run may have:
- jobs.total_count = 0;
- no job object, so runner_id and steps are absent rather than numeric zero / empty array;
- no job console log; the run-log endpoint may return 404.

Do not convert missing fields into 0 or [].

## 3. Annotation and log retrieval

### Normal job-backed failure
1. Lock repository, source SHA, run ID and attempt.
2. Retrieve exact-attempt jobs.
3. For every job, retrieve its Check Run annotations by check_run_id.
4. Retrieve logs by job_id after the job is terminal; retain transient log publication failures as separate evidence.
5. Do not assume annotations and logs are interchangeable.

### No-job / no-runner failure
The malformed source workflow itself may not expose a job Check Run or annotation endpoint. Use an independent, trusted observer workflow that:
1. checks out the exact defective SHA;
2. runs actionlint against the actual committed workflow file;
3. lets the Problem Matcher turn the real parser diagnostic into an annotation on the observer's Check Run;
4. completes before the collector reads that Check Run.

The No-Runner Annotation Readback collector is triggered by the observer's workflow_run completion. It uses gh api with actions:read, checks:read, and contents:write to retrieve the exact annotation body. This does not depend on the source run's console logs.

Important provenance distinction: in this case the annotation belongs to the independent observer Check Run, not the original zero-job source run. The receipt links both runs and the exact source SHA. Never claim GitHub exposed a source-run annotation if only the observer annotation exists.

## 4. Root cause classification

- WORKFLOW_YAML_SYNTAX_ERROR: actual YAML parser diagnostic.
- WORKFLOW_SCHEMA_OR_EXPRESSION_ERROR: GitHub workflow semantic / expression diagnostic.
- ACTION_RUNTIME_RETIRED: action metadata identifies a retired runtime such as node16/node20.
- RUNNER_UNAVAILABLE: provider explicitly identifies runner capacity or assignment failure.
- PERMISSION_DENIED: provider explicitly identifies authorization failure.
- QUOTA_EXHAUSTED: only explicit Actions minutes, spending limit, billing or payment evidence.
- EXECUTION_EVIDENCE_MISSING / UNKNOWN: no reliable cause after authorized evidence routes.

runner_id = 0, empty steps, no jobs, missing logs, BlobNotFound, or a connector 404 never prove quota exhaustion.

## 5. Evidence Receipt and ChatGPT readback

GitHub Actions artifact downloads are ZIP archives. For direct ChatGPT repository reading, publish a plain Markdown receipt and raw JSON through the repository Contents API:
- CHATGPT-ANNOTATION-RECEIPT.md;
- exact annotation JSON;
- observer job / Check Run metadata;
- source run and jobs metadata;
- log retrieval status.

ChatGPT reads the .md and .json files through the GitHub connector. No ZIP extraction or source console log is required. The Markdown receipt is a normal repository file, not a compressed artifact.

Every receipt binds repository, branch, source SHA, source run/attempt, observer run, observer check-run ID, exact messages, job/runner/step field states, log retrieval result, classification and retrieval timestamp.

## Test acceptance

The no-runner E2E test passes only when:
1. GitHub creates a failed run from an actually malformed workflow file.
2. The exact source run has no job records and no retrievable logs.
3. The independent observer diagnoses the same committed file using actionlint.
4. GitHub creates a Check Run annotation from the actual actionlint diagnostic.
5. The collector retrieves the annotation message via the Check Runs API.
6. The collector publishes plain Markdown and raw JSON to the same repository branch.
7. ChatGPT reads the Markdown and confirms the actual annotation message, source SHA, source run and observer check-run IDs.
8. No quota conclusion is inferred from the missing runner/log state.
