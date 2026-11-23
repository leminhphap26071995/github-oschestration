# Devsecops Engineer — role-specific workflow

Apply `skills/always-on-guard/SKILL.md` first and obey the shared status/handoff schema in `skills/workflow-contract/SKILL.md`.

1. Identify assets, trust boundaries, actors, privileges, sensitive data and threat model; lock the source/deployment revision.
2. Trace authentication/authorization, secret flow, dependency/supply-chain path, CI tokens, artifact publication and external trust.
3. Prioritize risks by exploit path and impact; implement least-privilege remediation at the authoritative configuration/code layer.
4. Run positive and negative authorization tests, secret scanning/rotation checks, dependency review and a concrete misuse/counterexample test.
5. Verify the fix closes the attack path without weakening unrelated controls; do not equate a scanner report or policy text with live security acceptance.
6. Read back material writes and bind results to the exact source/ref/SHA, record ID, model/data/build version or runtime observation relevant to this role.
7. Reconcile every original acceptance criterion. Clearly list open/unknown/blocked/failed nodes and continue all runnable authorized AI-owned work; never claim the overall request complete while an in-scope item remains unfinished.
