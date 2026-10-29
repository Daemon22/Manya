# @manya-os/keyring

> Sovereign identity and credential wallet for the MANYA Intelligence OS.

`@manya-os/keyring` is the cryptographic and identity substrate of the **MANYA Intelligence OS** — a sovereign, modular, local-first intelligence operating system conceived, directed, and owned by **Uviwe Menyiwe (Azura Daemon)**, founder of the **Manya Hael Foundation**.

The package provides secure key generation, key derivation (HKDF-SHA256), encrypted storage (AES-256-GCM), did:key-style identity management, W3C-style verifiable credentials, RSA-PSS / ECDSA P-256 digital signatures, role-based access control, real Shamir Secret Sharing over GF(2⁸), encrypted backups, signed multi-device sync bundles, and a pluggable hardware-key-provider interface with a software fallback.

---

## Vision

The Manya Hael Foundation stewards the MANYA Intelligence OS as a long-horizon, mission-driven project to return sovereignty to individuals and communities over their own intelligence infrastructure. `@manya-os/keyring` is the keystone of that vision: **your keys, your identity, your credentials — yours alone.**

- **Sovereign.** Private keys never leave the wallet unencrypted. All sensitive operations are explicit and audit-loggable.
- **Local-first.** No network calls. No cloud dependency. Works fully offline.
- **Cryptographically correct.** Built on Node `crypto` (OpenSSL-backed) primitives — never custom crypto. Constant-time comparisons for all signature / token verification.
- **Composable.** Clean, typed interfaces for storage, hardware, and logging — swap any layer without rewriting the others.
- **Production-ready.** Strict TypeScript. Typed errors. Comprehensive unit + integration tests.

---

## Features

| Area | What you get |
| --- | --- |
| **Key generation** | RSA-PSS (3072-bit default) and ECDSA P-256 keypairs. |
| **Key derivation** | HKDF-SHA256 (`deriveKey`) and PBKDF2-SHA512 (`pbkdf2`, 210k iterations for wallet passphrases). |
| **Symmetric encryption** | AES-256-GCM with random 96-bit IV per call and explicit AAD support. |
| **Hashing** | `sha256`, `sha512`, `hmac`, plus constant-time equality. |
| **Signatures** | `sign` / `verify` for RSA-PSS and ECDSA P-256, with `crypto.timingSafeEqual` guards. |
| **Identity** | `Identity` class with did:key-style DIDs derived from the public key. |
| **Credentials** | `issueCredential` / `verifyCredential` for W3C-style verifiable credentials with canonicalized signing. |
| **Wallet** | `KeyringWallet` facade: create identity, issue / store / verify credentials, sign / verify, export / import encrypted. |
| **Storage** | `EncryptedStorage` interface with `InMemoryStorage` and `FileStorage` (atomic tmp+rename writes). |
| **RBAC** | `Role` enum (admin / agent / operator / auditor / guest), `RoleManager`, `AccessPolicySet`, `AccessEnforcer` with deny-takes-precedence semantics. |
| **Recovery** | Real **Shamir Secret Sharing over GF(2⁸)** — `shamirSplit` / `shamirCombine` with k-of-n thresholds. |
| **Backups** | `createBackup` / `restoreBackup` — PBKDF2 + AES-256-GCM encrypted blobs containing public identity + credentials (no raw private keys). |
| **Multi-device sync** | `MultiDeviceSync` produces signed sync bundles and applies them with signature verification and conflict detection. |
| **Hardware support** | `HardwareKeyProvider` interface for TPM / Secure Enclave / HSM / WebAuthn, with `SoftwareKeyProvider` as the default fallback. |
| **Logging** | `Logger` interface and `ConsoleLogger` that scrubs fields named `privateKey`, `password`, `passphrase`, `token`, `secret`, `credential`, `iv`, `tag`, `share`. |

---

## Install

```bash
npm install @manya-os/keyring
# or
yarn add @manya-os/keyring
```

Requires Node.js 18+.

---

## Quick start

### 1. Create a wallet and identity

```ts
import { KeyringWallet, Role } from '@manya-os/keyring';

const wallet = new KeyringWallet();

const identity = await wallet.createIdentity('ecdsa', {
  name: 'sovereign-agent',
  agentId: 'azura-1',
});

// Make this identity an admin of its own wallet.
await wallet.assignRole(identity.id, Role.Admin);

console.log(identity.did); // did:key:z...
console.log(identity.fingerprint()); // sha256(spki-der) in hex
```

