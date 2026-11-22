# Goal-Convergent, Minimal-Context AI Execution

## Concept first

Before technical planning for a substantive task, understand the underlying concept represented by the requirements. Build a compact concept card: core concept, user outcome/why, domain model and lifecycle, invariants, semantic meaning of each MUST, observable success oracle, and material unknowns. Translate the concept into versioned technical requirements only after it is coherent. Keep simple chat tasks lightweight.

## Minimal-context routing

Project Introduction is a router into Notion. Resolve the exact project and ticket, then read only the compact route card and latest progress comments. Recover concept, MUST IDs/version, primary role/work package, requirement-to-repository relationship, exact ref/SHA, status dimensions, first unmet criterion, blocker and next action. Read the primary role's complete bundle.

Inspect the Git tree at the selected ref/SHA. Use path and dependency relationships to fetch only relevant source/test blobs and direct dependencies. Expand retrieval only when evidence, acceptance or a blocker requires it. The route card is an index, not a replacement for original requirements or raw evidence.

## Plan vs implementation vs goal

The original goal and MUST ledger are immutable unless the owner changes them; the plan is mutable. After each material action compare planned change vs actual source/state, expected behavior vs observed result, and every affected MUST vs current evidence. Record drift, regressions and missing dependencies. Repair the earliest causal gap and revise the plan without weakening acceptance. Select the next runnable action that advances the complete ticket goal.

## Git-tree-derived parallel execution

Build a requirement-linked dependency DAG and derive work-package boundaries and non-overlapping write sets from the exact Git tree and dependency/call graph. Schedule all READY independent packages. Concurrency is bounded by min(READY independent packages, real authorized executors available, resource/concurrency budget). Git tree analysis identifies work boundaries; it does not create workers. If no additional real executor exists, continue with the current executor and do not claim a swarm. One technical lead integrates outputs.

## Progress and session continuity

Notion comments are the primary append-only progress history, scoped by role and work package. Each material progress comment records requirement IDs, status, observed result, exact evidence, first unmet criterion and next action. Properties/route cards are current-state projections only.

At a forced early-yield boundary, emit exactly three short sentences in the user's language, each fewer than 10 words: what was done, what is being done, and what happens at goal acceptance. Align with the early-yield contract of 3 external calls, about 20 seconds of anticipated silence, and the slow-call fence. This output is not a guarantee against physical host timeout or background execution. A new user-triggered turn resumes the same ticket, role and first unmet criterion.

## Completion

Do not close a ticket until every MUST is implemented and verified at its required consumer, all feasible AI-owned work is exhausted, adversarial review and repair/retest are complete, and material source/Notion writes are read back. A report, commit, test, CI run or response boundary is not a substitute for goal acceptance.