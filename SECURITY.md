# Security Policy

## Supported Versions

The MANYA Intelligence OS is currently in active development. Security fixes are applied to the latest `main` branch and backported to the most recent minor release of each affected package.

| Version | Supported |
| ------- | --------- |
| 1.x     | ✅        |
| < 1.0   | ❌        |

## Reporting a Vulnerability

**Do NOT file security vulnerabilities as public issues.**

The Manya Hael Foundation takes security reports seriously. If you discover a vulnerability in any `@manya-os/*` package, please report it privately:

1. Email **security@manyahael.org** with a description, reproduction steps, and impact assessment.
2. You will receive an acknowledgement within **72 hours**.
3. The Foundation will investigate and provide a fix timeline within **7 days**.
4. Once fixed and released, public disclosure is coordinated with the reporter.

Please do not disclose the vulnerability publicly until a fix has been released and you have been notified.

## Scope

In scope:
- All packages under `/packages/*` in this repository.
- Cryptographic primitives, key storage, identity, attestation, ledger integrity.
- Governance policy enforcement.
- Event infrastructure (if it leads to privilege escalation or data leak).

Out of scope:
- Vulnerabilities in third-party dependencies (report upstream).
- Self-inflicted issues from disabling security defaults.
- Theoretical timing attacks without a demonstrated exploit.

## Security Principles

- **Secure by default.** Every package ships with the safest possible configuration. Insecure options must be opt-in and clearly marked.
- **Defense in depth.** Validate at every boundary. Never trust caller input.
- **Least privilege.** No package requests more authority than required.
- **Cryptographic correctness.** Use vetted primitives. Never roll custom crypto.
- **Constant-time comparisons** for signature and token verification.
- **No secrets in logs.** Logging primitives scrub `privateKey`, `password`, `token`, `secret`, `credential` fields by default.
- **Auditable operations.** Destructive or sensitive operations emit audit events suitable for the `@manya-os/ledger`.

## Cryptography

The cryptographic surface of MANYA relies on Node.js `crypto` (OpenSSL-backed) for:
- RSA-PSS and ECDSA signatures (P-256, P-384, P-521).
- AES-256-GCM for at-rest encryption.
- HKDF-SHA256 for key derivation.
- SHA-256 / SHA-512 for hashing and Merkle trees.

Key material is never serialized in plaintext. Encrypted stores use AES-256-GCM with random 96-bit IVs and authenticated additional data (AAD). Where hardware-backed key storage is available (TPM, Secure Enclave, WebAuthn), it is preferred over software keys via pluggable `KeyStorage` interfaces.

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
