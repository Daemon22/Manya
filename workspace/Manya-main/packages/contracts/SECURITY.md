# @manya/contracts Security Policy

## Scope
`@manya/contracts` runs entirely locally. No schema, manifest, version string, API contract, schema diff, boundary policy, or validation report leaves the host process. The package has zero external runtime dependencies — only Node built-ins.

## Threat model
- **Adversary:** a developer (or downstream tool) feeding a malformed schema, manifest, or contract in an attempt to bypass validation or crash the host.
- **Asset:** the integrity of the validation decision (pass vs. fail) and the stability of the host process.
- **Goal:** always return a correct `{ valid, errors }` for bad data; never crash on bad user-supplied data; raise typed errors only for structural defects the caller can fix.

## Security guarantees
1. **No remote calls.** All validation is local.
2. **No PII in logs.** `secret`, `token`, `apiKey`, `password`, `authorization`, `privateKey`, `accessToken`, `refreshToken` are scrubbed from log metadata.
3. **Defensive validation.** `validateValue`, `validateManifest`, `validateRequest`, `validateResponse`, `detectViolations`, and `aggregateReports` never throw on a bad value; they return `{ valid, errors }`.
4. **Typed errors.** Structural problems raise subclasses of `ContractsError` with stable `code` strings, so callers can recover programmatically.
5. **Reproducibility.** Identical inputs produce identical validation results and reports — no time-based randomness, no I/O during validation.

## Known limitations
- **Path matching for API endpoints is exact.** `:id`-style path parameters are treated as literal strings unless the caller normalizes them first. Higher-level routing should map a concrete URL to a contract path before calling `validateRequest` / `validateResponse`.
- **`ref` fields resolve against a caller-provided `refs` map.** If a `ref` names a schema the caller did not provide, the field accepts any non-null value (defensive default) rather than failing.
- **`checkBackwardCompat` is structural.** It compares field types and enum value sets, not the semantics of those types. A `string` field narrowed from a free-form string to a constrained format (e.g. UUID) is not detected as a breaking change.
- **`mergeSchemas` resolves conflicts in favour of `local`.** Callers that need `remote`-wins or interactive resolution must inspect `conflicts` and re-apply.
- **`satisfies` does not support OR-ranges** (e.g. `^1.0.0 || ^2.0.0`). Compose with multiple calls if needed.

## Reporting a vulnerability
See root [SECURITY.md](../../SECURITY.md). Do NOT open a public issue for security vulnerabilities.
