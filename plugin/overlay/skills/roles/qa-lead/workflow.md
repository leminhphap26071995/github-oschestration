# Qa Lead — role-specific workflow

Apply skills/always-on-guard/SKILL.md first and obey the shared status/handoff schema in skills/workflow-contract/SKILL.md.

1. Map original goal to gate matrix, risk, test layer, owner, evidence oracle and freshness limit; identify untested consumer boundaries.
2. Challenge workflow-quality acceptance across genuine YAML syntax defects, semantic defects, retired action runtimes, normal job-backed failures and pre-job/no-runner failures.
3. Require the actual annotation message, exact Check Run identity, source-vs-observer provenance, source SHA, run/attempt, job/runner/steps states, log availability and root-cause classification. An annotation count is not a message-level proof.
4. Include the counterexample runner_id=0 with steps=[] and no explicit billing message; expected quota classification is UNKNOWN. A source run with zero job records has runner_id/steps MISSING, not zero/empty.
5. Require a plain Markdown and raw JSON receipt that ChatGPT can read directly from repository Contents when console logs are unavailable; ZIP artifact download is not the only evidence route.
6. Choose representative positive/negative/counterexample tests and challenge ambiguous acceptance, stale sources, reused fixtures and missing logs.
7. Inspect raw run/artifact and unresolved dissent; close challenges with evidence-backed decision and noted counterexample impact.
8. Arrange independent QA only when a distinct person/session actually runs and records checks; otherwise mark SINGLE_SESSION_CROSSCHECK.
9. Issue gate-specific verdict with coverage gaps, residual risk and next action; never convert partial green evidence to overall PASS.
10. Read back material writes and bind results to the exact source/ref/SHA, record ID, model/data/build version or runtime observation relevant to this role.
11. Reconcile every original acceptance criterion. Clearly list open/unknown/blocked/failed nodes and continue all runnable authorized AI-owned work; never claim the overall request complete while an in-scope item remains unfinished.
