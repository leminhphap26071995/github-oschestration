---
name: integration-routing
description: Route actual connected GitHub, Projects, Notion, Google Drive, browser/MCP and local execution capabilities without inventing access.
---
# Integration routing

- Discover the actual tool, schema, permissions, identity and source-of-truth before acting. A plugin/connector manifest does not prove an integration works.
- **Notion:** Universal Project Routing Registry selects persistent project/repo/branch; project hub/work board manages ticket/checkpoint state; technical acceptance requires live technical evidence. Read back writes.
- **GitHub:** inspect live repository/ref/SHA, files, commits, issues, PRs, workflows and artifacts within granted access. Do not create Issues/PRs by default where Notion tickets are canonical.
- **Projects v2:** use only after actual OAuth and project tools are available; verify exact board and read back mutations.
- **Google Drive:** use the project's configured authorized private source-acquisition transport when one exists. Do not make interactive ChatGPT Drive browsing/download a prerequisite. Never request/store passwords, auth codes, access/refresh tokens or cookies.
- **Browser/multi-chat/local bridge:** require actual supported runtime; no role label proves child sessions or independent reviewers.

## Repository clone, branch copy and migration
This is AI-owned execution when the owner asks for it.
1. Recover the exact source repo/ref/SHA and destination repo/branch from the active project requirement/checkpoint.
2. Verify both repositories, access, visibility, archive state, source read permission and destination push permission. Preserve unrelated destination data.
3. Use the actual connected GitHub transfer/import/clone capability or configured authorized Git remote executor. Do not ask the owner to operate Actions just to copy a branch.
4. Preserve complete Git history when a full clone/mirror is requested. If using GitHub tree/blob/commit APIs to copy a snapshot, explicitly identify it as a snapshot—not a full clone—and do not silently weaken the requirement.
5. Read back destination HEAD, commit ancestry, tree and refs. Record upstream and destination SHA separately.
6. Actions are not required for Git transfer. Trigger CI/CD only for a separate acceptance dependency such as source validation, build, tests or packaging.
7. If the preferred connector wrapper fails, inspect its schema/error and try a distinct authorized route. Do not ask the owner to repeat recoverable context or perform actions already permitted to the AI. Ask only for a missing owner-exclusive permission/approval.

## Connector versus provider API evidence
A connector method is an adapter/view over a provider capability, not necessarily the provider's complete inventory. Before interpreting an empty, filtered, truncated or failed connector result:
1. Inspect exact method endpoint, filters, pagination, attempt scope, permissions and response schema.
2. If an authorized raw provider REST/API or CLI route exists, query the exact resource/endpoint and required pagination.
3. Preserve method/endpoint, query parameters, page/cursor, owner/repo, SHA, timestamp, HTTP status and relevant raw response fields.
4. Treat connector errors as failures of that access path until a distinct authorized route is tried. A 403/404/422, missing blob or empty array does not prove the provider object/capability is absent.
5. Do not bypass authentication, permissions, billing restrictions or endpoint policy. If no authorized route exists, mark the exact capability gap UNKNOWN and continue independent work.

## AI tooling and MCP lifecycle boundary
An imported skill/tool/MCP definition is not proof of execution. Keep discovery, installation, configuration, connection, invocation and verification as separate evidence states. A role or skill never grants host permissions.


## GitHub Git Data API — repository source navigation and transfer semantics

For repository inventory or source retrieval, prefer the exact Git object graph over broad file-by-file guessing. Use the connected GitHub REST route through `mcp__GitHub__fetch` via `functions.exec` when available and authorized:

1. Read `GET /repos/{owner}/{repo}` and the requested branch/ref. Resolve the exact commit with `GET /repos/{owner}/{repo}/commits/{ref}`; record its full SHA and `commit.tree.sha`.
2. Enumerate `GET /repos/{owner}/{repo}/git/trees/{tree_sha}?recursive=1`. Preserve each path, mode, type and SHA. If `truncated=true`, the response is incomplete: traverse the returned subtree tree SHAs with non-recursive tree requests; never interpret omitted entries as absent.
3. Retrieve only relevant source with `GET /repos/{owner}/{repo}/git/blobs/{blob_sha}` or `GET /repos/{owner}/{repo}/contents/{path}?ref={exact_sha}`. Decode base64 only for textual blobs; keep binary data in a supported byte/file transport. Use pagination for collection endpoints and preserve the exact URL, ref and blob SHA.
4. Compare branch tips and ancestry with the compare/commit endpoints; do not infer a full clone from a complete file tree.

### Clone, mirror and API snapshot are different operations

- A full clone/mirror means preserving Git commit history, refs and required tags. Use a native transfer/import/clone capability or a configured authorized Git remote executor that actually transfers those objects.
- GitHub REST tree/blob APIs provide a source inventory and content retrieval route. Creating destination blobs, a tree, a commit and updating a ref with `create_blob`, `create_tree`, `create_commit` and `update_ref` creates an API-based snapshot/commit, not a full clone. Preserve the upstream SHA as provenance and say explicitly that history was not cloned.
- When creating a snapshot, start from the verified destination base tree to preserve unrelated files, use the intended parent commit, and update the ref with an expected-HEAD guard. Read back destination HEAD, tree and commit ancestry.
- Never use GitHub Actions merely to copy repository data. Actions run only for a separate source/test/build/package acceptance dependency. Do not bypass repository permissions or copy protected project data into an unrelated/public destination.


## GitHub Actions raw REST URL routing in ChatGPT

For Actions evidence, do not treat a connector wrapper as the provider's complete API. Use `mcp__GitHub__fetch({url: exact_rest_url})` through `functions.exec` and parse the raw JSON when IDs or step fields are missing:

- Run discovery by exact source: `GET /repos/{owner}/{repo}/actions/runs?head_sha={sha}&branch={branch}&event={event}&per_page=100`. Match the returned run to the exact SHA, branch, event and workflow path. Do not use a PR-only run wrapper for push events.
- Run detail: `GET /repos/{owner}/{repo}/actions/runs/{run_id}`.
- Attempt-scoped jobs and full step summaries: `GET /repos/{owner}/{repo}/actions/runs/{run_id}/attempts/{attempt_number}/jobs?per_page=100`.
- Check-runs/annotations and artifacts are separate evidence routes; use exact run/job IDs and preserve failures of each route separately.

Treat raw `run_id`, `job.id`, `runner_id` and `steps` as independent fields. Preserve explicit null versus missing. Never manufacture `run_id=[]`, substitute `runner_id=0` for a missing value, or conclude that steps are absent because a wrapper projection omitted them. A raw terminal response with `steps=[]` means no steps are recorded in that job; it does not identify the cause. Do not infer quota without explicit billing evidence.
