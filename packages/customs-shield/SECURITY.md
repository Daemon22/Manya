# @manya/customs-shield Security Policy

## Scope
`@manya/customs-shield` runs entirely locally. No shipment data, party names, or sanctions-list queries leave the host process.

## Threat model
- **Adversary:** a sanctioned entity attempting to evade screening by misspelling or alias use.
- **Asset:** the integrity of the screening decision (block vs. allow).
- **Goal:** detect sanctioned parties with high recall while minimizing false positives.

## Security guarantees
1. **No remote calls.** All screening is local.
2. **Audit trail.** Every screening produces a structured `ShieldReport`.
3. **No PII in logs.** Tax IDs, secrets, tokens are scrubbed.
4. **Configurable strictness.** `sanctionsThreshold` and `holdThreshold` are tunable.

## Known limitations
- **Built-in sanctions list is minimal.** Production deployments must load full OFAC/EU/UN/UK lists.
- **HS code catalog is chapter-level only.** For 6-digit precision, plug in a national tariff schedule.
- **Duty rates are illustrative.** Production deployments must verify against current tariff schedules.
- **Fuzzy matching may produce false positives.** Use the confidence score and `matchType` to triage.

## Reporting a vulnerability
See root [SECURITY.md](../../SECURITY.md). Do NOT open a public issue for security vulnerabilities.
