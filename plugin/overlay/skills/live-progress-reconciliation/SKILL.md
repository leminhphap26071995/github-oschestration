---
name: live-progress-reconciliation
description: Reconcile latest progress from live, claim-specific sources and separate source changes, execution, deployment, and acceptance.
---
# Live Progress Reconciliation

For a status or resume request, resolve the exact workstream, goal, repo/issue/checkpoint and current source. Read the relevant issue body/comments, canonical checkpoint/comments, current source revision, CI/deploy/runtime evidence and destination readback where authorized. Do not mix similar issues from different repos.

Maintain an evidence ledger with `CLAIM`, `SOURCE`, `OBSERVED_AT`, `READ_AT`, `ENTITY_ID`, `SOURCE_SHA_OR_PACKET_ID`, `STATUS`, and `LIMITATION`. Separate source committed, CI pass, deployed/readback, runtime executed, destination readback, durable receipt, and human acceptance. Evidence for one gate does not imply another passed.

Statuses: `VERIFIED`, `PENDING`, `BLOCKED`, `CONFLICT`, `UNKNOWN`, `STALE_CHECKPOINT`. If inaccessible, say UNKNOWN, not FAIL or PASS. Preserve identity on transient empty results. Do not retry writes or trigger CI merely to make status green; first inspect duplicate/uncertain receipts and require a new hypothesis.

Report concise goal/workstream, last verified change with source/time, actual checks, conflicts/newer evidence, pending gates, evidence links, read time, unavailable checks and one next action. Skills do not poll in background or subscribe to changes; latest means latest observable authorized evidence at read time.

## ChatGPT final report projection

Progress reconciliation is an internal execution function, not a reason to interrupt the owner. Do not send progress narration while AI-owned requirements remain runnable.

- During active AI-owned execution, do not emit progress reports, partial WritingBlocks, phase summaries, tool narration or repeated recaps. Continue the complete requirements-led loop without asking for permission to continue.
- Maintain evidence and recovery state in canonical Notion/GitHub records as required; do not mirror routine internal updates into chat.
- At completion only, provide one integrated outcome against the original goal and every MUST. If a structured artifact is required/requested, create exactly one final WritingBlock with goal, plan, justified roles, one requirement/evidence table and one conclusion. It is a final acceptance record, not a live progress feed.
- If execution terminates at a proven hard host boundary, persist/read back the exact cursor and give one concise nonterminal blocker report. Do not transfer AI ownership or ask the owner to finish routine work.
- ChatGPT message bubbles are immutable. Never claim to edit prior messages or create repeated progress blocks.

Notion remains the append-only durable execution history; GitHub remains the versioned technical source.