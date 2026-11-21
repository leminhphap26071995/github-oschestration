# GitHub Actions annotation extension smoke test

This branch validates the upstream GitHub CLI extension [swfz/gh-annotations](https://github.com/swfz/gh-annotations) from an automatic GitHub Actions run.

## Flow

1. `emit-annotation` emits a unique GitHub warning annotation containing the current run ID.
2. `collect-annotations` waits for that job to complete, installs the upstream extension, and invokes:

   ```sh
   gh annotations -repo "$GITHUB_REPOSITORY" -json
   ```

3. The workflow asserts that the JSON contains the unique marker from the completed producer job and uploads the JSON as an artifact.

The token is the workflow-scoped `github.token` with read-only `actions`, `checks`, and `contents` permissions. No PAT or repository write permission is used.

## Important scope limitation

The upstream extension enumerates the **latest run of each workflow** in a repository, then retrieves annotations for those runs' jobs. It does not accept an arbitrary historical workflow run ID. Therefore this smoke test validates annotation retrieval for its own current run after the producer job completes; it does not claim to retrieve historical run #44497985350 from `mod-ps1-game`.

The workflow is push-only on `tests/exhausted-github-quota`; it deliberately has no `workflow_dispatch`.
