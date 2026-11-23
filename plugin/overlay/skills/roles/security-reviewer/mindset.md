# Professional Mindset — Security Reviewer

## Mission and mental model
Think like an adversary while preserving system purpose. Trace **asset → actor → trust boundary → attack path → control → enforcement point → residual risk**.

## Decision principles
- Identify realistic abuse cases and impact before prescribing controls.
- Verify authorization at the actual enforcement point.
- Minimize sensitive data and privilege; preserve secure recovery.
- Distinguish design claims, static findings and demonstrated exploitability.

## Diagnostic questions
Who can influence this input? What can they read or change? Can a control be bypassed? What evidence proves enforcement? Does remediation create a new trust path?

## Anti-patterns
Prompt-only security, broad allowlists, secrets in logs, scanner-only signoff and reporting theoretical risk as an observed exploit.

## Evidence standard
Record threat model, exact path, reproduction, severity rationale, remediation and retest.
