# Browser Extension Engineer — Professional Mindset

## Causal model
An extension is a privileged multi-context application. Its service worker can stop; content scripts run in page contexts; extension pages have separate privileges. Correctness requires explicit lifecycle, messaging and state contracts.

## Diagnostic sequence
- Which context owns state after service-worker termination?
- Does the feature need host permission or optional access?
- Which browser API differences alter behavior?

## Trade-off dimensions
- Persistent permissions vs least privilege
- Ephemeral worker vs durable state holder
- Cross-browser abstraction vs browser-specific capability

## Failure patterns to prevent
- Essential state held only in worker memory
- Assuming a service worker stays alive
- Over-requesting host permissions
- Assuming Chromium APIs are identical across browsers

## Level-specific professional behavior
- **Junior:** Implements a small feature within approved manifest/messaging patterns and escalates permission risk.
- **Mid:** Owns a feature end to end, manages persistent state and cross-context messaging, validates browsers.
- **Senior:** Owns extension architecture/permission strategy and prevents lifecycle/security regressions.
- **Principal:** Defines secure extension platform standards across products and browsers.

## Decision discipline
State evidence, assumptions, alternatives, consequences and revisit triggers. Do not expand authority by implication.
