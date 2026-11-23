---
name: evidence-first-context-recovery
description: Preserve goal continuity, prevent context-break hallucinations and verify exact-source image/file inspection with primary evidence.
---
# Evidence-First Context Recovery
Apply when resuming a task, context is compressed, a prior answer is challenged, source identity is uncertain, an image/file must be inspected, or output risks being partial.
## 1. Immutable goal anchor
Before consequential reasoning or action, preserve:
`GOAL_ID/VERSION/DIGEST | ORIGINAL_OWNER_EXPECTATION | MUST_ACCEPTANCE | SCOPE/NON_GOALS | PROJECT/TICKET | SOURCE_LOCK | VERIFIED_EVIDENCE | OPEN_GATES | FAILED_ATTEMPTS | RECOVERY_CURSOR | NEXT_ACTION`.
- The original owner request and explicit corrections outrank assistant summaries, recent symptoms, and convenient interpretations.
- Compress repetition and narration, never requirements, negations, identifiers, source identity, evidence provenance, failed attempts, unresolved gates, or the recovery cursor.
- If the original goal or exact source cannot be recovered, stop consequential mutation and mark the missing fact `UNKNOWN`. Do not fill gaps with plausible assumptions.
## 2. Evidence provenance
Classify every material claim as `OWNER_STATED`, `SOURCE_VERIFIED`, `TOOL_OBSERVED`, `INFERRED`, `HYPOTHESIS`, or `UNKNOWN`.
Confidence, fluency, repetition, a prior assistant answer, a filename, and a URL are not evidence. Preserve exact repository, ref, path, commit/blob SHA, timestamps, tool result, errors, and source pointers. `Not observed` is not `absent`; failed retrieval is not proof that a source does not exist.
## 3. Exact-source image and file inspection
When asked to inspect an image/file stored in GitHub or another connected source:
1. Resolve the exact provider, repository, ref/commit, path, and immutable blob/object identity.
2. Fetch the actual binary from that source using the authorized connector. Do not use web image search, stock imagery, thumbnails, generated substitutes, stale cache, or a different file with a similar name.
3. Validate the returned encoding and actual bytes. For Base64, remove transport whitespace before decoding; verify Base64 structure, byte length, MIME/magic signature, and SHA-256 or provider blob SHA where available.
4. Pass the actual binary bytes to the model's vision/file input. A URL, filename, metadata record, or textual description is not a vision input.
5. Describe only what is visibly/readably present. Separate direct observations from interpretation and uncertainty.
6. Cross-check the analysis against the same source identity and preserve the source reference alongside the result.
7. If the active host cannot pass the exact binary to vision, report `VISION_INPUT_UNAVAILABLE`. Never claim to have viewed or analyzed the image.
A rendered preview is acceptable only when demonstrably derived from the same fetched binary. Never substitute a search-result image for a user-specified source image.
## 4. Context-break recovery
On a context break, contradictory answer, or suspected hallucination:
1. Stop consequential writes and unsupported claims.
2. Reload the original owner request, explicit corrections, project instructions/contracts, matching ticket/checkpoint, and live canonical source.
3. Verify project/workstream/ticket identity and exact source revision.
4. Rebuild the complete acceptance ledger and attempt history.
5. Resume at the first unmet criterion. Do not restart from the latest assistant summary or repeat a failed method without new evidence.
6. If a previous statement is unsupported, retract/correct it explicitly; do not defend it with confidence or narrative.
## 5. Bounded reasoning; prevent overthinking
Maintain one active, falsifiable hypothesis per failure branch. Record its evidence, expected signal, falsifier, and discriminating test. Every retry must add primary evidence, a discriminating test, a corrected causal explanation, or a validated requirement interpretation. After two iterations without new decision-relevant evidence, close that branch as `UNKNOWN/CLOSED_UNKNOWN` and switch to a materially different evidence route. Do not generate speculative branches to compensate for missing source context.
## 6. Complete-output contract
Before responding, reconcile the entire owner request against actual work:
- Every requested deliverable is present, or explicitly marked `BLOCKED`, `UNKNOWN`, or `PENDING` with the exact cause.
- Distinguish what was created, what was verified, what remains, and what requires owner action.
- Never present a partial result as complete; never claim a tool, workflow, release, upload, test, or consumer behavior succeeded without its observed result.
- A plan, checkpoint, ZIP, GitHub Release, green CI run, or confident explanation is not by itself goal completion.
## 7. Durable recovery capsule
When the task may span sessions, persist through an authorized durable project/ticket store where available:
`GOAL | MUSTS | SCOPE | SOURCE_LOCK | VERIFIED_EVIDENCE+PROVENANCE | FAILED_ATTEMPTS | OPEN_GATES | LAST_ACTION/RESULT | FIRST_UNMET_CRITERION | NEXT_ACTION | STORE/READBACK`.
Read back the persisted capsule. Do not store secrets, tokens, credentials, or private customer data. If no authorized durable store is available, state that persistence was not performed; do not imply chat context is durable.
## 8. Completion integrity
Close only when every MUST is verified at its required consumer boundary, source and artifact identity are preserved, failures are repaired and retested, and material writes are read back. If any gate remains open, report the exact nonterminal state and first unmet criterion.
