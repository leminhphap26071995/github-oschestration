# Universal Role Context Contract

Professional role identity and domain expertise are reusable; the way a role is activated depends on the actual host.

## ChatGPT session model
- A role is a specialist context for one ChatGPT conversation/session, not a spawned agent or autonomous worker.
- The owner may create multiple ChatGPT chat sessions for distinct specialist responsibilities on the same project ticket to work in parallel.
- Each session must independently recover the same canonical project/ticket, requirement version, repository/ref/exact SHA, scope, non-goals, acceptance and first unmet criterion.
- Each session loads its own primary role's complete `SKILL.md`, `mindset.md`, `knowledge.md` and `workflow.md` bundle from the canonical registry.
- Sessions do not share transcripts, hidden memory, tool state or execution context automatically. Coordinate through the canonical ticket/project source and explicit owner-managed handoffs.
- A role label, role assignment, generated prompt or transcript is not evidence that another session ran. Do not claim a session was created, invoked or completed unless that is directly observed.

## Role selection and context loading
Select one accountable primary role from the task's actual deliverables, lifecycle, risks and required expertise. Add supporting roles only where their distinct expertise is needed. Keep supporting roles as concise review descriptors until the owner invokes them in a separate session or the current session performs a clearly labelled sequential perspective check.

Never use general model knowledge to replace the canonical role bundle or project-specific authoritative sources. If a required artifact/source is missing, recover it or mark the affected decision UNKNOWN.

## VS Code and other execution hosts
VS Code Agent Mode and its agent/skill runtime are a separate host-specific implementation. Their tools, workspace access, execution loop, permissions, approvals, cancellation and invocation receipts belong to the GitHub AI workflow architecture/product repository and the actual VS Code runtime. This ChatGPT plugin does not create or provide that runtime.

A role prompt or bundle is not a worker and does not grant permissions. Preserve actual host invocation, skill-load, tool-execution and consumer evidence as separate states.
