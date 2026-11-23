---
name: cv-update-lifecycle
description: Run an evidence-first professional CV review and controlled update without inventing claims or changing an approved template.
---
# CV Update Lifecycle

## Goal
Produce a truthful, role-aligned CV and a verifiable PDF from the owner's canonical source. A polished sentence is not acceptable if its evidence, ownership or chronology cannot be defended.

## 1. Recover and lock the source
- Resolve the CV project and ticket in Notion; do not change the persistent project route for a one-off CV branch.
- Verify repository owner, visibility, permissions, exact branch, HEAD, CV content blob and actual build input.
- Read repository instructions, recovery handoff, CV-specific instructions, template lock, build workflow and the latest review checkpoint.
- Keep General CV, JD-tailored CV and historical interview snapshots distinct. Never substitute a nearby branch or stale PDF.

## 1.1 Source authority and conflict resolution
- The latest explicit owner instruction controls the intended CV variant, target branch and scope. An explicitly owner-confirmed fact may resolve a factual conflict; selecting a branch or variant does not by itself confirm employment or project facts.
- Notion's current CV review/campaign page owns mutable decisions, the selected source lock, review status, approved facts and the first unmet criterion. Append corrections and preserve prior decisions as history.
- GitHub at the locked repository/ref/HEAD/blob is technical truth for the actual CV content, renderer, build input, build workflow, template files and tests. Read these exact files at the locked SHA.
- Repository `AGENTS.md`, CV instructions, recovery handoff and template lock define execution and format guardrails. A stale branch pointer or older handoff must not silently redirect a newer owner-selected baseline. Record the conflict; if a genuine safety or permission guardrail blocks the selected target, stop that change and request only the owner-exclusive decision.
- Generated PDFs, release assets and old interview snapshots are derived evidence, not canonical source.
- If sources disagree about employment dates, employer, project dates, project attribution, ownership, technology provenance, education or credentials, create a `CONFLICT` record with both exact source refs and values. Do not choose the newest file, infer a value or silently reconcile it. Resolve only with direct evidence or explicit owner confirmation; otherwise keep the claim out of the published CV.
- TOML/Markdown comments do not prove what the PDF displays. Inspect the actual renderer/template field mapping and compare extracted PDF text with the approved claim ledger.
- Keep candidate-specific names, employers, dates, projects, metrics and private evidence in the Career/Interview Notion project and canonical CV repository. Never copy candidate-specific facts into generic UPW plugin skills, role bundles or public package fixtures.
- Record a source lock containing CV variant, repository owner/name/visibility, branch, HEAD SHA, content path/blob SHA, build-workflow path/blob SHA and template-lock path/blob SHA. Add exact PDF SHA-256 and approved page count only after a verified artifact exists.

## 2. Normalize the target
Record the intended audience, role/seniority, market/jurisdiction, CV variant, target deliverable, template constraints and non-goals. Ask only for a decision that cannot be established from authoritative sources.

## 3. Build the claim ledger before editing
For every material claim record:
`CV Claim → Evidence → Provenance → Technical Validity → Ownership → HR Value → Risk → Recommendation`.
Use only `WORK`, `SUPPORT`, `EXPOSURE`, `PRACTICE`, `LAB`, `KNOWLEDGE`, `UNVERIFIED`. Do not blend these categories. `PRACTICE` is hands-on practice outside employment; `LAB` is a bounded lab/course exercise. Neither proves production employment.

Check employment chronology separately from project dates. Reconcile employer start/end dates, gaps, overlapping roles, project-specific dates, employer attribution, education, certifications and current-employment wording. Never copy employment dates into project dates or infer that `Now` is correct.

## 3.1 Tenure, project chronology and technology provenance
- Calculate overall IT/infrastructure tenure and each specialty separately (for example, Cloud Operations and DevOps) against an explicit `as_of_date`. Count overlapping periods once. Never let total IT tenure imply the same number of years in a target specialty.
- Keep employer tenure, role tenure and project duration as separate facts. Project dates require project-specific evidence; never copy an employer's start/end dates into a project `time` field.
- Record employer attribution for each project only when supported by an exact source or owner confirmation. A missing employer field is a gap to resolve, not permission to infer.
- Map each technology to its exact employer/project/source and one provenance value: `WORK`, `SUPPORT`, `EXPOSURE`, `PRACTICE`, `LAB`, `KNOWLEDGE` or `UNVERIFIED`. A Skills-list entry alone does not prove employment use.
- Inspect every source field consumed by the renderer. If a TOML `time` field is rendered, it is part of the published CV even when a nearby comment says no timeline is displayed. Verify the actual PDF text rather than trusting comments or field names.

