# Changelog

All notable changes to `@manya-os/ledger` are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.1.0] -- Unreleased

### Added

- **Comprehensive test suite** -- 9 test files, 218 tests covering all public API surface:
  `chain.spec.ts`, `event.spec.ts`, `merkle.spec.ts`, `timestamp.spec.ts`, `replay.spec.ts`, `store.spec.ts`, `export.spec.ts`, `crypto.spec.ts`, `integration.spec.ts`.

### Changed

- **README.md** -- Rewritten to accurately reflect the current implementation. All code examples corrected: `LedgerChain.append` signature, `head()`/`tail()` semantics, synchronous `generateKeyPair`, `MerkleTree.build` factory API, `commit(Buffer)` / `reveal(Buffer, Buffer, Buffer)` / `issueTimestamp(commitment, authority)` signatures, `chain.all()` instead of `chain.events()`, and `FileLedgerStore` constructor options.
- **docs/API.md** -- Rewritten as the authoritative API reference. Corrected all type signatures, parameter descriptions, return values, and examples to match actual source code. Removed references to nonexistent methods (`chain.events()`, `chain.clear()`, `chain.verify()`, `MerkleTree.addLeaf()`, `proofPathHash`, `rfc6962Prefix`). Corrected error subclass list. Documented RFC 6962 leaf prefix behavior for Merkle proof verification.

### Fixed (documentation only)

- `LedgerChain.append` documented as accepting a `LedgerEvent`; actual signature is `append(type, actor, payload, opts?)`.
- `head()` documented as returning the most recent event; it returns the **first** (genesis) event.
- `tail()` documented as returning the genesis event; it returns the **last** event.
- `generateKeyPair` documented as async (`await`); it is synchronous.
- `MerkleTree` documented with a constructor + `addLeaf` / `proof` / `leafHash` API; actual API is `MerkleTree.build(leaves)` static factory with `getProof` / `verifyProof` / `root` / `leafCount`.
- `commit` documented as accepting a string; it requires a `Buffer`.
- `reveal` documented as returning `{ value, nonce }`; it returns `boolean` and takes `(value, nonce, commitment)`.
- `issueTimestamp` documented as `(value, nonce, authority)`; actual signature is `(commitment, authority)`.
- `chain.events()` documented; actual method is `chain.all()`.
- `FileLedgerStoreOptions` documented with `path`; actual options are `compactThresholdBytes` and `load`.
- `ExportOptions` documented with `format` and `includeMetadata`; actual fields are `filter`, `includeSignatureFields`, and `maxCsvPayloadColumns`.
- `importJsonl` documented as accepting a file path and returning `Promise`; it accepts a JSONL string and returns `LedgerEvent[]` synchronously.
- `AppendOptions` documented with `verifyHashChain`, `verifySignatures`, `publicKeys`; actual fields are `id`, `timestamp`, `metadata`, `privateKey`, `signatureAlgorithm`.
- `LocalTimestampAuthorityOptions` documented with `keyAlgorithm` and `logger`; actual field is `keypair`.
- `DEFAULT_COMPACT_THRESHOLD_BYTES` documented as 10 MiB; actual value is 1 MiB.
- `LogLevel` documented as an enum; actual type is `'debug' | 'info' | 'warn' | 'error' | 'silent'`.
- Error subclass list included `ValidationError`, `CodecError`, `CryptoError` (nonexistent); corrected to `EventError`, `SyncError`, `TamperError`.
- `LedgerStore` interface documented with `Promise<void>` returns and nonexistent methods; corrected to synchronous with actual interface.
- `authority.publicKey` and `authority.keyId` documented as properties; actual API is `authority.getPublicKey()` and `authority.getKeyId()`.

### Not changed

- No intentional runtime behavior changes. All source code changes are limited to documentation files and test files.

---

## [1.0.0] -- 2024-01-01

Initial production release of `@manya-os/ledger`, the immutable audit ledger for the MANYA Intelligence OS. Conceived, directed, and owned by **Uviwe Menyiwe (Azura Daemon)**, founder of the **Manya Hael Foundation**.

### Added -- Cryptography

