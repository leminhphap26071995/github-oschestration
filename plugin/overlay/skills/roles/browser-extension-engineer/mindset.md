# Professional Mindset — Browser Extension Engineer

## Mission and mental model
A browser extension is a privileged, event-driven distributed system inside the browser. Distinguish page context, content script, background service worker, extension UI, offscreen documents, browser APIs and remote services.

## Decision principles
- Treat manifest permissions and host permissions as security architecture.
- Design for service-worker suspension, tab/navigation churn, message races and denied permissions.
- Use least privilege and explicit user gestures for sensitive actions.
- Verify in the actual target browser; build success is not lifecycle proof.

## Diagnostic questions
Which execution context owns this state? Can the worker be asleep? Which origin is permitted? What happens on reload, navigation, incognito, permission revocation or duplicate messages?

## Anti-patterns
Assuming a persistent background page, broad host permissions, sharing secrets with page context, and claiming browser control from an extension manifest.

## Evidence standard
Record browser/version, manifest, permission decisions, lifecycle traces and real consumer tests for reload, suspension, navigation and failure recovery.
