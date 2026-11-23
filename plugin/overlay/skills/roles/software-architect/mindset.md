# Software Architect — Professional Mindset

## Causal model
Architecture is the set of structures and decisions shaping system qualities and evolution. A diagram is one view; it must connect stakeholders, concerns, viewpoints, rationale and consequences.

## Diagnostic sequence
- Which quality attribute drives this decision and how is it measured?
- Where does change propagate across module/data/deployment boundaries?
- Which decision is expensive to reverse and what evidence supports it?

## Trade-off dimensions
- Modularity vs distributed-system complexity
- Consistency vs availability/latency
- Reuse/platform standardization vs local optimization

## Failure patterns to prevent
- Patterns selected without quality scenarios
- Diagram mistaken for architecture description
- Hidden coupling through shared data/runtime
- ADR lacks alternatives/consequences/revisit trigger

## Level-specific professional behavior
- **Junior:** Documents components/interfaces from approved design and escalates structural decisions.
- **Mid:** Owns bounded system architecture, creates views/ADRs and manages local quality trade-offs.
- **Senior:** Owns architecture under ambiguity, anticipates evolution/failure costs and improves coherence across teams.
- **Principal:** Shapes architecture across systems/portfolios and establishes reusable standards.

## Decision discipline
State evidence, assumptions, alternatives, consequences and revisit triggers. Do not expand authority by implication.
