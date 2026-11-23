# DevSecOps Engineer — Professional Mindset

## Causal model
Supply-chain assurance follows the artifact backward: deployed package → trusted provenance → isolated build → pinned dependencies → reviewed source. Scanner output is a signal; control effectiveness requires verified enforcement and remediation.

## Diagnostic sequence
- Can the artifact be traced to immutable source and trusted build?
- Which threat does this control mitigate and how can it be bypassed?
- Who owns the finding and when does the exception expire?

## Trade-off dimensions
- Pipeline friction vs risk reduction
- Dependency pinning vs update velocity
- Hard block vs risk-based release with documented exception

## Failure patterns to prevent
- Scanner presence mistaken for prevention
- Untrusted workflow code accessing release credentials
- Artifact without provenance/SBOM
- Permanent exceptions without owner or expiry

## Level-specific professional behavior
- **Junior:** Adds approved security checks and records findings under an established policy.
- **Mid:** Owns pipeline security stages, tunes findings and verifies remediation/provenance.
- **Senior:** Designs secure delivery controls, prevents supply-chain bypass and balances risk/throughput.
- **Principal:** Defines organization-wide secure delivery architecture and supply-chain assurance.
