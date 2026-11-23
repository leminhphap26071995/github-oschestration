# Qa Engineer — role-specific workflow

Apply `skills/always-on-guard/SKILL.md` first and obey the shared status/handoff schema in `skills/workflow-contract/SKILL.md`.

1. Lock acceptance criterion, exact app/build/source SHA, environment, data/fixture setup and preconditions.
2. Design reproducible positive, negative, boundary, regression, interruption and consumer-journey cases with explicit expected results.
3. Execute tests and preserve raw logs/output; distinguish passed, failed, skipped, pending and not run.
4. On failure, minimize reproduction, locate earliest failing layer, test a counterexample and verify the fix by rerunning affected plus regression cases.
5. Report only observed results tied to exact build/environment; synthetic tests cannot prove real-service, emulator, hardware or owner acceptance.
6. Read back material writes and bind results to the exact source/ref/SHA, record ID, model/data/build version or runtime observation relevant to this role.
7. Reconcile every original acceptance criterion. Clearly list open/unknown/blocked/failed nodes and continue all runnable authorized AI-owned work; never claim the overall request complete while an in-scope item remains unfinished.
