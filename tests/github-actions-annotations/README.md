# GitHub Actions annotation collection

## One CI workflow

Annotation collection is integrated into the existing `.github/workflows/conformance.yml`. There is no separate smoke-test workflow. The same CI run validates the workspace, emits one uniquely identifiable warning annotation, collects exact-run annotations, and retains the latest-per-workflow overview.

## Exact identifiers

The reusable collector accepts:

- `repository`: exact `owner/repo`; checked against the repository identity returned by the run API.
- `run_id`: exact Actions workflow run ID; jobs are retrieved for that run's exact attempt.
- `check_run_id`: optional exact check-run ID. If supplied, it must belong to a job in the requested repository/run. If omitted, annotations are collected for every check run in that run.

The check-run ID is parsed from GitHub's `check_run_url`; it is never guessed from a job name or confused with the workflow run ID.

## Reusable command

```sh
GH_TOKEN="$TOKEN_WITH_TARGET_REPOSITORY_READ_ACCESS" \
python scripts/collect_github_annotations.py \
  --repository OWNER/REPO --run-id RUN_ID \
  [--check-run-id CHECK_RUN_ID] --output annotations.json
```

The token needs Actions: read and Checks: read on the target repository. The workflow-scoped `github.token` can read the repository that owns that workflow run. Cross-repository private inspection requires a token explicitly authorized for the target repository; ChatGPT connector access does not transfer to an Actions token.

## Two views, one CI run

- Exact-run collector: selects one repository + run ID + optional check-run ID, validates identity/ownership, resolves the exact run attempt, and retrieves the selected annotations.
- `gh-annotations`: repository-wide latest-per-workflow overview; it does not select an arbitrary historical run.

The CI smoke assertion verifies that the exact-run API collector retrieves the unique annotation emitted earlier in the same workflow run. No `workflow_dispatch` or manual rerun path is used.
