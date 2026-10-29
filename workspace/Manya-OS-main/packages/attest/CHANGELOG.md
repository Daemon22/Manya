# Changelog

All notable changes to `@manya-os/attest` are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] — 2024-01-01

Initial production release of `@manya-os/attest`, the device and session
attestation package for the MANYA Intelligence OS. Conceived, directed, and
owned by **Uviwe Menyiwe (Azura Daemon)**, founder of the **Manya Hael
Foundation**.

### Added — Cryptography (self-contained)

- **`crypto/hashing.ts`** — `sha256`, `sha512`, `hmac` (SHA-256/512),
  `secureRandom` (CSPRNG with size guard), `constantTimeEqual`
  (timing-safe Buffer compare), `randomToken`, `uuid`.
- **`crypto/keys.ts`** — `generateKeyPair` (RSA-PSS 3072 default, ECDSA
  P-256), `importKeyPem` / `exportKeyPem` (SPKI / PKCS#8),
  `getKeyFingerprint` (SHA-256 of SPKI DER), `algorithmFor` /
  `algorithmForKey` mappers. Self-contained — does NOT import
  `@manya-os/keyring`.
- **`crypto/signatures.ts`** — `sign` / `verify` for RSA-PSS and ECDSA
  P-256, with algorithm inference from the key type and
  `crypto.timingSafeEqual` constant-time guard on the result;
  `signForChallenge` / `signForAttestation` convenience wrappers;
  `proofTypeFor` helper.

### Added — Fingerprinting

- **`fingerprint/collector.ts`** — `collectDeviceSignals` collects
  PII-free hardware/OS signals (cpus, arch, platform, hostname, MACs,
  totalmem, nodeVersion, release, optional machineId). NEVER collects
  username, home dir, or env. `redactSignals` produces a log-safe view
  (macs replaced with a count marker, machineId replaced with
  `[redacted]`). Plus `deriveDeviceId`, `stableStringify`,
  `newCorrelationId`, `REDACTED`.
- **`fingerprint/fingerprint.ts`** — `DeviceFingerprint` class with
  `fromSignals` (stable SHA-256), `fromString` (load from storage),
  `compare` (returns `{ match, drift }` with per-field drift scoring,
  constant-time), `equals`, `toString`, `valueOf`.

### Added — Challenge-response

- **`challenge/nonce.ts`** — `NonceStore` with `issue` (unique nonces),
  `consume` (single-use, TTL-aware), `isValid`, `cleanup` (TTL expiry),
  `size`, `clear`.
- **`challenge/challenge.ts`** — `generateChallenge` (random bytes +
  nonce + TTL), `decodeChallenge` (base64 → Buffer), `signChallenge`
  (produces `SignedChallengeResponse`), `verifyResponse` (constant-time
  nonce compare + signature verification), `isChallengeExpired`.

### Added — Sessions

- **`session/store.ts`** — `SessionStore` interface
  (`get`/`put`/`delete`/`list`), `InMemorySessionStore` with defensive
  copies.
- **`session/session.ts`** — `SessionManager` with `establish`
  (issues 256-bit token + UUID sessionId, binds fingerprint + identity
  + trustScore + optional boundNonce), `verify` (TTL-aware, returns
  `null` for unknown / expired), `revoke`, `refresh` (issues new token
  + revokes old), `list`, `reap` (removes expired).

### Added — Hardware validation

- **`hardware/validator.ts`** — `HardwareValidator` with `probe` (TPM
  on Linux/Windows, Secure Enclave on macOS, TEE on
  Linux/Windows). All probes wrapped in try/catch — `probe()` MUST NOT
  throw. `requireHardwareOrThrow` convenience.
- **`hardware/provider.ts`** — `HardwareAttestationProvider`
  interface (`isAvailable` / `attest` / `verifyQuote`).
  `SoftwareAttestationProvider` fallback that signs with a local
  RSA-PSS or ECDSA P-256 key (no hardware guarantees — dev / testing /
  low-assurance only). `canonicalQuoteBytes` helper for stable
  serialization.

### Added — Remote attestation

- **`remote/quote.ts`** — `AttestationQuote` validation
  (`validateQuote`), `serializeQuote` (stable JSON → Buffer),
  `deserializeQuote` (Buffer → quote), `ATTESTATION_QUOTE_VERSION`.
- **`remote/attestation.ts`** — `produceAttestation` (signs canonical
  bytes of `{ version, deviceFingerprint, measurements, timestamp,
  nonce, algorithm, hardware? }`), `verifyAttestation` (checks
  signature + freshness + nonce + fingerprint match, all
  constant-time), `produceAndSerializeAttestation`,
  `deserializeAndVerifyAttestation`. Default freshness window: 5 min.

### Added — Trust evaluation

- **`trust/model.ts`** — `TrustScore` and `TrustFactors` types;
  `computeFactors` (input → per-factor contribution: fingerprint
  stability, hardware, attestation, session age with 1h half-life,
  prior interactions log-scaled to ~100); `aggregateScore`;
  `decideFromScore` (`>= 0.7` trust, `>= 0.3` challenge, `< 0.3`
  reject); `buildTrustScore`; `DEFAULT_FACTOR_WEIGHTS`;
  `TRUST_DECISION_THRESHOLD`; `CHALLENGE_DECISION_THRESHOLD`.
- **`trust/evaluator.ts`** — `TrustEvaluator` with custom weights
  (renormalized to sum to 1.0), `evaluate`, `evaluateFromFactors`,
  `factorize`. `defaultTrustEvaluator` singleton.

### Added — Workflow

- **`workflow/policies.ts`** — `AuthPolicy` type, `defaultPolicy`
  (balanced), `strictPolicy` (high-assurance: hardware required, 0.8
  min trust, 15m TTL, 0% drift, 1m freshness), `buildPolicy` (merge
  overrides), `validatePolicy`.
- **`workflow/authenticator.ts`** — `AuthenticationWorkflow`
  orchestrating the full flow: verifier issues challenge (nonce
  tracked in `NonceStore`) → prover signs challenge + produces
  attestation quote (optionally augmented by a hardware provider) →
  verifier consumes nonce + verifies response + verifies quote +
  checks hardware requirement + computes trust score + establishes
  session. Plus `verifySession`, `revokeSession`, `refreshSession`,
  `createSoftwareWorkflow` convenience.

### Added — Errors & logging

- **`errors.ts`** — `AttestError` base class with stable `code` field,
  plus 8 subclasses: `FingerprintError`, `ChallengeError`,
  `SessionError`, `HardwareValidationError`, `AttestationError`,
  `WorkflowError`, `TrustEvaluationError`, `NonceError`.
- **`logging.ts`** — `Logger` interface, `ConsoleLogger` (JSON to
  stdout/stderr, scrubbing fields named `privateKey`, `password`,
  `passphrase`, `token`, `secret`, `credential`, `iv`, `tag`, `share`,
  `nonce`, `signature`, `macs`, `machineId`), `SilentLogger`,
  `scrubMetadata`, `shouldScrubField`.

### Added — Tests

- 9 spec files covering happy + error paths for every public function:
  `crypto.spec.ts` (31 tests), `fingerprint.spec.ts` (24),
  `challenge.spec.ts` (27), `session.spec.ts` (21),
  `hardware.spec.ts` (24), `remote.spec.ts` (26),
  `trust.spec.ts` (19), `workflow.spec.ts` (19),
  `integration.spec.ts` (31). **222 tests, all passing.**
- Integration tests include: full happy-path lifecycle (prover key
  generation → fingerprint → challenge → sign + attest → verify →
  session → refresh → revoke); tampering tests (modified
  measurements, modified fingerprint, replayed nonce, wrong signature,
  drifted fingerprint, expired challenge); custom SessionStore;
  RSA-PSS keys; software workflow; logger scrubbing.

### Added — Documentation

- `README.md` (vision statement mentioning Manya Hael Foundation +
  Uviwe Menyiwe Azura Daemon, feature table, install, 3 quick-start
  examples: device fingerprint, challenge-response auth, full
  attestation workflow, configuration tables, security notes, links
  to docs/API.md).
- `docs/API.md` (full TypeScript API reference for every public
  export, with code examples).
- `CHANGELOG.md` (this file).
- `LICENSE` (Apache-2.0, copyright Manya Hael Foundation).
- `CONTRIBUTING.md` and `SECURITY.md` (package-specific).

### Security

- Constant-time comparison via `crypto.timingSafeEqual` for signature,
  nonce, and fingerprint verification.
- PII-free device fingerprints (no username / home dir / env).
- Single-use nonces with TTL expiry.
- Sessions bound to challenge nonces (replay protection).
- Attestation freshness window (default 5 min).
- All hardware probes wrapped in try/catch — `probe()` never throws.
- Strict TypeScript; no `any` in public APIs.
- No raw private keys in any persisted form or log message.
- Self-contained — no `@manya-os/keyring` dependency.

---

[1.0.0]: https://github.com/manya-hael/intelligence-os/releases/tag/%40manya%2Fattest%401.0.0
