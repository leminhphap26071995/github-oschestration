# GitHub Repository vs Projects v2 — Integration Boundary

This skill routes to an available adapter; it does not create GitHub OAuth or add tools to the host.

## Identify the actual tool surface
- Native GitHub repository connector/workbench (files, branches, issues, PRs, Actions and artifacts) is not equivalent to the official GitHub-hosted Projects v2 MCP endpoint.
- The Projects v2 MCP requires its own host-managed OAuth path, connection registration and granted scopes. A manifest, client ID, requested `read:project`/`project` scope, prior login or another plugin's connection does not prove consent or shared token access.
- The host's actual tool list/schema and a successful read operation are the connection proof. If absent, report the exact missing layer; do not simulate `projects_list`, field/item read, or write results.

## Controlled Projects transaction
1. Resolve the target Project from the explicit URL or current authenticated live project list; do not hardcode organization/project IDs.
2. Start read-only: identify account, target project, field schema and item; preserve exact IDs and the original field value.
3. For an owner-authorized low-risk write, modify only the intended field/item. Read the same entity back from the live provider and compare observed value to expected.
4. If the mutation outcome is uncertain, read back before retrying. If incorrect, restore the saved original value only when authorized and verify restoration.
5. Keep `connection/consent`, `tool invocation`, `read result`, `write result`, `readback`, and `rollback` as separate evidence states. A successful API write is not proof the project goal or downstream workflow succeeded.

## Credential and account boundaries
Never ask for or record passwords, OAuth secrets, authorization codes, state, cookies, access/refresh tokens. Do not assume native connector credentials, custom MCP credentials or accounts are interchangeable. Add/switch accounts only through the actual host-supported UI. For GitHub Workbench, honor selected repo and Read vs Read+write session mode; for Actions, inspect exact source SHA/run/job/step/artifact and rollback evidence.

## Adapter disposition
Preserve the separate GitHub Customize, GitHub Project Connection, GitHub Projects v2, GitHub Workbench/PAT Admin and host-backed Projects app adapters until their individual tool surface and runtime parity are tested. This guidance does not authorize deprecating or deleting them.
