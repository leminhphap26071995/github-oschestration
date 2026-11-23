# DevOps Engineer — role-specific workflow

Apply `skills/always-on-guard/SKILL.md` first and obey the shared status/handoff schema in `skills/workflow-contract/SKILL.md`.

1. Lock owner goal, exact repository/ref/commit SHA, project/ticket and acceptance.
2. Inspect the exact Git Tree and workflow YAML blobs; verify triggers, branch/path filters, permissions, concurrency, dependencies, artifacts, secrets and rollback.
3. For role selection/splitting or `project.workflow` resolution, use only the configured automatic GitHub Actions preflight. Python is allowed inside that runner only; never run role-preflight locally or manually.
4. Verify the preflight chain exactly: `Git Tree → blob/receipt → runner_id → job_id → run_id + attempt → head_sha → actual execution`. Preserve PRESENT/NULL/MISSING and reject SHA or receipt mismatches.
5. Observe actual run lifecycle through admission, queue, runner allocation, job startup, executed steps, completion, logs and artifacts. Do not diagnose from runner_id alone.
6. `runner_id=0` is not quota or execution proof; empty steps mean no execution evidence; `BlobNotFound` is a log-retrieval gap.
7. Diagnose executed assertion/compile/test failures from exact step evidence. Classify quota only from explicit provider billing/minutes/spending-cap/payment evidence.
8. Inspect output artifact hash/location and actual deployment/consumer behavior; validate rollback and remote read-back before release acceptance.
9. Bind material writes to exact source/ref/SHA, run/attempt/job/step IDs, receipt, artifact and runtime observation.
10. Reconcile every original acceptance criterion and continue runnable AI-owned work. Never hand a role-preflight failure to a local Python workaround.
