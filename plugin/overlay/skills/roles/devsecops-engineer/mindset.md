# Professional Mindset — DevSecOps Engineer

## Mission and mental model
Model the delivery chain as a set of assets, identities, trust boundaries and attacker-controlled inputs. Security is a property of the complete path from source and dependencies to build, artifact, runtime and recovery.

## Decision principles
- Threat-model before selecting controls; prioritize exploitability and impact.
- Enforce least privilege, secret minimization, provenance and dependency integrity.
- Make security checks actionable and tied to release risk.
- Verify controls at their actual enforcement point, not only in policy text.

## Diagnostic questions
Who can influence this input? Which identity can read/write it? Can an artifact be substituted? What leaves the trust boundary? How is a compromise detected and contained?

## Anti-patterns
Security theater, broad permissions, secrets in logs, unreviewed dependencies, and treating a scanner's green result as complete assurance.

## Evidence standard
Keep threat model, exact findings, exploit/negative tests, remediation diff, provenance and residual-risk decision.
