# Host Execution, Preflight and Quota Contract

## Preflight placement
Preflight runs in the active orchestration host that owns the next invocation. Do not run it inside a restricted ChatGPT Python/container sandbox and treat that sandbox as the ChatGPT host, the user's device or a permission broker.

- ChatGPT conversation + connected tools: model-guided preflight can inspect currently exposed tools and permissions. Plugin instructions cannot intercept or hard-block the host tool broker. Label MODEL_GUIDED, not HOST_ENFORCED.
- ChatGPT Python/container: bounded optional compute only. Probe network/DNS, filesystem mounts, packages, media support and process/time limits when needed. It is not the user's Android/desktop runtime and provides no host tool interception.
- User local machine: separate filesystem, network and installed software; no access unless an authorized bridge actually exposes it.
- VS Code/Omni Studio: place preflight in the extension host/tool broker before invocation. Call HOST_ENFORCED only after negative tests prove denied tools never execute.
- CI/cloud runner: separate execution surface with its own quota, network, filesystem and lifetime.
- Provider connector/API: use only observed methods, identity, scopes, pagination and endpoints.

## Capability profile
Probe only goal-relevant capabilities: network/DNS, filesystem, shell/Python/packages, CPU/GPU/memory/timeouts, image pixel ingestion, OCR/audio/video/frame extraction, browser/UI, provider scopes, storage/artifact readback, continuity/cancellation and cost/budget. Classify READY, LIMITED, MISSING, DENIED or UNKNOWN with exact evidence. If local DNS fails, try an authorized provider connector rather than asserting the host has no network. If image pixels cannot reach the model, do not infer visual inspection from a URL, base64 text, hash or CI preview.

## GitHub Actions asynchronous lifecycle
Use `skills/github-actions-run-lifecycle/SKILL.md`. Observe admission → queue → runner allocation/warm-up → job startup → steps → completion → log/artifact publication. Empty jobs while queued/in-progress and empty steps during startup are PENDING. Respect Retry-After. Retry transient log-publication 404/BlobNotFound only after job completion with bounded backoff. Observation-window expiry is not job failure. Never claim background polling after the active host ends without a real scheduler/worker.

## Quota classification
QUOTA_EXHAUSTED requires explicit billing/minutes/spending-cap/payment evidence or an unambiguous provider error identifying Actions usage exhaustion for the correct billing owner and period. Preserve exact message, endpoint/status, owner, period/reset and cap/spent values when available. runner_id=0, empty jobs/steps, queued status, missing logs, generic HTTP errors, startup_failure alone, rate limits and connector wrapper failures are not quota proof. Billing API unavailability establishes neither AVAILABLE nor EXHAUSTED.

When exhaustion is confirmed, notify the owner with exact evidence and affected scope; pause subsequent trigger-producing pushes, PR updates, tags, merges and reruns until reset or reauthorization. Continue independent offline work. If quota is UNKNOWN, report UNKNOWN and follow standing authorization for the intended automatic event.

## Trigger discipline
Inspect event fan-out, branch/path filters, matrices, concurrency, duplicate push+pull_request events and downstream workflows before writes. Follow automatic-only policy; no manual workflow_dispatch/rerun where prohibited. Docs-only changes use relevant content checks and remote readback, not unnecessary CI. A preflight inside a hosted job cannot prevent that job's own runner allocation.