### 2. Issue a verifiable credential

```ts
const subjectDid = 'did:key:zsubject123';

const credential = await wallet.issueCredential(subjectDid, {
  role: 'operator',
  clearance: 'top-secret',
  scope: 'manya-os',
});

// Verify it later (in this wallet or any other that has the issuer's public key).
const ok = await wallet.verifyCredential(credential);
console.log(ok); // true
```

### 3. Multi-device sync

```ts
import { MultiDeviceSync } from '@manya-os/keyring';

const sync = new MultiDeviceSync();

// Device A: produce a signed bundle of public identity + credentials.
const bundle = sync.createSyncBundle(walletA);
// (transmit `bundle` out-of-band to device B)

// Device B: verify A's signature and apply the bundle.
const result = await sync.applySyncBundle(walletB, bundle, identityA.publicKey);
console.log(result.applied);   // newly added credential ids
console.log(result.conflicts); // conflicting credential ids (skipped)
console.log(result.skipped);   // already-known credential ids
```

---

## Configuration

The `KeyringWallet` constructor accepts an options object:

```ts
export interface KeyringWalletOptions {
  storage?: EncryptedStorage;        // default: InMemoryStorage
  hardwareProvider?: HardwareKeyProvider; // default: SoftwareKeyProvider
  logger?: Logger;                   // default: SilentLogger
}

const wallet = new KeyringWallet({
  storage: new FileStorage('./.manya/keyring'),
  hardwareProvider: new SoftwareKeyProvider(),
  logger: new ConsoleLogger('info'),
});
```

### Defaults you should know

| Setting | Default | Notes |
| --- | --- | --- |
| RSA modulus | 3072 bits | Override with `generateKeyPair('rsa', { rsaModulusBits })`. |
| EC curve | NIST P-256 (`prime256v1`) | Only P-256 is supported. |
| AES key size | 256 bits | Non-configurable. |
| AES-GCM IV | 96 bits, fresh per call | Non-configurable. |
| AES-GCM tag | 128 bits | Non-configurable. |
| PBKDF2 iterations (wallet passphrase) | 210,000 | Per OWASP 2023 recommendations. |
| PBKDF2 PRF | SHA-512 | Non-configurable. |
| HKDF hash | SHA-256 | Non-configurable. |
| Shamir field polynomial | 0x11b (AES polynomial) | Generator α = 3 (primitive element). |

---

## Security notes

- **Private keys are never serialized in plaintext.** Wallet exports and backups encrypt the private key with AES-256-GCM under a key derived from the user passphrase via PBKDF2 (210k iterations, SHA-512).
- **Constant-time comparisons** are used for all signature verifications. The `verify` function wraps the OpenSSL result with `crypto.timingSafeEqual` as a defense-in-depth.
- **No secrets in logs.** `ConsoleLogger` deeply scrubs fields named `privateKey`, `password`, `passphrase`, `token`, `secret`, `credential`, `iv`, `tag`, `share` — including camelCase variants like `userPassword`.
- **Atomic file writes.** `FileStorage` writes to a `.tmp` file, `fsync`s, then `rename`s for crash-safety.
- **Defense in depth.** Every public function validates inputs and throws typed `KeyringError` subclasses. Cryptographic operations never return partial state on failure.
- **Hardware-backed keys.** Use the `HardwareKeyProvider` interface to bind private keys to a TPM, Secure Enclave, HSM, or WebAuthn authenticator. The default `SoftwareKeyProvider` keeps keys in process memory only.

For threat models, reporting a vulnerability, and the disclosure timeline, see [SECURITY.md](./SECURITY.md) and the root [SECURITY.md](../../SECURITY.md).

---

## Documentation

- [docs/API.md](./docs/API.md) — full TypeScript API reference for every public export.
- [CHANGELOG.md](./CHANGELOG.md) — release history in Keep-a-Changelog format.
- [CONTRIBUTING.md](./CONTRIBUTING.md) — package-specific contributor notes.
- [SECURITY.md](./SECURITY.md) — package-specific security surface notes.
- [LICENSE](./LICENSE) — Apache-2.0, copyright Manya Hael Foundation.

---

## License

Apache-2.0. Copyright 2024 Manya Hael Foundation. All rights reserved.

Conceived, directed, and owned by **Uviwe Menyiwe (Azura Daemon)**, founder of the Manya Hael Foundation.
