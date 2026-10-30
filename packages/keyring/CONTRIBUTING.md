# Contributing to @manya-os/keyring

First: thank you. `@manya-os/keyring` is the cryptographic substrate of the MANYA Intelligence OS, stewarded by the **Manya Hael Foundation** under the direction of **Uviwe Menyiwe (Azura Daemon)**. Contributions are welcome, but they must respect the project's architectural principles, governance model, and — above all — its security requirements.

For the general contribution workflow (code of conduct, branching, commit conventions, release model, governance), see the root [CONTRIBUTING.md](../../CONTRIBUTING.md). This file lists **package-specific** rules that apply on top of those.

## Package-specific notes

### Cryptographic changes require maintainer sign-off

Any change that touches one of the following files MUST be reviewed and explicitly signed off by a maintainer designated by the Foundation. Open an issue describing the change **before** opening a PR.

- `src/crypto/keys.ts`
- `src/crypto/signatures.ts`
- `src/crypto/symmetric.ts`
- `src/crypto/hashing.ts`
- `src/recovery/recovery.ts` (Shamir Secret Sharing)
- `src/wallet/wallet.ts` (key-handling paths: `createIdentity`, `importIdentity`, `exportEncrypted`, `importEncrypted`)
- `src/hardware/software-fallback.ts` (private-key storage)

Why: a one-character typo in a field-arithmetic routine or a misplaced `||` in a constant-time comparison can silently break the security guarantees of every wallet built on this package. We err on the side of caution.

### No external dependencies

The package uses Node `crypto` (OpenSSL-backed) only. Do not add a runtime dependency. Dev-only dependencies (e.g. for benchmarks) may be considered, but require maintainer sign-off.

### Strict TypeScript

- `strict: true`. No `any` in public APIs. Use `unknown` + narrowing if needed.
- No default exports. Named exports only.
- Every public function / class / interface MUST have TSDoc.
- Throw typed `KeyringError` subclasses, never strings.

### Tests

- Every public function has unit tests (happy path + at least one error case).
- Cryptographic operations must have round-trip tests (sign → verify, encrypt → decrypt, split → combine).
- Integration tests in `tests/integration.spec.ts` must continue to pass.
- Run: `npm test` from the package, or `npm test` from the monorepo root.

### Cryptographic test vectors

If you add or change a cryptographic primitive, prefer tests that use **published test vectors** (NIST CAVP, RFC test vectors, etc.) over self-derived expected values. For Shamir Secret Sharing, the randomized k-of-n round-trip property test is required.

### Auditable operations

Destructive or sensitive operations (`exportEncrypted`, `importEncrypted`, `createBackup`, `restoreBackup`, `shamirSplit`, `applySyncBundle`) should emit a `logger.info` audit event. Do not log secrets — the `ConsoleLogger` already scrubs them, but contributors adding new code must ensure sensitive values flow through the metadata object rather than the message string.

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
- [ ] `CHANGELOG.md` updated under `## [Unreleased]`.
- [ ] `docs/API.md` updated for any new public export.

## Contact

- Maintainer escalations: **foundation@manyahael.org**
- Security reports: see [SECURITY.md](./SECURITY.md). **Do not file security issues as public GitHub issues.**

## License

By contributing, you agree your contributions are licensed under the Apache-2.0 license and assigned to the Manya Hael Foundation for inclusion in the project.
