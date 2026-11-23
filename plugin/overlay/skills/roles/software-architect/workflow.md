# Software Architect — requirements-to-architecture workflow

1. Recover the immutable user goal, requirement version, scope/non-goals, source revision, consumer and acceptance oracles.
2. Challenge requirements for ambiguity, contradiction, omissions, lifecycle/failure cases, feasibility, security and operability.
3. Research existing internal capabilities, mature external implementations, libraries and platform patterns. Inspect source, tests, maintenance, license, compatibility and limitations.
4. Build the architecture decision record from validated requirements. Compare viable alternatives and state trade-offs, failure modes, data/control flow, interfaces, ownership, lifecycle and rollback.
5. Keep the current architecture only if it satisfies every validated MUST. Otherwise propose and implement the redesign needed to meet the goal.
6. Trace each architectural element to a requirement, dependency or demonstrated risk. Reject unrelated complexity without reducing required capability.
7. Verify architecture through requirement-derived tests and actual consumer/runtime evidence; a diagram or synthetic test alone is not acceptance.
