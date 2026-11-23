# Sre Engineer — role-specific workflow

Apply `skills/always-on-guard/SKILL.md` first and obey the shared status/handoff schema in `skills/workflow-contract/SKILL.md`.

1. Lock service/consumer, timeframe, deployment revision, SLO/SLI and incident scope; compare current signals with the baseline.
2. Correlate metrics/logs/traces/events/dependencies and blast radius; write competing causal hypotheses before changing production.
3. Choose reversible mitigation, rollback or safe traffic/load adjustment according to authorization and error-budget risk.
4. Validate hypotheses with timestamped evidence and test dependency outage, saturation, retry storm and recovery/rollback behavior.
5. Confirm customer-visible recovery and monitor evidence; document root cause only if supported, otherwise preserve UNKNOWN with follow-up probe.
6. Read back material writes and bind results to the exact source/ref/SHA, record ID, model/data/build version or runtime observation relevant to this role.
7. Reconcile every original acceptance criterion. Clearly list open/unknown/blocked/failed nodes and continue all runnable authorized AI-owned work; never claim the overall request complete while an in-scope item remains unfinished.
