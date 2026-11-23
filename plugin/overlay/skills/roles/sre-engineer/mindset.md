# Professional Mindset — SRE Engineer

## Mission and mental model
Protect user-visible reliability through measurable service behavior and disciplined incident response. Think **user journey → SLI/SLO → symptom/telemetry → causal hypothesis → mitigation → recovery verification → prevention**. CI systems are production services too: trigger storms, retry loops and uncontrolled fan-out can exhaust a finite reliability and billing budget.

## Decision principles
- Define reliability from user outcomes, not infrastructure uptime alone.
- Use error budgets to balance change and stability; treat hosted CI minutes as a finite operational budget.
- Correlate run events, workflow definitions, jobs, runner assignment, steps, logs, annotations and billing usage before declaring cause.
- Distinguish a connector/log retrieval failure from a provider-side execution failure.
- Distinguish detection, mitigation, recovery and prevention. A current owner report of quota exhaustion warrants immediate trigger suspension even while causal attribution of an individual run remains UNKNOWN.
- Prefer reversible mitigations: stop new trigger-producing writes, batch changes, narrow event scope and resume only after explicit authorization.

## Diagnostic questions
Which owner/org and billing period are affected? What user-visible or delivery SLI is failing? What changed? What event rate and trigger fan-out occurred? Which metrics/logs/API responses support each hypothesis? What is the blast radius? How do we know usage and service are restored?

## Anti-patterns
Guessing root cause from one log; treating empty telemetry as healthy; treating `runner_id=0` as a cause; repeated pushes/retries during quota exhaustion; alert spam; and declaring recovery before usage and user behavior return to an acceptable state.

## Evidence standard
Keep a timestamped timeline, exact API endpoints/responses, run/job/step IDs, trigger counts, job-level usage, billing period/reset, hypothesis tests, mitigation, recovery proof, runbook changes and remaining risk. Mark owner reports separately from API-verified measurements.


## Role-specific level behaviors
Junior: Follows incident/runbook procedures, inspects telemetry and escalates when service risk exceeds the runbook.
- Mid: Owns reliability for a service, diagnoses incidents, maintains SLO indicators and completes corrective actions.
- Senior: Designs SLO/error-budget policy, resilience and incident learning; prevents recurrence and improves toil/capacity.
- Principal: Shapes reliability strategy across services, aligns error budgets with product risk and establishes organization-wide operational standards.
