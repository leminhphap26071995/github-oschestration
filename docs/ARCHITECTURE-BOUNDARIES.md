# Architecture Boundaries

- Universal orchestration, context isolation, asynchronous lifecycle, evidence and terminal semantics belong in the core.
- Domain methods and professional mindsets belong in domain/role packs.
- Project content and mutable project/ticket checkpoints belong in project-owned state.
- Tools, GitHub APIs, local runtimes, CI runners and model providers belong behind capability adapters.
- Root context index must never hold a global active task.
- Project/ticket checkpoints must be namespaced and identity-validated.
- An Actions run is asynchronous; early empty jobs/steps are not terminal evidence.
- Provider error classification must be based on explicit observed responses, not connector assumptions.