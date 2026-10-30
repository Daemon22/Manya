# Security Policy — @manya-os/ledger

## Supported Versions

The `@manya-os/ledger` package is currently in active development. Security fixes are applied to the latest `main` branch and backported to the most recent minor release.

| Version | Supported |
| ------- | --------- |
| 1.x     | ✅        |
| < 1.0   | ❌        |

## Reporting a Vulnerability

**Do NOT file security vulnerabilities as public GitHub issues.**

The Manya Hael Foundation takes security reports seriously. If you discover a vulnerability in `@manya-os/ledger`, please report it privately:

1. Email **security@manyahael.org** with a description, reproduction steps, and impact assessment.
2. You will receive an acknowledgement within **72 hours**.
3. The Foundation will investigate and provide a fix timeline within **7 days**.
4. Once fixed and released, public disclosure is coordinated with the reporter.

Please do not disclose the vulnerability publicly until a fix has been released and you have been notified.

## Scope

In scope:
- All cryptographic operations (hashing, signatures, key generation).
- Merkle tree construction and proof validation.
- Timestamp authority commitment/reveal scheme.
- Chain verification (hash continuity, signature verification).
- File persistence (atomic writes, path traversal).
- Import/export validation (hash verification, malformed input).

Out of scope:
- Vulnerabilities in third-party dependencies (report upstream).
- Self-inflicted issues from disabling security defaults.
- Theoretical timing attacks without a demonstrated exploit.

## Security Principles

- **Deterministic hashing.** All events are canonicalized (sorted keys, stable JSON) before hashing. This ensures the same event always produces the same hash, preventing hash-based collision attacks on the audit trail.
- **Constant-time comparisons.** Signature verification uses `crypto.timingSafeEqual` to prevent timing attacks on signature comparison.
- **No secrets in logs.** Logging primitives scrub fields named `privateKey`, `password`, `token`, `secret`, `credential`, `iv`, `tag`, `share` by default.
- **Atomic writes.** `FileLedgerStore` writes to a `.tmp` file, `fsync`s, then `rename`s for crash-safety. This prevents partial ledger files on power loss.
- **Commitment scheme.** Timestamp authority uses random 32-byte nonces for commitments, preventing precomputation attacks.
- **Cryptographic correctness.** Uses Node.js `crypto` (OpenSSL-backed) primitives — never custom crypto. RSA-PSS and ECDSA P-256 for signatures, SHA-256/SHA-512 for hashing.
- **Proof validation.** Merkle proof validation verifies the full inclusion path and rejects malformed proofs. RFC 6962 prefix handling ensures standard compliance.

## Cryptography

The cryptographic surface of `@manya-os/ledger` relies on Node.js `crypto` (OpenSSL-backed) for:

- **Signatures:** RSA-PSS (3072-bit default) and ECDSA P-256 with SHA-256.
- **Hashing:** SHA-256 and SHA-512 for event hashing, Merkle trees, and HMAC.
- **Key generation:** RSA-PSS and ECDSA P-256 keypair generation.
- **Random:** `crypto.randomBytes` for nonces, tokens, and UUIDs.

Key material is never serialized in plaintext. When events are signed, only the hash is signed; the signature is attached to the event but the signing key itself is never persisted by the ledger (key management is delegated to `@manya-os/keyring`).

## Known Limitations

- **No built-in key storage.** The ledger does not store private keys. Use `@manya-os/keyring` for secure key management.
- **No replay protection at the application level.** The ledger provides `verifyChain` and `EventReplayer`, but application-level replay policies (idempotent handlers, deduplication) are the responsibility of the consumer.
- **Single authority timestamp tokens.** The default `LocalTimestampAuthority` is a single-key authority. For production deployments, consider a distributed authority or external timestamping service.

## Disclosure Timeline

| Day  | Action |
| ---- | ------ |
| 0    | Reporter submits. Foundation acknowledges within 72h. |
| 7    | Foundation confirms and provides fix timeline. |
| 30   | Fix released (sooner for critical issues). |
| 60   | Public disclosure after release, coordinated with reporter. |

## Contact

- General security: **security@manyahael.org**
- PGP key: published on the Foundation website.
- Maintainer escalation: **foundation@manyahael.org**
