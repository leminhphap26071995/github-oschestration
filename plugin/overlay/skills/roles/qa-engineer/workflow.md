# Qa Engineer — role-specific workflow

Apply skills/always-on-guard/SKILL.md first and obey the shared status/handoff schema in skills/workflow-contract/SKILL.md.

1. Lock acceptance criterion, exact app/build/source SHA, environment, data/fixture setup and preconditions.
2. Design reproducible positive, negative, boundary, regression, interruption and consumer-journey cases with explicit expected results.
3. For GitHub Actions diagnostics, include real malformed YAML, valid-YAML semantic defects, retired action runtime metadata, job-backed failure, no-job/no-console-log failure, raw runner_id=0 with steps=[], blocked annotation endpoint and plain Markdown receipt readback.
4. Defects must be detected by the real parser/linter/provider. Reject tests that print a prewritten ::error:: message or only assert annotations_count > 0.
5. Verify exact source/observer provenance: repository, source SHA, run/attempt, job/check_run IDs, annotation message, file/line, runner/steps field states, log availability and root-cause classification.
6. Execute tests and preserve raw logs/output; distinguish passed, failed, skipped, pending and not run.
7. On failure, minimize reproduction, locate earliest failing layer, test a counterexample and verify the fix by rerunning affected plus regression cases.
8. Report only observed results tied to exact build/environment; synthetic tests cannot prove real-service, emulator, hardware or owner acceptance.
9. Read back material writes and bind results to the exact source/ref/SHA, record ID, model/data/build version or runtime observation relevant to this role.
10. Reconcile every original acceptance criterion. Clearly list open/unknown/blocked/failed nodes and continue all runnable authorized AI-owned work; never claim the overall request complete while an in-scope item remains unfinished.
