# CV Update Contract

## Claim-level review record

Every material CV claim is assessed as:

`CV Claim → Evidence → Provenance → Technical Validity → Ownership → HR Value → Risk → Recommendation`

Required fields:
- `claim_id`: stable identifier within the review.
- `claim_text`: exact current CV wording.
- `evidence_refs`: exact source file, commit/blob, project record or owner-confirmed fact.
- `provenance`: one of `WORK`, `SUPPORT`, `EXPOSURE`, `PRACTICE`, `LAB`, `KNOWLEDGE`, `UNVERIFIED`.
- `technical_validity`: `VERIFIED`, `CONFLICT`, `UNVERIFIED`, or `NOT_APPLICABLE`.
- `ownership`: designed, implemented, operated, supported, contributed, observed, or unknown.
- `hr_value`: relevance to target role, seniority signal, clarity and screening risk.
- `risk`: `LOW`, `MEDIUM`, `HIGH`, or `BLOCKER`.
- `recommendation`: keep, clarify, narrow, remove, or defer pending owner evidence.

## Provenance rules

- WORK: performed in an employment or contracted professional role; exact scope and ownership still require evidence.
- SUPPORT: supported another owner/team; do not convert into architecture or end-to-end ownership.
- EXPOSURE: observed, assisted, or used under direction; do not present as independent ownership.
- PRACTICE: deliberate hands-on practice outside employment; never present as professional production work.
- LAB: a bounded lab/course exercise; never present as production employment.
- KNOWLEDGE: study or conceptual familiarity; never present as hands-on experience.
- UNVERIFIED: source or owner confirmation is missing; keep out of published claims until resolved.

## Source authority and lock
- Owner instruction selects the intended CV variant, target branch and scope; explicit owner confirmation can resolve a factual question. A target-selection instruction alone does not confirm disputed career facts.
- Notion owns the current review decision, source lock, approval state and recovery cursor. Append corrections; preserve historical decisions.
- GitHub exact repository/ref/HEAD/blob owns technical source content, renderer, build workflow and template implementation.
- Repository instructions, recovery handoff and template lock own execution/format guardrails. A stale source pointer must not silently override a newer owner-selected target; record the conflict and respect genuine safety/permission constraints.
- PDF/build artifacts are derived outputs. Bind every accepted PDF to the exact source commit, content blob, template lock, workflow run/attempt and artifact SHA-256.
- Candidate-specific career facts remain in the selected Career/Interview project and CV source. Generic plugin contracts and role bundles must remain candidate-agnostic.

### Required source lock
- `cv_variant`, `repository`, `visibility`, `branch`, `head_sha`, `content_path`, `content_blob_sha`.
- `build_workflow_path`, `build_workflow_blob_sha`, `template_lock_path`, `template_lock_blob_sha`.
- `pdf_artifact_sha256` and `approved_page_count` only after the exact artifact is verified.

### Required source-conflict record
- `source_conflict_id`: stable conflict identifier.
- `fact`: employment date, employer, project date, project attribution, ownership, technology provenance, education or credential.
- `source_a` / `source_b`: exact authority, URI/path, commit/blob or record ID, observed value and revision.
- `state`: `CONFLICT`, `RESOLVED_WITH_EVIDENCE`, `RESOLVED_BY_OWNER`, or `UNRESOLVED`.
- `resolution_evidence`: exact evidence or explicit owner confirmation; never a model inference.
- `owner_decision_required`: true only when independent evidence cannot resolve the fact.

## Tenure and chronology record
- `tenure_assessment`: record `as_of_date`, overall IT/infrastructure tenure, Cloud Operations tenure, DevOps tenure and other target-specialty durations separately.
- `overlap_handling`: explain how overlapping roles/periods were counted once.
- `employment_periods`: employer/role start and end dates, each source-backed.
- `project_periods`: project-specific start/end dates, separate from employment periods; unknown dates remain unknown.
- `employer_attribution`: exact employer/project relationship evidence; no inference from overlapping dates.

## Technology provenance record
- `technology`, `source_refs`, `employer`, `project`, `provenance`, `ownership`, `operational_scope`, `published_context`.
- A technology in the Skills section is not evidence of use at a named employer. Map every material technology claim to the exact WORK/SUPPORT/EXPOSURE/PRACTICE/LAB/KNOWLEDGE/UNVERIFIED source.
- `PRACTICE` and `LAB` are non-employment evidence. `EXPOSURE` means observed/assisted/used under direction and does not establish independent ownership.

## Role boundaries

- Talent Acquisition Specialist is the accountable primary for the integrated CV review: recruiter screening, ATS readability, candidate positioning, employment chronology, credential presentation and screening risk. It does not certify technical architecture.
- Technical Hiring Manager is a required supporting reviewer when the target role or material claims are technical/engineering/IT. It assesses role level, engineering scope, ownership, technical depth, trade-offs and defensibility; it does not replace HR screening or become a second accountable primary.
- Business Analyst is a conditional supporting role for multi-source chronology, project/employer attribution and claim/evidence reconciliation; it structures conflicts but does not decide candidate facts.
- Interview Trainer is invoked only for candidate practice and interview-readiness deliverables. It does not impersonate an HR reviewer or independent hiring panel.
- Domain engineers validate only claims within their discipline and are invoked only when the claim/evidence map requires them.
- QA Lead owns traceability, consistency, source/claim integrity and acceptance evidence. Same-session perspectives remain SINGLE_SESSION_CROSSCHECK.

## Non-negotiable controls

1. Overall IT tenure, specialty tenure, employer tenure and project duration are separate facts. Never reuse employer dates as project dates without direct evidence.
2. Do not infer current employment from the word `Now`; verify the employer end date and any intentional publication gap.
3. No invented metrics, scale, ownership, seniority, certifications, education equivalence or production experience.
4. A claim can be technically plausible but still unverified. Preserve that distinction.
5. Same-session role perspectives are `SINGLE_SESSION_CROSSCHECK`; only distinct sessions/observers with evidence may be called independent reviews.
6. No CV content rewrite before factual reconciliation. No template, renderer, font or layout change without a separate explicit owner authorization.
7. A PDF build is not distribution approval. Publish only the exact owner-approved PDF hash.
8. Inspect the renderer and extracted PDF text; source comments do not prove that a field is omitted from the rendered document.
9. Keep generic plugin/role content candidate-agnostic; do not embed private career facts or project names.
