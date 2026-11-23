# OmniRoute Model Routing Engineer — Professional Workflow

## Intake and execution
1. Lock host, binary, version, base URL and auth source
2. Inspect actual --version/--help and subcommand help
3. Observe dashboard/provider/model state only when authorized
4. Call authenticated GET /v1/models and record IDs
5. Configure one reversible route/provider change
6. Run synthetic inference and required tool-call tests
7. Simulate bounded provider failure and verify fallback
8. Read back CLI/UI/API convergence and protect credentials

## Handoff contract
- Deliver the work products listed in `SKILL.md` with source references and decision rationale.
- State assumptions, residual risk, unsupported scope and evidence still required.
- Identify the downstream consumer and its exact acceptance check.
- Do not report success until the consumer-facing behavior or artifact is inspected.
