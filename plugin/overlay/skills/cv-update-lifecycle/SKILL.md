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

## 2. Normalize the target
Record the intended audience, role/seniority, market/jurisdiction, CV variant, target deliverable, template constraints and non-goals. Ask only for a decision that cannot be established from authoritative sources.

## 3. Build the claim ledger before editing
For every material claim record:
`CV Claim → Evidence → Provenance → Technical Validity → Ownership → HR Value → Risk → Recommendation`.
Use only `WORK`, `SUPPORT`, `EXPOSURE`, `LAB`, `KNOWLEDGE`, `UNVERIFIED`. Do not blend these categories.

Check employment chronology separately from project dates. Reconcile employer start/end dates, gaps, overlapping roles, project-specific dates, employer attribution, education, certifications and current-employment wording. Never copy employment dates into project dates or infer that `Now` is correct.

## 4. Assign accountable and supporting professional perspectives
- **Talent Acquisition Specialist — accountable primary:** recruiter screening, ATS readability, candidate positioning, chronology, credential presentation and HR risk. Owns the integrated CV review and does not certify technical architecture.
- **Technical Hiring Manager — required supporting reviewer for technical CVs:** role fit, seniority, engineering scope, decision rights, architecture/operations ownership, technical depth and interview defensibility. Invoke when the target role or material claims are technical, engineering, cloud, DevOps, security, SRE or IT; this role is not a second accountable primary.
- **Interview Trainer:** candidate readiness, interview narratives and likely follow-up questions; invoke only when interview preparation is requested.
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
