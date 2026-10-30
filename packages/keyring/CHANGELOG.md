# Changelog

All notable changes to `@manya-os/keyring` are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] — 2024-01-01

Initial production release of `@manya-os/keyring`, the sovereign identity and
credential wallet for the MANYA Intelligence OS. Conceived, directed, and
owned by **Uviwe Menyiwe (Azura Daemon)**, founder of the **Manya Hael
Foundation**.

### Added — Cryptography

- **`crypto/hashing.ts`** — `sha256`, `sha512`, `hmac` (SHA-256/512),
  `hkdf` (HKDF-SHA256), `pbkdf2` (PBKDF2-SHA512), and
  `constantTimeEqual` (timing-safe Buffer compare).
- **`crypto/symmetric.ts`** — AES-256-GCM `encrypt` / `decrypt` with
  random 96-bit IV per call, 128-bit auth tag, and optional AAD.
- **`crypto/keys.ts`** — `generateKeyPair` (RSA-PSS 3072 default, ECDSA
  P-256), `deriveKey` (HKDF-SHA256), `importKeyPem`, `exportKeyPem`
  (SPKI / PKCS#8), `getKeyFingerprint` (SHA-256 of SPKI DER), and the
  `algorithmFor` mapper.
- **`crypto/signatures.ts`** — `sign` / `verify` for RSA-PSS and ECDSA
  P-256, using `crypto.timingSafeEqual` as a constant-time guard on the
  result; `proofTypeFor` helper.

### Added — Identity

- **`identity/identity.ts`** — `Identity` class with UUID v4 id,
  did:key-style DID derived from the public key (multicodec `0x1200` for
  P-256, custom `0x85 0x1a` prefix + SHA-256 for RSA), SPKI PEM public
  key, public metadata, and `serialize` / `deserialize` round-trip.
- **`identity/roles.ts`** — `Role` enum (`Admin`, `Agent`, `Operator`,
  `Auditor`, `Guest`), `RoleManager` (assign / revoke / revokeAll /
  hasRole / hasAnyRole / getRoles / listIdentities) with optional
  `EncryptedStorage` persistence; `parseRole` and `newRoleAssignmentId`
  helpers.

### Added — Access control

- **`access/policy.ts`** — `AccessPolicy` interface, `AccessPolicySet`
  with exact + wildcard (`:*`) resource matching (deny takes precedence
  over allow), `defaultPolicySet` factory, and `matchResource` helper.
- **`access/enforcer.ts`** — `AccessEnforcer` with `enforce` (returns
  `{ allowed, reason }`) and `enforceOrThrow` (throws
  `AccessDeniedError`).

### Added — Wallet

- **`wallet/storage.ts`** — `EncryptedStorage` interface, `InMemoryStorage`,
  `FileStorage` (atomic tmp+fsync+rename writes; `:` separator maps to
  directory hierarchy).
- **`wallet/credentials.ts`** — `VerifiableCredential` model,
  `issueCredential`, `verifyCredential`, `validateCredential` (expiry +
  shape), and `canonicalCredentialBytes` (stable JSON with sorted keys,
  `proof` stripped).
- **`wallet/wallet.ts`** — `KeyringWallet` facade: `createIdentity`,
  `importIdentity`, `listIdentities`, `getIdentity`, `getPrimaryIdentity`,
  `setPrimaryIdentity`, `issueCredential`, `addCredential`,
  `listCredentials`, `getCredential`, `deleteCredential`, `sign`,
  `signViaProvider`, `verify`, `verifyCredential`, `exportEncrypted`,
  `importEncrypted`, `assignRole`, `revokeRole`, `getSequence`,
  `bumpSequence`. Master key derived from passphrase via PBKDF2 (210k
  iterations, SHA-512); private keys individually AES-256-GCM encrypted
  inside the export blob.

### Added — Recovery

- **`recovery/recovery.ts`** — Real **Shamir Secret Sharing over GF(2⁸)**
  with the AES polynomial 0x11b and primitive generator α = 3.
  `shamirSplit(secret, k, n)` and `shamirCombine(shares)` with full
  Lagrange interpolation at x = 0. Share format: 1-byte x-coordinate +
  one y-byte per secret byte. Plus `verifySharesConsistent` and the
  `gfMul` / `gfDiv` / `gfEval` primitives.
- **`recovery/backup.ts`** — `createBackup(wallet, passphrase)` and
  `restoreBackup(blob, passphrase)` for an encrypted JSON-serializable
  backup blob containing public identity + credentials (NO raw private
  key).

### Added — Sync

- **`sync/multi-device.ts`** — `MultiDeviceSync` with
  `createSyncBundle(wallet)` (signed bundle of public identity +
  credentials + timestamp + sequence number) and `applySyncBundle(wallet,
  bundle, sourcePublicKey)` (validates signature, applies newer
  credentials, detects conflicts where the same credential id has a
  different proof value, skips already-known credentials, bumps local
  sequence). Plus `validateBundle` and `buildBundleFromParts`.

### Added — Hardware

- **`hardware/provider.ts`** — `HardwareKeyProvider` interface
  (`isAvailable`, `generateKeyPair`, `sign`, `verify`, optional
  `deleteKey` and `hasKey`).
- **`hardware/software-fallback.ts`** — `SoftwareKeyProvider` default
  implementation that keeps keys in process memory; supports
  `replaceKey`, `getPrivateKey`, `getPublicKey`, `getAlgorithm`,
  `importExistingKey`, and `clear`.

### Added — Errors & logging

- **`errors.ts`** — `KeyringError` base class with stable `code` field,
  plus 12 subclasses: `KeyGenerationError`, `SignatureError`,
  `VerificationError`, `EncryptionError`, `DecryptionError`,
  `StorageError`, `AccessDeniedError`, `CredentialError`, `SyncError`,
  `BackupError`, `RecoveryError`, `HardwareKeyError`.
- **`logging.ts`** — `Logger` interface, `ConsoleLogger` (JSON to
  stdout/stderr, scrubbing fields named `privateKey`, `password`,
  `passphrase`, `token`, `secret`, `credential`, `iv`, `tag`, `share`),
  `SilentLogger`, plus `scrubMetadata` and `shouldScrubField` helpers.

### Added — Tests

- 10 spec files covering happy + error paths for every public function:
  `crypto.spec.ts`, `wallet.spec.ts`, `credentials.spec.ts`,
  `identity.spec.ts`, `roles.spec.ts`, `access.spec.ts`,
  `recovery.spec.ts`, `sync.spec.ts`, `hardware.spec.ts`,
  `integration.spec.ts`. **219 tests, all passing.**

### Added — Documentation

- `README.md` (vision, feature list, install, three quick-start
  examples, configuration table, security notes).
- `docs/API.md` (full TypeScript API reference).
- `CHANGELOG.md` (this file).
- `LICENSE` (Apache-2.0, copyright Manya Hael Foundation).
- `CONTRIBUTING.md` and `SECURITY.md` (package-specific).

### Security

- Constant-time comparison via `crypto.timingSafeEqual` for signature
  verification.
- AES-256-GCM with random 96-bit IV per call and 128-bit auth tag.
- PBKDF2-SHA512 at 210,000 iterations for wallet passphrase → master key.
- No raw private keys in any persisted form (exports and backups encrypt
  at rest).
- Atomic file writes in `FileStorage` (tmp + fsync + rename).
- Strict TypeScript; no `any` in public APIs.

---

[1.0.0]: https://github.com/manya-hael/intelligence-os/releases/tag/%40manya%2Fkeyring%401.0.0
