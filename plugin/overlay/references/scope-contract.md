# Scope Baseline — canonical contract for substantive tasks

## 1. Preserve the user outcome
Capture the original request, source message/artifact and immutable requirement version. Separate the requested outcome from proposed implementation, assumptions and non-negotiable constraints. PM/Product/BA/Technical reviewers challenge meaning from their own scope; role titles do not prove independent execution.

## 2. Versioned requirement record
For each acceptance item record:

`REQ_ID | SOURCE | USER OUTCOME | EXPECTED BEHAVIOR | ACCEPTANCE ORACLE | PRIORITY | SCOPE STATUS | PRIMARY OWNER | DEPENDENCIES | EVIDENCE SOURCE`

Priority is `MUST | SHOULD | LATER`; scope status is `IN_SCOPE | OUT_OF_SCOPE | DEFERRED | OPEN_QUESTION`. Each MUST has an observable pass condition. Keep non-goals explicit. `OPEN_QUESTION` is for consequential unresolved meaning, not an excuse to avoid source research.

## 3. Requirement challenge and validation
Before implementation:
- Check each requirement for ambiguity, contradiction, omissions, untestable wording, hidden assumptions, lifecycle/error states, dependencies and platform/security/privacy constraints.
- Challenge the interpretation with counterexamples and boundary conditions.
- Verify material facts against authoritative sources and actual product behavior.
- Distinguish facts, owner-reported observations, inferences, proposals and unknowns.
- Version owner-approved changes and invalidate dependent stale acceptance evidence.

## 4. Research and architecture
Inspect existing project components, connected tools, internal repositories, libraries, analogous products and mature implementations before creating replacements. Review source, tests, documentation, license, compatibility, maintenance and limitations as relevant. Record reuse/adaptation/rejection decisions.
Choose architecture by its fit to the complete validated requirements, including correctness, UX, lifecycle, failure modes, security, performance, operability, maintenance and rollback. Existing architecture is retained only when evidence shows it fits; otherwise redesign is in scope. Every added component must trace to a requirement or demonstrated risk.

## 5. Role and dependency routing
Assign one accountable primary role for each criterion. Add contributors/reviewers whose expertise is required by the dependency or risk. Split tasks when deliverables/interfaces are genuinely independent, not one issue per arbitrary role. Load the complete role bundle and applicable domain pack. No title-only delegation, fake cross-chat synchronization or implied independent QA.

## 6. Freeze and change control
Freeze the agreed scope version in the canonical project/task record. If acceptance changes, create a new requirement version, impact-trace dependent nodes and invalidate stale PASS decisions. Before each material implementation/review batch, compare the live request and checkpoint to the frozen acceptance; raise a `CHALLENGE` for concrete drift and correct it before dependent changes.

## 7. Requirement-derived verification and terminal gate
Use `UNDERSTAND -> RECORD -> CHALLENGE -> VALIDATE -> RESEARCH -> ARCHITECTURE DECISION -> IMPLEMENT -> VERIFY -> INTEGRATE -> ORIGINAL_GOAL_CHECK`.
Test oracles derive from requirements and authoritative external behavior. Tests validate requirements; tests, mocks and synthetic fixtures do not redefine them. Synthetic success is not browser/runtime/owner acceptance.
Complete all feasible AI-owned research, implementation, tests, integration/browser/runtime checks, artifact inspection and repairs before owner handoff. Owner real-world testing is the final gate only when it requires owner-only access or observation. Never hand over an incomplete candidate as finished.
Use `skills/workflow-contract/SKILL.md` as the single source for status labels, typed comments, handoff and dissent closure.
