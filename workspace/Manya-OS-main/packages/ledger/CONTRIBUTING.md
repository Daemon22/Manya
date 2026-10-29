# Contributing to @manya-os/ledger

This document provides package-specific guidance for contributing to `@manya-os/ledger`. For general contribution guidelines, see the root [CONTRIBUTING.md](../../CONTRIBUTING.md).

## Package-specific notes

### Testing

- **Test organization:** Tests are organized by subsystem: `chain.spec.ts`, `event.spec.ts`, `merkle.spec.ts`, `timestamp.spec.ts`, `replay.spec.ts`, `store.spec.ts`, `export.spec.ts`, `crypto.spec.ts`.
- **Test coverage:** Aim for ≥80% coverage on touched files. The current suite is comprehensive, covering happy paths, error paths, and edge cases.
- **Cryptographic tests:** Always test both success and failure paths for signature verification, hash verification, and Merkle proof validation.
- **Persistence tests:** When adding store implementations, test atomic writes, corruption recovery, and concurrent-safe behavior where applicable.

### Cryptographic conventions

- **No custom crypto.** All cryptographic operations must use Node.js `crypto` (OpenSSL-backed) primitives. Never roll your own crypto.
- **Constant-time comparisons.** Use `constantTimeEqual` for all signature verifications and token comparisons.
- **Deterministic serialization.** Use `canonicalSerialize` and `canonicalSerializeToString` for all event hashing. This ensures the same event always produces the same hash.
- **Randomness.** Use `secureRandom` for all cryptographically secure random bytes. Use `crypto.randomBytes` directly only when you need to control byte count precisely.

### Error handling

- **Typed errors.** Throw specific `LedgerError` subclasses (e.g., `ChainError`, `ValidationError`, `MerkleError`) with stable `code` fields.
- **Error causes.** Wrap lower-level errors in `cause` when appropriate.
- **Validation first.** Validate all inputs before cryptographic operations. Throw `ValidationError` for malformed input.

### Documentation

- **TSDoc.** Every public export must have TSDoc comments describing purpose, parameters, and return values.
- **Examples.** Add usage examples to `README.md` for new features.
- **API reference.** Update `docs/API.md` when the public API changes.

### Code style

- **No `any` in public APIs.** Use `unknown` + narrowing if needed.
- **Named exports.** Default exports are forbidden.
- **Pure functions.** Side effects belong in clearly labeled services (stores, authorities, loggers).
- **Async/await.** Prefer `async`/`await`. Avoid mixing with raw `.then()` chains.

### Performance considerations

- **Merkle trees.** The tree is built incrementally; avoid rebuilding the entire tree for every append unless necessary.
- **File I/O.** `FileLedgerStore` uses atomic tmp+fsync+rename writes. Avoid unnecessary compaction runs.
- **Replay.** `EventReplayer` is lazy — it iterates over the event array only when `replay` or `project` is called.

### Security considerations

- **Secret scrubbing.** `ConsoleLogger` scrubs fields named `privateKey`, `password`, `token`, `secret`, `credential`, `iv`, `tag`, `share`. Add new scrub patterns if needed.
- **Path traversal.** `FileLedgerStore` validates file paths and rejects parent directory traversal attempts.
- **Import validation.** `importJsonl` validates hash continuity; never skip this step for production use.

## Running tests

```bash
# Run all ledger tests
npm test -- packages/ledger

# Run tests in watch mode
npm test -- --watch packages/ledger

# Run tests with coverage
npm run test:coverage
```

## Building

```bash
# Build the ledger package
cd packages/ledger
npm run build

# Build types only
npm run build:types

# Build bundle (no types)
npm run build:bundle
```

## License

By contributing, you agree your contributions are licensed under the Apache-2.0 license and assigned to the Manya Hael Foundation for inclusion in the project.
