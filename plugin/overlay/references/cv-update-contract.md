# CV Update Contract

## Claim-level review record

Every material CV claim is assessed as:

`CV Claim → Evidence → Provenance → Technical Validity → Ownership → HR Value → Risk → Recommendation`

Required fields:
- `claim_id`: stable identifier within the review.
- `claim_text`: exact current CV wording.
- `evidence_refs`: exact source file, commit/blob, project record or owner-confirmed fact.
- `provenance`: one of `WORK`, `SUPPORT`, `EXPOSURE`, `LAB`, `KNOWLEDGE`, `UNVERIFIED`.
- `technical_validity`: `VERIFIED`, `CONFLICT`, `UNVERIFIED`, or `NOT_APPLICABLE`.
- `ownership`: designed, implemented, operated, supported, contributed, observed, or unknown.
- `hr_value`: relevance to target role, seniority signal, clarity and screening risk.
- `risk`: `LOW`, `MEDIUM`, `HIGH`, or `BLOCKER`.
- `recommendation`: keep, clarify, narrow, remove, or defer pending owner evidence.

## Provenance rules

- WORK: performed in an employment or contracted professional role; exact scope and ownership still require evidence.
- SUPPORT: supported another owner/team; do not convert into architecture or end-to-end ownership.
- EXPOSURE: observed, assisted, or used under direction; do not present as independent ownership.
- LAB: practical lab or personal exercise; never present as production employment.
- KNOWLEDGE: study or conceptual familiarity; never present as hands-on experience.
- UNVERIFIED: source or owner confirmation is missing; keep out of published claims until resolved.

## Role boundaries

- Talent Acquisition Specialist is the accountable primary for the integrated CV review: recruiter screening, ATS readability, candidate positioning, employment chronology, credential presentation and screening risk. It does not certify technical architecture.
- Technical Hiring Manager is a required supporting reviewer when the target role or material claims are technical/engineering/IT. It assesses role level, engineering scope, ownership, technical depth, trade-offs and defensibility; it does not replace HR screening or become a second accountable primary.
- Interview Trainer is invoked only for candidate practice and interview-readiness deliverables. It does not impersonate an HR reviewer or independent hiring panel.
- Domain engineers validate only claims within their discipline and are invoked only when the claim/evidence map requires them.
- QA Lead owns traceability, consistency, source/claim integrity and acceptance evidence. Same-session perspectives remain SINGLE_SESSION_CROSSCHECK.
