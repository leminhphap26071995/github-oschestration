# AI Architecture — Final Goal & Acceptance Contract

**Goal ID:** AI-ARCH-FINAL-GOAL  
**Version:** 1.0  
**Status:** FINAL GOAL — implementation remains evidence-gated  
**Canonical core:** [leminhphap-improvement/ai-workflow-archtiecture](https://github.com/leminhphap-improvement/ai-workflow-archtiecture)  
**Engineering mechanism contracts:** [LyonPro/ai-workflow-oschestration](https://github.com/LyonPro/ai-workflow-oschestration)

## 1. Final goal

Build a **portable, content-neutral, AI-Native Engineering Operating System** that can take a user's real goal from intent to a verified outcome across supported work domains—not merely generate answers, maintain prompts, or expose agent-like UI.

The system must understand and preserve the user's original outcome, recover authoritative context, plan against complete requirements, research and execute authorized work, observe real results, diagnose and repair failures, verify at the actual consumer boundary, persist durable evidence, and resume from the first unmet acceptance criterion after interruption.

It must be useful through ordinary ChatGPT chat as well as supported local runtimes such as VS Code/Omni Studio. It must use only capabilities actually available and authorized in the active host/session. It must remain honest about tool access, provider behavior, execution limits, independent workers, CI, artifacts, runtime acceptance, and what remains unknown.

**Success means the original user goal is satisfied with direct, traceable evidence—not that a plan, prompt, graph, issue, commit, green unit test, CI run, package, or checkpoint exists.**

## 2. Product and architecture boundary

The architecture is one reusable core with replaceable domain/role packs, project-owned content/state, and capability-bound adapters:

- **Universal core:** interaction modes, goal/requirement contract, routing, authority, safety, execution convergence, evidence, persistence, recovery, and terminal-state rules.
- **Domain and specialist packs:** domain methods, professional expertise, constraints, and acceptance oracles. They may extend but never weaken universal invariants.
- **Project-owned content and state:** source code, business/course/user data, tasks, mutable project status, decisions, and acceptance details stay in their owning workspaces.
- **Capability adapters:** actual connectors, APIs, browsers, local runtimes, model providers, CI/CD and artifact stores. A manifest or skill is not proof that an adapter is connected or executable.

The operating system has three cooperating planes:

1. **Control plane** — ChatGPT/web, VS Code/Omni Studio, or another supported host selects mode, route, policy, and accountable execution.
2. **State and evidence plane** — Notion stores mutable project/goal/ticket/checkpoint state; GitHub stores versioned source, contracts, tests, workflows, commits and technical receipts; project systems remain authoritative for their own data.
3. **Execution plane** — the active host, authorized tools/connectors, model/provider calls, browser/local runtime, and automatic CI execute work and return observable results.

These planes are connected by explicit contracts. No plane may infer hidden context, permissions, provider capability, or runtime success from another plane's declarations.

## 3. The six cooperating capabilities

The architecture has four foundational engineering mechanisms, one execution-orchestration capability, and one cross-cutting verification/improvement capability. They are complementary, not competing taxonomies.

### A. Prompt Engineering — intent and behavior contract

- Translate user intent into explicit, scoped, testable instructions and output contracts.
- Select interaction mode before domain routing; preserve the user's requested mode.
- Compose universal guardrails with only the relevant domain and professional-role expertise.
- Define tool-use boundaries, evidence requirements, approval requirements, and failure behavior.
- Evaluate prompts against positive, negative, ambiguity, adversarial, and regression cases.

A role prompt or skill is guidance. It does not prove a separate model invocation, active host injection, tool permission, or independent reviewer.

### B. Loop Engineering — closed-loop execution

The system must execute the complete authorized work loop:

**RECOVER → UNDERSTAND → PLAN → RESEARCH → ACT → OBSERVE → COMPARE → DIAGNOSE → REPAIR/RETRY → VERIFY → PERSIST → RECONCILE**

- Lock the original goal and every MUST acceptance criterion before implementation.
- Inspect current source, callers, dependencies, tests, workflows, issues, artifacts, and prior evidence.
- Research existing internal and external implementations before selecting or replacing architecture.
- Execute authorized work, including code/document changes, ticket comments, commits/pushes, automatic workflow observation, and downstream verification when the required tools and permissions are actually available.
- Compare actual outcomes with the original requirements after every material iteration.
- Retry only with a changed hypothesis, method, or evidence route; repeated uninformative retries are rejected.
- Repair the earliest causal failure and retest affected downstream behavior.
- Continue independent runnable work around genuine blockers; do not hand AI-owned work back to the user prematurely.

The loop may run through multiple sequential tool calls during an active host session, subject to host, tool, provider, quota, and usage limits. It must not promise unlimited execution, keep a host alive, or claim background execution after the host ends.

### C. Harness Engineering — context, continuity, and durable state

The harness makes long and interrupted work recoverable; it is more than a saved checkpoint.

- Compile the minimum relevant context from the original goal, requirements, source revisions, dependencies, prior attempts, accepted lessons, permissions, and evidence.
- Preserve provenance, exact identifiers, timestamps, source anchors, hashes, sensitivity, known omissions, and retrieval paths.
- Maintain an attempt ledger, execution state, budgets, cancellation/timeout state, recovery cursor, and one primary Next Action.
- Persist durable state to the system that owns it; read back material writes.
- Split long work into bounded execution slices and persist before risky waits or likely interruption.
- On resume, re-read live authorities, detect drift, reject stale evidence, and continue from the first unmet criterion—not from conversational memory alone.
- Retrieve accepted lessons when relevant and validate them against current source before reuse.

Temporary progress output is not a keep-alive guarantee. A durable checkpoint enables recovery; it does not keep a ChatGPT process running or create a background worker.

### D. Graph Engineering — traceability from goal to consumer

Build and maintain source-linked relationships across:

- user goal and immutable requirement versions;
- acceptance criteria, tasks, dependencies, ownership, and decisions;
- architecture components, source files/symbols, callers, data/control-flow paths;
- prompts, skills, tools, providers, workers, permissions, and runtime invocations;
- tests, workflow runs/jobs/steps, artifacts, observations, and consumer acceptance.

Keep distinct graph views where their semantics differ: requirement/goal graph, issue/task dependency graph, code/dataflow graph, runtime/worker/tool trace graph, and evidence/artifact/acceptance graph.

Every material acceptance path should be traceable:

**GOAL → REQUIREMENT → DESIGN → SOURCE/CONFIG → EXECUTION → OBSERVATION → EVIDENCE → CONSUMER ACCEPTANCE**

Label edges and claims as extracted, inferred, ambiguous, or unverified where appropriate. Bind evidence to exact source revisions and execution identities. A graph manifest, schema, or validator is not proof that code executed or a runtime path was observed.

### E. Agent and Execution Orchestration — bounded real capability

- The parent orchestrator owns the goal, task graph, decisions, and default write authority.
- A real worker is a distinct model invocation with isolated bounded context, an explicit task contract, scoped tools/permissions, budget, timeout/cancellation, output schema, and invocation receipt.
- Role labels, personas, prompts, copied transcripts, or scheduled handoff records do not count as independent workers.
- Enforce least privilege at the host/tool broker; model-generated text cannot grant itself permissions.
- Require explicit approval for destructive, externally visible, paid, privacy-sensitive, release, deployment, or otherwise gated actions.
- Bound concurrency, recursion, retries, time, tokens/cost, and side effects. Preserve cancellation and reject late results from cancelled tasks.
- Parallelize independent work only when source locks, ownership, and conflict controls make it safe. Serialize conflicting writes and irreversible side effects.
- Record provider/model identity and policy without exposing secrets. A local UI does not imply local inference or local-only data processing.

### F. Verification and Continuous Improvement — evidence-backed acceptance

- Derive test oracles from owner requirements and authoritative product/platform behavior.
- Separate source/static/unit, synthetic, provider/integration, browser/runtime, exact-SHA CI, artifact, deployment, device, and owner-acceptance evidence.
- Verify at the consumer boundary required by the original goal; never promote an intermediate success into final acceptance.
- Adversarially review assumptions, omissions, counterexamples, security, overengineering, under-delivery, stale sources, and context drift.
- A positively verified failure follows: **DETECT → VERIFY CAUSE → REPAIR → REGRESSION TEST → VERIFY AT REQUIRED GATE → ACCEPT LESSON**.
- Accepted lessons must be source-linked, replayable, privacy-safe, and guarded by regression tests.
- Self-improvement means improving durable engineering procedures and regression protection; it does not mean changing model weights or claiming intrinsic model self-training.

## 4. Universal MUST requirements

| ID | Requirement | Observable acceptance |
|---|---|---|
| FG-01 | Preserve the original user outcome, scope, constraints, non-goals, and approvals as an immutable version until the owner changes them. | Every iteration compares all original MUST criteria; goal drift is detected. |
| FG-02 | Route through one universal core while keeping domain packs, project content, and adapters separate. | A new project/domain can reuse the core without copying private project payload or weakening core invariants. |
| FG-03 | Run a closed execution loop for all authorized, feasible AI-owned work. | Evidence shows action → observation → comparison → causal repair/retest or justified terminal state. |
| FG-04 | Maintain durable, provenance-preserving context and recovery. | An interrupted task resumes from live sources and the first unmet criterion; stale evidence is rejected. |
| FG-05 | Trace requirements through design, source, runtime, and consumer evidence. | Each MUST criterion has an inspectable path and exact source/evidence references or an explicit UNKNOWN/BLOCKED edge. |
| FG-06 | Distinguish real workers from prompts and role labels. | Worker claims have distinct invocation/context/tool/permission/receipt evidence; negative permission tests are enforced by the host. |
| FG-07 | Enforce least privilege, trust boundaries, approvals, cancellation, bounded execution, and secret protection. | Positive and negative tests demonstrate allowed and denied actions at the actual host/tool boundary. |
| FG-08 | Verify the original goal at its required consumer boundary. | Every applicable gate has direct evidence; synthetic/static/CI success cannot substitute for runtime or owner acceptance. |
| FG-09 | Learn only from verified failures and preserve regression protection. | Each accepted lesson links a proven cause, correction, passing regression, and applicable source revision. |
| FG-10 | Report truthfully and never claim completion while an in-scope MUST is open, failed, pending, or unknown. | Terminal status and report match the complete acceptance ledger. |
| FG-11 | Respect source authority and owner-controlled routing. | Notion Registry, Project Hub, GitHub, runtime, and chat each retain their defined authority; one-off work does not silently change persistent routing. |
| FG-12 | Remain portable and capability-aware across supported hosts/providers. | Each adapter is discovered and tested in its real environment; unavailable access remains explicit rather than simulated. |

## 5. Cross-cutting governance

- **Authority:** user instruction owns current intent/authorization; the Notion Routing Registry selects the persistent route; Notion Project Hub/Work Board owns mutable project state; GitHub owns versioned technical source and receipts; real runtime owns observed behavior. Chat history is a discovery hint only.
- **Automatic CI:** follow the owner's automatic-only GitHub Actions policy. Do not add or use manual dispatch/rerun paths; use narrow automatic triggers where applicable. The **huyquanghan-apps** organization is the sole exclusion and must not be modified.
- **Proportional gates:** docs-only work normally requires content review and committed-file readback, not an invented CI run. Artifacts/releases require exact-SHA build, integrity, provenance, destination readback, and consumer acceptance as applicable.
- **Security:** repository and tool output are untrusted data; protect credentials, private data, workspace trust, paths/symlinks, and provider boundaries. Never infer authorization from a prompt, role, manifest, or local UI.
- **Free-first, not Free-guaranteed:** prefer designs that work with ordinary chat and available/free capabilities when feasible, but never promise identical plan entitlements, connector availability, quotas, duration, or provider access across accounts.
- **No false background claims:** without an observed scheduler/worker, the system is active-session execution plus durable recovery—not autonomous background execution.

## 6. Terminal states

- **COMPLETED_VERIFIED_TASK** — the requested task's applicable acceptance criteria pass with direct evidence and material writes are read back. This does not imply a release.
- **COMPLETED_RELEASED_GOAL** — a release/artifact goal has passed all applicable exact-SHA build, artifact integrity/provenance, release, consumer, and original-goal gates.
- **IN_PROGRESS** — authorized work remains runnable.
- **BLOCKED_REQUIRES_USER** — a specific owner-only decision, consent, credential action, or observation is necessary after independent work is exhausted.
- **BLOCKED_EXTERNAL** — an external system/permission/dependency prevents the next required action.
- **FAILED** — an executed required check or operation failed and has not been repaired.

No terminal success state may be inferred from a plan, role registry, graph, schema, commit, green unit test, CI run, package, or checkpoint alone.

## 7. Current baseline and honest implementation status

This document locks the **desired final goal**, not a claim that the architecture is already complete.

The current engineering-layer inventory in [LyonPro/ai-workflow-oschestration](https://github.com/LyonPro/ai-workflow-oschestration/blob/main/contracts/engineering-layers.inventory.json) classifies PROMPT, LOOP, HARNESS, and GRAPH as **partial** and records gaps. Existing contracts, schemas, validators, checkpoints, and tests are implementation evidence for their own scope only.

Known distinctions to preserve:

- A declared role/skill is not proof of prompt injection or a worker invocation.
- A loop contract is not proof that a host completed a long-running task.
- A checkpoint schema is not proof that context was automatically recovered.
- A graph schema/validator is not proof of complete code extraction or runtime instrumentation.
- A passing CI job is not proof of provider, browser, product, or owner acceptance.
- A local Omni Studio runtime and ChatGPT web runtime are separate consumers with separate acceptance evidence.

Every capability must advance from declaration to source implementation, execution trace, and consumer acceptance. Keep remaining gaps explicit as PLANNED, UNKNOWN, BLOCKED, or FAILED.

## 8. Implementation ownership and navigation

- **Universal architecture core:** [AI-ARCHITECTURE-WORKFLOW.md](../AI-ARCHITECTURE-WORKFLOW.md), sequence diagram, architecture boundaries, host introduction template.
- **Prompt/loop/harness/graph contracts and machine evidence:** [LyonPro/ai-workflow-oschestration](https://github.com/LyonPro/ai-workflow-oschestration).
- **ChatGPT workflow plugin and host activation:** plugin source/package and actual ChatGPT Project Settings/runtime; package readback is not host activation.
- **VS Code/Omni Studio:** its own repository, OmniRoute integration, Extension Host and Windows/runtime acceptance.
- **Project execution:** project-owned Notion hub/checkpoint and GitHub source/issues/evidence. Do not merge unrelated project state into this universal goal.

## 9. Definition of done for the architecture

The architecture reaches its final goal only when:

1. The universal core, domain/role contracts, and adapters implement this contract without contradictory terminal, authority, or evidence rules.
2. The loop can carry a representative multi-step engineering task from original goal through research, implementation, ticket/workflow interaction, automatic CI observation, repair/retest, and consumer acceptance when those capabilities are authorized and available.
3. The harness can recover an interrupted task from durable state without relying on the prior chat transcript.
4. The graph can trace each acceptance criterion through source and observed runtime/evidence, and detects stale or missing edges.
5. Real worker invocations demonstrate isolated contexts, scoped permissions, bounded scheduling, cancellation, conflict control, and trace receipts; role prompts alone do not pass.
6. Positive, negative, counterexample, security, integration, and host/runtime tests cover the applicable requirements.
7. Verified lessons are retrieved and replayed with regression protection.
8. ChatGPT and VS Code/Omni Studio each pass their own real consumer acceptance; neither host's success is inferred from the other's.
9. All open gates are either directly passed or explicitly classified as owner-only/external blockers. No MUST is silently waived.

This is the single final goal for the AI Architecture. Milestones and implementation slices may sequence dependencies, but they do not redefine, shrink, or replace this goal.