## 4. Assign accountable and supporting professional perspectives
- **Talent Acquisition Specialist — accountable primary:** recruiter screening, ATS readability, candidate positioning, chronology, credential presentation and HR risk. Owns the integrated CV review and does not certify technical architecture.
- **Technical Hiring Manager — required supporting reviewer for technical CVs:** role fit, seniority, engineering scope, decision rights, architecture/operations ownership, technical depth and interview defensibility. Invoke when the target role or material claims are technical, engineering, cloud, DevOps, security, SRE or IT; this role is not a second accountable primary.
- **Business Analyst — conditional supporting role:** structure source-to-claim mapping, chronology, project/employer attribution and conflict registers when evidence spans multiple records; never decide candidate facts or override owner confirmation.
- **Interview Trainer — conditional supporting role:** candidate readiness, interview narratives and likely follow-up questions; invoke only when interview preparation or practice is requested. It does not substitute for HR/Talent Acquisition review.
- **Tech Lead:** engineering ownership, delivery boundaries and technical quality; invoke when target claims require this assessment.
- **DevOps / Cloud / DevSecOps / SRE specialists:** validate only claims in their respective disciplines when evidence or risk requires them.
- **QA Lead / QA Engineer:** claim-source traceability, consistency, build tests and PDF acceptance.

Load the complete four-artifact bundle for every role actually invoked. A role label is not an independent worker. If all perspectives occur in one ChatGPT session, record `SINGLE_SESSION_CROSSCHECK`; never call it an independent HR or hiring-panel sign-off.
## 5. Review before rewrite
- Separate factual conflicts, evidence gaps, wording risks and presentation issues.
- Do not silently correct dates, project ownership, credentials or metrics.
- Do not add a technology to professional experience because it appears in a practice/lab source.
- Do not claim cluster/platform/architecture ownership from workload operation or troubleshooting.
- Record each unresolved question with the exact evidence needed and the owner-only decision, if any.
- Only revise claims after evidence reconciliation and owner authorization.

## 6. Controlled content update
- Edit only the canonical CV content input unless the owner authorizes a separate engineering change.
- Preserve the approved template, renderer, fonts, page policy and branch-specific variant.
- Never modify layout or template to hide content density without explicit owner approval.
- Keep changes small and traceable to accepted claim-ledger rows.
- Verify the rendered PDF uses the exact intended source commit and content blob.
- Inspect the renderer's field mapping and compare extracted PDF text against the approved claim ledger; detect stale or unintended dates and project fields even when source comments say they should not render.
- Compare page count, geometry and layout with the exact owner-approved template reference and `TEMPLATE-LOCK`; do not assume a generic two- or three-page standard.

## 7. Build and verify
- Use the repository's approved GitHub Actions workflow; do not perform an unapproved local build.
- Verify the exact run, attempt, head SHA, job result, artifact name, PDF page count, text extraction, page geometry, overflow and visual preview.
- Record the PDF SHA-256 and source/content/template hashes together.
- A green build is not proof that the PDF is visually correct. Inspect the exact generated PDF/preview at the artifact boundary.
- If the artifact is missing, stale, inaccessible or built from another SHA, mark PDF verification `UNKNOWN`.

## 8. Release and distribution
- Do not publish or send a CV merely because CI passed.
- Require explicit owner approval for the exact PDF hash, page count and source content blob.
- Verify the release asset and digest by reading it back.
- Keep `PDF built`, `PDF approved`, and `PDF sent to HR` as separate states.

## 9. Reconcile state
- Append progress to the correct Notion CV review/checkpoint page; preserve history.
- GitHub remains the technical source; Plugin Creator is not the CV source.
- Keep role review evidence, source SHA, content blob SHA, build run, artifact/PDF hash and first unmet criterion linked.
- Do not mark the CV task Done while any MUST claim, chronology, owner approval or exact-PDF acceptance remains open.
