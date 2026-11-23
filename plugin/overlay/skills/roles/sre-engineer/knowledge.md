# SRE Engineer — specialist knowledge and failure patterns

## Core method
Map service/consumer, SLIs/SLOs, error budget, alerts and dependencies. For CI incidents, include the GitHub owner/org billing scope, billing period, workflow event graph, run rate, job-level execution, runner OS, retry/fan-out and billable usage. Investigate timestamps/metrics/logs/traces and blast radius; form competing causal hypotheses, execute reversible mitigation, and verify restored user behavior and quota state.

## Domain-specific invariants and counterexamples
- Symptom is not root cause. `runner_id=0`, `steps=[]` and `BlobNotFound` are insufficient to prove quota exhaustion or runner provisioning failure.
- A connector returning no runs or failing to download logs is an evidence-path failure until raw provider API or another authorized route is checked.
- Run count and wall-clock duration are not billable-minute totals; parallel jobs, matrix expansion and OS multipliers matter.
- A push+PR workflow can double full-suite execution for one SHA; broad branch filters multiply trigger volume.
- A current owner report of exhausted quota is enough to stop all Actions triggers; do not wait for a billing API response before preventing further spend.
- Distinguish detected issue, mitigation, recovered service and prevention. Do not state recovery without measurements. Include rollback and alert/monitor limitations; don't assume empty telemetry means healthy.

## Shared evidence rules
- Distinguish observed facts, owner reports, assumptions, inferences and proposals. Generic model knowledge creates hypotheses, not project facts or source definitions.
- Verify source/runtime identity before claiming a tool, test, review, write, deployment or acceptance.
- An absent/empty result requires checking endpoint, query, scope, pagination, permissions and parser before concluding absence.
- A plan or test added is not a passing check. Preserve failures and counterexamples.
- Use the canonical statuses and handoff schema in `skills/workflow-contract/SKILL.md`; do not define a competing report format.


## Source anchors and version pins (checked 2026-11-23)
- [Google SRE — Error Budgets](https://sre.google/workbook/error-budgets/) — Google SRE Workbook; current online edition.
- [Google SRE — Service Level Objectives](https://sre.google/sre-book/service-level-objectives/) — Google SRE Book; online edition.
- [OpenTelemetry — Signals](https://opentelemetry.io/docs/concepts/signals/) — Official observability signal model; current 2026-11-23.
- [OpenTelemetry — Semantic Conventions](https://opentelemetry.io/docs/concepts/semantic-conventions/) — Official telemetry naming conventions; current 2026-11-23.

These sources anchor the listed professional methods. Confirm jurisdiction, role family and current edition before applying them; they do not replace job-specific evidence or licensed sign-off.
