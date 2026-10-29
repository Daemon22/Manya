# Contributing to @manya-os/attest

First: thank you. `@manya-os/attest` is the trust layer of the MANYA Intelligence OS, stewarded by the **Manya Hael Foundation** under the direction of **Uviwe Menyiwe (Azura Daemon)**. Contributions are welcome, but they must respect the project's architectural principles, governance model, and — above all — its security requirements.

For the general contribution workflow (code of conduct, branching, commit conventions, release model, governance), see the root [CONTRIBUTING.md](../../CONTRIBUTING.md). This file lists **package-specific** rules that apply on top of those.

## Package-specific notes

### Cryptographic changes require maintainer sign-off

Any change that touches one of the following files MUST be reviewed and explicitly signed off by a maintainer designated by the Foundation. Open an issue describing the change **before** opening a PR.

- `src/crypto/hashing.ts`
- `src/crypto/keys.ts`
- `src/crypto/signatures.ts`
- `src/hardware/provider.ts` (signing paths: `attest`, `verifyQuote`)
- `src/remote/attestation.ts` (signature production / verification paths)
- `src/challenge/challenge.ts` (`signChallenge`, `verifyResponse`)
- `src/challenge/nonce.ts` (single-use / replay protection logic)
- `src/fingerprint/fingerprint.ts` (`compare` constant-time path)

Why: a one-character typo in a constant-time comparison, a missing nonce check, or a stable-JSON regression can silently break the security guarantees of every attestation built on this package. We err on the side of caution.

### Fingerprint privacy

`collectDeviceSignals` MUST NOT collect personally-identifying information (PII). The allowed fields are: `cpus`, `arch`, `platform`, `hostname`, `macs`, `totalmem`, `nodeVersion`, `release`, `machineId` (optional). The following are **forbidden**:

- OS username (`os.userInfo().username`)
- Home directory (`os.homedir()`)
- Environment variables (`process.env.*`)
- Process arguments (`process.argv`)
- Filesystem paths under the user's home
- Any field derived from the above

If you add a new signal, document it in `redactSignals` if it could be sensitive, and add a test asserting that `JSON.stringify(signals)` does NOT contain the forbidden fields. See `tests/fingerprint.spec.ts` for the existing assertion.

### No external dependencies

The package uses Node `crypto` (OpenSSL-backed), `os`, `fs`, `path`, and `child_process` only. Do not add a runtime dependency. The package MUST remain self-contained — in particular, it MUST NOT import from `@manya-os/keyring` (a sibling workspace). All crypto primitives are implemented locally in `src/crypto/`.

### Strict TypeScript

- `strict: true`. No `any` in public APIs. Use `unknown` + narrowing if needed.
- No default exports. Named exports only.
- Every public function / class / interface MUST have TSDoc.
- Throw typed `AttestError` subclasses, never strings.

### Tests

- Every public function has unit tests (happy path + at least one error case).
- Cryptographic operations must have round-trip tests (sign → verify, produce → verify, serialize → deserialize).
- Tampering tests are required for every verification path (modified quote, expired nonce, wrong signature, drifted fingerprint).
- Integration tests in `tests/integration.spec.ts` must continue to pass.
- Run: `npm test` from the package, or `npm test` from the monorepo root.

### Nonce single-use / replay protection

The `NonceStore` enforces single-use semantics. When modifying it:

- A nonce consumed by a successful verification MUST NEVER be reusable.
- A nonce consumed by a failed verification MUST NEVER be reusable (otherwise an attacker can race the verifier).
- TTL expiry MUST cause `consume` to return `false` (not throw).
- `cleanup()` MUST remove both expired AND consumed records.

### Attestation freshness

`verifyAttestation` enforces a freshness window. The default is 5 minutes; the strict policy uses 1 minute. When modifying:

- The freshness check MUST compare `Math.abs(now - quote.timestamp)` against `freshnessMs` (not just `now - quote.timestamp`) to allow for clock skew, but the absolute value prevents stale quotes from being accepted due to clock drift in either direction.
- The freshness window is configurable via `AuthPolicy.attestationFreshnessMs` and via `verifyAttestation`'s `freshnessMs` option.

### Hardware probes never throw

`HardwareValidator.probe()` is wrapped in a top-level try/catch. If you add a new probe:

- Wrap it in try/catch individually.
- If it throws, return a probe with everything `false` and `details` describing the error.
- Never throw from `probe()` — callers depend on the no-throw contract.

### Backward compatibility

- Public API exports are semver-bound.
- Deprecate before removing. Use a `@deprecated` TSDoc tag and update `CHANGELOG.md` under `## [Unreleased]`.
- Breaking changes require a major version bump and a migration guide.

### Reviewer checklist

Before approving a PR, reviewers MUST verify:

- [ ] No new external runtime dependencies.
- [ ] No `any` in public APIs.
- [ ] No secrets in log messages.
- [ ] All new public functions have TSDoc.
- [ ] All new public functions have tests (happy + error path).
- [ ] No raw private key is serialized in any new persistence path.
- [ ] Constant-time comparison is preserved for any new verification path.
- [ ] Nonce single-use semantics preserved in any new challenge path.
- [ ] Fingerprint collection remains PII-free.
- [ ] Hardware probes remain non-throwing.
- [ ] `CHANGELOG.md` updated under `## [Unreleased]`.
- [ ] `docs/API.md` updated for any new public export.

## Contact

- Maintainer escalations: **foundation@manyahael.org**
- Security reports: see [SECURITY.md](./SECURITY.md). **Do not file security issues as public GitHub issues.**

## License

By contributing, you agree your contributions are licensed under the Apache-2.0 license and assigned to the Manya Hael Foundation for inclusion in the project.
