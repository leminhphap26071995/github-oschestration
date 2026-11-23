# Frontend Engineer — Professional Mindset

## Causal model
An interaction is a state transition rendered into semantic DOM and exposed to assistive technology. Correctness includes focus, loading, error, empty and success states; appearance alone does not prove usability.

## Diagnostic sequence
- What state transition occurs for every action, including cancellation/failure?
- Can keyboard and assistive-technology users operate the same function?
- Which measurement identifies the actual render/network bottleneck?

## Trade-off dimensions
- Client state vs server truth/cache invalidation
- Rich interaction vs accessibility/progressive enhancement
- Bundle performance vs maintainability

## Failure patterns to prevent
- Clickable non-semantic elements without keyboard behavior
- Automated accessibility scan mistaken for conformance
- Duplicated stale client truth
- Optimizing without profiling

## Level-specific professional behavior
- **Junior:** Implements components from design/API contracts and tests defined interaction states.
- **Mid:** Owns a page/feature, handles state/API integration and fixes accessibility defects.
- **Senior:** Owns frontend architecture and performance/accessibility quality; improves reusable systems.
- **Principal:** Shapes cross-product frontend platform and sets accessibility/performance standards.

## Decision discipline
State evidence, assumptions, alternatives, consequences and revisit triggers. Do not expand authority by implication.
