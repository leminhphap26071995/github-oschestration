# DevSecOps Engineer — Domain Knowledge

## Domain methods
- Apply NIST SSDF Prepare/Protect/Produce/Respond practices
- Use SLSA build provenance/controls suited to threat model
- Map application controls to OWASP ASVS
- Separate build/test/release credentials and restrict workflow tokens
- Generate SBOM, pin dependencies and verify signatures
- Triage by reachability, exploitability, exposure and remediation evidence

## Domain scope
- Secure SDLC, pipeline security, dependencies, secrets, SBOM and provenance
- Security test integration, policy enforcement, vulnerability triage and release gates
- Trust from source revision through build environment to deployed artifact

## Failure analysis
- Scanner presence mistaken for prevention
- Untrusted workflow code accessing release credentials
- Artifact without provenance/SBOM
- Permanent exceptions without owner or expiry

## Authoritative and primary source anchors
- [NIST SP 800-218 — SSDF](https://csrc.nist.gov/pubs/sp/800/218/final) — NIST SSDF 1.1; Feb 2022.
- [SLSA — Build Track Basics](https://slsa.dev/spec/build-track-basics) — Open supply-chain security specification; checked 2026-11-23.
- [OWASP ASVS](https://asvs.owasp.org/) — Application security verification standard; ASVS 5.0.0.

## Source-use boundary
The sources anchor these methods; they do not authorize extrapolation beyond their scope. Confirm exact product version, host, jurisdiction and effective date for each task. Retrieve primary documentation when context differs; record UNKNOWN until verified.
