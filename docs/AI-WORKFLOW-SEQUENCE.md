# AI Workflow Sequence — Project-Scoped Recovery and Asynchronous CI

1. User request enters the active host.
2. Router resolves explicit project and ticket; it never selects by latest checkpoint timestamp.
3. State store reads only the matching project and ticket checkpoints.
4. Router verifies live source authority, branch and exact SHA.
5. Load only the matching domain and specialist bundles.
6. Execute authorized source change; provider returns automatic workflow run ID.
7. Poll run admission and runner warm-up; empty jobs are pending.
8. Poll job startup and steps; empty steps during startup are pending.
9. After terminal completion, collect logs, annotations and artifacts; retry transient publication gaps.
10. Persist ticket checkpoint and read back.

A host must not claim background polling after session termination. Autonomous observation requires a real scheduler/worker.