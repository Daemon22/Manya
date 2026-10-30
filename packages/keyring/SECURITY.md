# Security Policy — @manya-os/keyring

For the general security policy (supported versions, reporting a vulnerability, disclosure timeline, scope, principles), see the root [SECURITY.md](../../SECURITY.md). This file describes the **package-specific** security surface.

## Cryptographic surface

`@manya-os/keyring` uses Node.js `crypto` (OpenSSL-backed) for all cryptographic operations:

| Operation | Primitive |
| --- | --- |
| Asymmetric signatures | RSA-PSS (SHA-256, salt length = digest) and ECDSA over NIST P-256 (SHA-256). |
| Symmetric encryption | AES-256-GCM with 96-bit IV (fresh per call) and 128-bit auth tag. |
| Key derivation (master → subkey) | HKDF-SHA256. |
| Key derivation (passphrase → master) | PBKDF2-SHA512 at 210,000 iterations (per OWASP 2023). |
| Hashing | SHA-256, SHA-512, HMAC-SHA-256, HMAC-SHA-512. |
| Secret sharing | Shamir Secret Sharing over GF(2⁸) with the AES polynomial 0x11b and primitive generator α = 3. |

Custom cryptographic code is **not** used. The only "rolled" implementation is the GF(2⁸) field arithmetic for Shamir Secret Sharing, which is a standard textbook construction (the same one used by many production SSS libraries). The implementation uses precomputed exp/log tables for O(1) multiplication and division.

## Constant-time comparisons

All signature verifications (`crypto.signatures.verify`) and credential verifications (`wallet.credentials.verifyCredential`) route the OpenSSL boolean result through `crypto.timingSafeEqual` as a defense-in-depth. Token / signature comparisons in the sync layer (`MultiDeviceSync.applySyncBundle`) use `constantTimeEqual` directly.

## Key storage

- **Software path (`SoftwareKeyProvider`)**: private keys live in process memory (`Map<string, KeyObject>`). They are NEVER written to disk. If the process exits, the keys are gone.
- **Hardware path (`HardwareKeyProvider`)**: private keys live on the device (TPM, Secure Enclave, HSM, WebAuthn). The wallet only ever holds the public key + a key id.
- **Wallet exports (`exportEncrypted`)**: each private key is individually AES-256-GCM encrypted with a key derived from the user passphrase via PBKDF2 (210k iterations, SHA-512). The encrypted private keys, public identities, and credentials are then encrypted again as an outer AES-256-GCM blob.
- **Backups (`createBackup`)**: backups contain ONLY public identity + credentials. NO raw private key is included. Private-key recovery uses Shamir Secret Sharing, not backups.

## Recovery

- **Shamir Secret Sharing** (`shamirSplit` / `shamirCombine`): splits a secret into `n` shares, any `k` of which suffice to reconstruct. Share format is a 1-byte x-coordinate (1..255) followed by one y-byte per secret byte. The polynomial for each byte position is independent and uses fresh randomness.
- **Backup format** (`createBackup` / `restoreBackup`): JSON-serializable encrypted blob with PBKDF2 salt, AES-256-GCM IV, ciphertext, and auth tag. Versioned; restores reject unknown versions.
- **Recommendation**: store Shamir shares in geographically and administratively distinct locations. A common pattern is k=3, n=5 — any 3 of 5 trusted parties can recover the key.

## Audit logging

The `KeyringWallet` accepts a `Logger` and emits `info`-level audit events for: identity creation, credential issuance, credential addition, wallet export, wallet import. The default `ConsoleLogger` scrubs the following field names (case-insensitive suffix match) from logged metadata:

`privateKey`, `password`, `passphrase`, `token`, `secret`, `credential`, `iv`, `tag`, `share`.

Use `SilentLogger` (the default) if you do not want any logging.

## Threat model (summary)

In scope:
- Compromise of a wallet export blob (attacker should not be able to decrypt without the passphrase — protected by PBKDF2 + AES-256-GCM).
- Compromise of `< k` Shamir shares (attacker should learn nothing about the secret — information-theoretic guarantee of SSS).
- Tampering with a sync bundle (signature verification rejects).
- Tampering with a credential (signature verification rejects).
- Path traversal in `FileStorage` (key validator rejects `..` and disallowed characters).

Out of scope (use other controls):
- Compromise of the host process (an attacker with process memory can read private keys from the `SoftwareKeyProvider` — use a `HardwareKeyProvider` for higher assurance).
- Compromise of `>= k` Shamir shares (by design, the secret can be reconstructed).
- Brute-force of a strong wallet passphrase (computationally infeasible at 210k PBKDF2-SHA512 iterations; use a 12+ character passphrase).

## Disclosure timeline

See the root [SECURITY.md](../../SECURITY.md). Critical issues in this package may accelerate the standard timeline.

## Contact

- General security: **security@manyahael.org**
- Maintainer escalation: **foundation@manyahael.org**
