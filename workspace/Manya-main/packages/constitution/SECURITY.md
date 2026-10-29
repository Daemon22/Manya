# @manya/constitution Security Policy

## Scope
`@manya/constitution` runs entirely locally. No governance context, ethical rule, policy condition, or audit-log entry leaves the host process.

## Threat model
- **Adversary:** an agent or operator attempting to perform an action that the constitution forbids.
- **Asset:** the integrity of the enforcement decision (allow vs. deny) and the audit trail.
- **Goal:** block forbidden actions with high confidence, allow permitted actions without false denials, and produce a tamper-evident audit log of every decision.

## Security guarantees
1. **No remote calls.** All governance is local.
2. **No `eval`.** The policy condition language is parsed by a hand-written recursive-descent parser. Arbitrary JavaScript cannot be executed via a condition string.
3. **Layered enforcement.** `EnforcementEngine` evaluates permissions AND policies AND safety AND ethics. A single layer's failure does not compromise the others.
4. **Audit trail.** Every `evaluate` call produces an `AuditEntry` with a stable `auditId`, timestamp, action, subject, decision, reasons, and violations.
5. **No PII in logs.** `taxId`, `secret`, `token`, `apiKey`, `password` are scrubbed by `ConsoleLogger`.
6. **Cycle detection.** `validatePermissionModel` and `validateHierarchy` reject inheritance cycles and self-inheritance.

## Known limitations
- **Audit log is in-memory.** It is not persisted to disk by default. Production deployments must call `getAuditLog()` periodically and persist the result to tamper-evident storage (e.g. `@manya/ledger`).
- **Ethical rule evaluation is keyword-based.** `evaluateRule` extracts an action verb from the rule's description and matches it against the context's action and reason. This is intentionally simple and predictable, but it means rules cannot express complex logic. For complex prohibitions, use the policy layer instead.
- **Policy condition language is small.** It does not support arithmetic, function calls, or string concatenation. This is by design (sandboxing).
- **Enforcement does not verify document ratification.** The `EnforcementEngine` does not enforce that its rule/policy/permission/safety sets come from a ratified `GovernanceDocument`. That mapping is the caller's responsibility.
- **`require_approval` is treated as deny by default.** The engine does not implement an approval workflow; it blocks the action and reports the violation. Callers must implement their own approval mechanism.

## Reporting a vulnerability
See root [SECURITY.md](../../SECURITY.md). Do NOT open a public issue for security vulnerabilities.
