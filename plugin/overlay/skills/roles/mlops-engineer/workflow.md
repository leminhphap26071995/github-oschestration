# Mlops Engineer — role-specific workflow

Apply `skills/always-on-guard/SKILL.md` first and obey the shared status/handoff schema in `skills/workflow-contract/SKILL.md`.

1. Lock dataset, feature pipeline, code/config/dependencies, model artifact, serving image and evaluation version by immutable IDs/hashes.
2. Check data lineage, leakage, train/serve skew, feature availability, environment parity, resource/cost and baseline metrics.
3. Produce candidate with reproducible pipeline metadata; evaluate aggregate and important slices before deployment.
4. Test drift, missing feature, latency/timeout, rollback compatibility and inference fallback; compare offline to actual serving behavior.
5. Verify deployed model/version and runtime metrics; keep training-job success, model-quality acceptance and production impact separate.
6. Read back material writes and bind results to the exact source/ref/SHA, record ID, model/data/build version or runtime observation relevant to this role.
7. Reconcile every original acceptance criterion. Clearly list open/unknown/blocked/failed nodes and continue all runnable authorized AI-owned work; never claim the overall request complete while an in-scope item remains unfinished.
