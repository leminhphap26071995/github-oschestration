# Workflow Tooling Contract

The canonical machine-readable registry lives in `LyonPro/ai-workflow-oschestration/contracts/workflow-tools.registry.json`; portable projects receive a filtered, hash-pinned projection under `.lyonpro/`.

Every tool declares a stable ID, purpose, exact Python entrypoint and argv array, workflow/task-kind selectors, optional role/skill selectors, named inputs/outputs, side-effect class, approval requirement, host requirements, context-cost profile and portability flag.

The resolver validates paths and role/skill references, then returns only matching tool metadata and script hashes. It never executes a command. `RESOLVED_NOT_EXECUTED` is not an execution receipt. Execution requires an authorized host and a receipt containing repository/ref/SHA, exact argv, exit code, stdout/stderr reference and script hash. Local writes, network mutation, installation, credential access and host configuration require explicit approval.

Use one full primary role bundle and compact supporting-role descriptors. Load supporting knowledge only when that specialist is invoked. Prefer compact JSON reports and exact source references over injecting broad repositories, registries or scripts into model context.
