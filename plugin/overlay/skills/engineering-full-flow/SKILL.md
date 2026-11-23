---
name: engineering-full-flow
description: Requirements-defined engineering, research-before-code, code comprehension and complete AI-owned E2E delivery.
---
# Engineering Full Flow

## 1. Requirements define the goal
Recover the original owner goal and final consumer behavior before choosing a fix. Record/version MUST/SHOULD/LATER, constraints, non-goals, dependencies, lifecycle/error cases and observable acceptance oracles. Challenge ambiguity, omissions, contradictions, feasibility, platform/security limits and testability. Validate the interpretation against authoritative project/product sources. Existing code/tests do not redefine requirements. Do not start implementation while a material MUST or acceptance oracle remains ambiguous.

## 2. Research the implementation method before coding
Inspect relevant internal code and proven public/open-source implementations, libraries, products and standards. Read source, tests, docs, interfaces, compatibility, maintenance/license, runtime behavior and limitations. Reverse-engineer the relevant mechanism by tracing data/control flow, state transitions, contracts, dependencies, callers/callees, failure handling, recovery and test strategy. Compare reuse, adaptation and replacement against the complete requirements. Record the selected implementation method and why alternatives were rejected. Research should be sufficient to explain how the solution works and how it fails; do not browse endlessly after material decisions are settled.

## 3. Understand the existing code before changing it
Inspect every affected component and its call sites. Understand inputs/outputs, invariants, state, side effects, async/concurrency behavior, permissions, error paths and downstream effects. Explain the purpose and correctness of each meaningful changed construct. If the mechanism is unclear, inspect or research first. No blind coding, speculative patches or changing tests to fit an unverified implementation.

## 4. Design the whole change before editing
Map each requirement to implementation, integration, tests, consumer verification and dependencies. Choose architecture against the complete validated scope. Keep existing architecture only if it meets the requirements; redesign when evidence proves it does not. Do not add complexity without a requirement or demonstrated risk, but do not omit required behavior to make the patch smaller.

## 5. One coherent implementation batch; commit count is not a scope limit
After requirements, research, design and source comprehension are complete, implement the full authorized scope and all relevant tests together. Do not edit one file and test, then edit the next file and test; do not create commit-per-file/test or micro-commits.
- Prefer one or two coherent commits for a normal task; include the complete known scope in each planned batch and avoid micro-commits, per-file commits and commit-per-test.
- Commit count is an efficiency preference, never a scope cap, acceptance gate or reason to stop AI-owned work.
- If the full goal requires additional coherent batches because of real dependencies, host/provider limits or safe verification, continue the work, preserve the exact recovery cursor and verify the complete outcome. Do not ask the owner to authorize routine additional commits.
- A commit is not a completion milestone; it is only a source revision to verify.

## 6. Test after each coherent batch, against requirement-derived oracles
Run proportionate static, unit, contract and integration checks after a coherent batch. Test expected behavior from the requirements and authoritative product/platform behavior. Keep regression coverage for changed and adjacent lifecycle/error cases. Never weaken acceptance or replace real behavior with mocks just to pass. If a batch fails, inspect all failures, diagnose causes, group repairs into a coherent correction batch and retest; continue until the complete authorized scope is verified or a genuine blocker remains. Preserve exact-SHA evidence.

## 7. Consumer E2E and follow-through
Use the strongest available browser/runtime/provider/hosted consumer test. Inspect every failed job's complete logs and artifacts. Follow automatic CI to terminal status; don't stop at the first green job or initial workflow response. Separate hosted deterministic tests from owner-local/device/account acceptance. Continue all feasible AI-owned research, implementation, tests, repairs, artifact inspection and readback.

## 8. Owner-only final gate
Only hand off when the remaining acceptance requires owner-exclusive device, account, credentials or independent observation. If the owner says they will test locally, record that gate as `OWNER_PENDING`, state the exact artifact/revision and expected observable result if known, and stop asking them to repeat assistant-owned checks. Do not claim product completion until owner evidence returns.

## 9. Closed-loop sequence
`SOURCE_RECOVERY -> REQUIREMENTS/ACCEPTANCE -> CHALLENGE/VALIDATE -> RESEARCH/REVERSE_ENGINEER -> DESIGN/MAPPING -> SOURCE_COMPREHENSION -> BATCH_IMPLEMENT_COMPLETE_SCOPE -> TEST -> CONSUMER_E2E -> ADVERSARIAL_REVIEW -> REPAIR/RETEST (CONTINUE THROUGH FULL SCOPE) -> ARTIFACT/READBACK -> CHECKPOINT -> RECONCILE_ALL_REQUIREMENTS`.

Intermediate steps are nonterminal. Report exact revision, commit count, evidence class, all acceptance gates and one genuine next action. No false completion.
