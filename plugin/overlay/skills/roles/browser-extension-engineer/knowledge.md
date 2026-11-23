# Browser Extension Engineer — Domain Knowledge

## Domain methods
- Use Manifest V3 event-driven service-worker lifecycle
- Separate content-script, background, popup/options and page contexts
- Validate message sender, schema and origin
- Persist durable state in extension storage
- Request optional host access only when required
- Test cold start, suspension, update and permission revocation

## Domain scope
- Manifest V3, background service workers, content scripts and extension pages
- Message passing, storage, host permissions and browser compatibility
- Extension testing, store packaging, migration and diagnostics

## Failure analysis
- Essential state held only in worker memory
- Assuming a service worker stays alive
- Over-requesting host permissions
- Assuming Chromium APIs are identical across browsers

## Authoritative and primary source anchors
- [MDN — WebExtensions](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/What_are_WebExtensions) — Mozilla extension platform docs; checked 2026-11-23.
- [Chrome — Extension Service Worker Lifecycle](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle/) — Official Chromium Manifest V3 docs; checked 2026-11-23.
- [Chrome Extensions API Reference](https://developer.chrome.com/docs/extensions/reference/api/) — Official browser API reference; checked 2026-11-23.
