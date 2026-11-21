# GitHub Actions annotation API smoke test

## Exact identifiers

The reusable collector accepts:

- \`repository\`: exact \`owner/repo\`; it is checked against the repository identity returned by the run API.
- \`run_id\`: exact Actions workflow run ID; jobs are retrieved for that run's exact attempt.
- \`check_run_id\`: optional exact check-run ID. If supplied, it must belong to a job in the requested repository/run. If omitted, the collector resolves every job's \`check_run_url\` and collects all corresponding annotations.

The check-run ID is parsed from GitHub's \`check_run_url\`; it is never guessed from a job name or confused with the workflow run ID.

## Reusable command

\`\`\`sh
GH_TOKEN="$TOKEN_WITH_TARGET_REPOSITORY_READ_ACCESS" \\
python scripts/collect_github_annotations.py \\
  --repository OWNER/REPO --run-id RUN_ID \\
  [--check-run-id CHECK_RUN_ID] --output annotations.json
\`\`\`

The token needs Actions: read and Checks: read on the target. The workflow-scoped \`github.token\` can read only the repository that owns that workflow run. Cross-repository private inspection requires a token explicitly authorized for the target repository; ChatGPT connector access does not transfer to an Actions token.

## Automated validation

The push-only smoke workflow emits a unique annotation, invokes the collector with its own repository and run ID, and asserts that the exact run's annotation contains the run-specific marker. The conformance workflow runs unit tests for repo/run/attempt/check-run validation and retains \`gh-annotations\` as a separate latest-per-workflow overview.

These are distinct paths: the reusable collector targets one exact historical run; \`gh-annotations\` is a repository-wide latest-per-workflow view and does not select an arbitrary historical run.

No \`workflow_dispatch\` or manual rerun path is used.
