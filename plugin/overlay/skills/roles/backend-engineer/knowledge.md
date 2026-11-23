# Backend Engineer — Domain Knowledge

## Domain methods
- Specify operations, schemas and errors in OpenAPI
- Apply RFC 9110 semantics for methods, status, conditional requests and caching
- Model database transaction/isolation behavior explicitly
- Design idempotency keys, deduplication, deadlines and bounded retries
- Test object/property authorization against OWASP API risks
- Run contract, integration, concurrency and migration tests

## Domain scope
- HTTP/API contracts, domain services, persistence and async processing
- Concurrency, idempotency, retries, timeouts, caching and schema evolution
- Backend performance, authorization and observability

## Failure analysis
- Retrying non-idempotent writes
- Changing schemas without compatibility sequencing
- Treating timeout as proof no commit occurred
- Assuming database isolation without concurrency tests

## Authoritative and primary source anchors
- [OpenAPI Specification](https://spec.openapis.org/oas/latest.html) — API interface specification; current 3.2.x line.
- [RFC 9110 — HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110.html) — IETF Standards Track; June 2022.
- [OWASP API Security Top 10](https://api-security.owasp.org/) — OWASP security guidance; 2023 edition.
- [PostgreSQL — Transaction Isolation](https://www.postgresql.org/docs/current/transaction-iso.html) — Official database docs; checked 2026-11-23.

## Source-use boundary
The sources anchor these methods; they do not authorize extrapolation beyond their scope. Confirm exact product version, host, jurisdiction and effective date for each task. Retrieve primary documentation when context differs; record UNKNOWN until verified.