- **`crypto/hashing.ts`** -- `sha256`, `sha512`, `hmac` (SHA-256/512), `secureRandom`, `constantTimeEqual` (timing-safe Buffer compare), `randomToken` (32-byte hex), `uuid` (v4), and `sha256Hex`.
- **`crypto/keys.ts`** -- `generateKeyPair` (RSA-PSS 3072 default, ECDSA P-256), `importKeyPem`, `exportKeyPem` (SPKI / PKCS#8), `getKeyId` (SHA-256 of SPKI DER), `algorithmFor` (algorithm string for KeyObject), and `algorithmForKey` (KeyAlgorithm for algorithm string).
- **`crypto/signatures.ts`** -- `sign` / `verify` for RSA-PSS and ECDSA P-256, using `crypto.timingSafeEqual` as a constant-time guard on the result.

### Added -- Events

- **`event/event.ts`** -- `createEvent` factory with optional `id`, `seq`, `timestamp`, `prevHash`, and `metadata`; `computeEventHash` (SHA-256 of canonical signing fields), `signEvent` (adds signature and algorithm), `verifyEventSignature` (constant-time verify), `eventKeyId` (extracts keyId from event if available), and `GENESIS_PREV_HASH` constant (64 zero hex chars).
- **`event/codec.ts`** -- `canonicalSerialize` (stable JSON with sorted keys, `signature` and `metadata` stripped), `canonicalSerializeToString` (UTF-8 string), and `isCanonicalObject` (helper for plain objects).

### Added -- Chain

- **`chain/chain.ts`** -- `LedgerChain` class with `append` (hash-chains events, optional verification), `get` (by id or seq), `head`, `tail`, `length`, `events` (read-only snapshot), `clear`, and `verify` (internal hash continuity check).
- **`chain/verify.ts`** -- `verifyChain` with options: `publicKeys` (actor -> publicKey map), `requireSignatures` (reject unsigned events), `checkTimestamps` (monotonic timestamps), `checkSeqContiguity` (no gaps). Returns `ChainVerification` with `valid`, `firstBrokenIndex`, and `reason`.

### Added -- Merkle

- **`merkle/tree.ts`** -- `MerkleTree` with `addLeaf`, `leafHash`, `leafCount`, `root` (deterministic SHA-256), `proof` (inclusion proof), and internal pairing logic for odd leaf counts.
- **`merkle/proof.ts`** -- `verifyProof` (validates inclusion proof against a root), `proofPathHash` (computes hash along path), and `rfc6962Prefix` (RFC 6962 tree hash prefix).

### Added -- Timestamp authority

- **`timestamp/authority.ts`** -- `LocalTimestampAuthority` class with `publicKey`, `keyId`, `generateKeyPair` (creates authority key), and `canonicalTimestampBytes` (stable token bytes for signing).
- **`timestamp/timestamp.ts`** -- `commit` (SHA-256(value || nonce)), `reveal` (recovers value and nonce from commitment), `issueTimestamp` (creates signed `TimestampToken`), `verifyTimestamp` (validates token signature and commitment), and constants: `TIMESTAMP_TOKEN_VERSION`, `COMMITMENT_NONCE_BYTES`, `COMMITMENT_BYTES`.

### Added -- Replay

- **`replay/replay.ts`** -- `EventReplayer` class with `replay` (generator with `ReplayFilter`: `fromSeq`, `toSeq`, `fromTime`, `toTime`, `type`, `actor`) and `project` (fold through reducer to build a state projection).

### Added -- Store

- **`store/store.ts`** -- `LedgerStore` interface with `append`, `load`, `clear`, `length`, `get`, `tail`, `head`, `events`.
- **`store/memory.ts`** -- `InMemoryLedgerStore` with in-memory array backing, `cloneEvent` helper, and `tail`/`head`/`events` accessors.
- **`store/file.ts`** -- `FileLedgerStore` with JSONL persistence, atomic tmp+fsync+rename writes, compaction (threshold configurable), and `FileLedgerStoreOptions` (`path`, `compactThresholdBytes`).

### Added -- Export

- **`export/exporter.ts`** -- `exportAuditLog` (exports events in `jsonl`, `json`, or `csv` format), `importJsonl` (imports JSONL, validates hash continuity), and `ExportFormat` type, `ExportOptions` (`format`, `includeMetadata`).

### Added -- Errors & logging

- **`errors.ts`** -- `LedgerError` base class with stable `code` field, plus 9 subclasses: `ChainError`, `ValidationError`, `MerkleError`, `TimestampError`, `ReplayError`, `StoreError`, `ExportError`, `CodecError`, `CryptoError`.
- **`logging.ts`** -- `Logger` interface, `ConsoleLogger` (JSON to stdout/stderr, scrubbing fields named `privateKey`, `password`, `token`, `secret`, `credential`, `iv`, `tag`, `share`), `SilentLogger`, plus `scrubMetadata` and `shouldScrubField` helpers.

### Added -- Tests

- Comprehensive test suite covering happy + error paths for every public function:
  `chain.spec.ts`, `event.spec.ts`, `merkle.spec.ts`, `timestamp.spec.ts`, `replay.spec.ts`, `store.spec.ts`, `export.spec.ts`, `crypto.spec.ts`.

### Added -- Documentation

- `README.md` (vision, feature list, install, six quick-start examples, configuration tables, security notes).
- `docs/API.md` (full TypeScript API reference).
- `CHANGELOG.md` (this file).
- `LICENSE` (Apache-2.0, copyright Manya Hael Foundation).
- `CONTRIBUTING.md` and `SECURITY.md` (package-specific).

### Security

- Constant-time comparison via `crypto.timingSafeEqual` for signature verification.
- Deterministic canonical serialization (sorted keys, stable JSON) for all event hashing.
- Merkle proof validation with RFC 6962 prefix handling.
- Commitment scheme with random 32-byte nonces for timestamp authority.
- Atomic file writes in `FileLedgerStore` (tmp + fsync + rename).
- Strict TypeScript; no `any` in public APIs.

---

[1.0.0]: https://github.com/manya-hael/intelligence-os/releases/tag/%40manya-os%2Fledger%401.0.0
