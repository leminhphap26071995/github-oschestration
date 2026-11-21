# GitHub Actions annotation API smoke test

This branch validates exact-run annotation retrieval using the workflow-scoped GitHub CLI token and GitHub REST API.

## Flow

1. The automatic `push` event creates a workflow run and GitHub assigns its run ID.
2. `emit-annotation` emits a unique warning marker containing that run ID.
3. `collect-annotations` checks out the exact triggering revision (`github.sha`) with full history.
4. It retrieves jobs for the exact run:

   ```sh
   gh api "repos/$GITHUB_REPOSITORY/actions/runs/$RUN_ID/jobs?per_page=100"
   ```

5. It resolves the producer's check-run ID from that job's `check_run_url`, verifies the ID matches the job ID returned by GitHub, then retrieves annotations for that exact check run:

   ```sh
   gh api "repos/$GITHUB_REPOSITORY/check-runs/$CHECK_RUN_ID/annotations?per_page=100"
   ```

6. The workflow asserts that the returned annotation contains the unique marker and uploads the raw jobs and annotations JSON as evidence.

## ChatGPT run correlation

ChatGPT does not invent or manually dispatch a run ID. The workflow is triggered by the normal source commit push. After the push, ChatGPT discovers the run using the exact repository, branch and pushed commit SHA, verifies the workflow path and event, imports the returned `run_id`, then observes that run's jobs, check runs, annotations and logs.

## Permissions and scope

The job uses only the workflow-scoped `github.token` with read-only `actions`, `checks` and `contents` permissions. No PAT or repository write permission is used inside the runner.

This test proves exact-run retrieval inside this repository and workflow. It does not grant the token access to another repository. Cross-repository inspection still requires a credential that is authorized for the target repository.

The workflow is push-only on `tests/exhausted-github-quota`; it deliberately has no `workflow_dispatch`.
