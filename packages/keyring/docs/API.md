# @manya-os/keyring — API Reference

> Full TypeScript API reference for every public export of `@manya-os/keyring`.
>
> Copyright 2024 Manya Hael Foundation. All rights reserved. Licensed under the Apache License, Version 2.0.

This document is auto-curated and reflects the public API surface exported from [`src/index.ts`](../src/index.ts). Internal helpers (those marked `@internal`) are documented in source TSDoc but not repeated here.

---

## Table of contents

- [Types](#types)
- [Errors](#errors)
- [Logging](#logging)
- [Crypto — hashing](#crypto--hashing)
- [Crypto — symmetric](#crypto--symmetric)
- [Crypto — keys](#crypto--keys)
- [Crypto — signatures](#crypto--signatures)
- [Identity](#identity)
- [Roles & RBAC](#roles--rbac)
- [Access control](#access-control)
- [Wallet](#wallet)
- [Storage](#storage)
- [Credentials](#credentials)
- [Recovery — Shamir](#recovery--shamir)
- [Recovery — backups](#recovery--backups)
- [Sync](#sync)
- [Hardware](#hardware)

---

## Types

```ts
type KeyAlgorithm = 'rsa' | 'ecdsa';
type SignatureAlgorithm = 'rsa-pss' | 'ecdsa-p256';

interface EncryptionResult {
  iv: Buffer;        // 12 bytes
  ciphertext: Buffer;
  tag: Buffer;       // 16 bytes
}

interface SerializedIdentity {
  id: string;            // UUID v4
  did: string;           // did:key:z...
  publicKey: string;     // SPKI PEM
  algorithm: SignatureAlgorithm;
  createdAt: string;     // ISO-8601
  metadata: Record<string, unknown>;
}

interface CredentialProof {
  type: string;             // e.g. "manya:ecdsa-p256:2024"
  created: string;          // ISO-8601
  verificationMethod: string;  // issuer DID
  proofValue: string;       // hex signature
  algorithm: SignatureAlgorithm;
}

interface VerifiableCredential {
  id: string;
  issuer: string;
  subject: string;
  claims: Record<string, unknown>;
  issuedAt: string;
  expiresAt?: string;
  proof: CredentialProof;
}

interface EncryptedBackup {
  version: number;
  salt: string;
  iv: string;
  ciphertext: string;
  tag: string;
  createdAt: string;
  iterations: number;
}

interface EncryptedWalletBlob extends EncryptedBackup {
  kind: 'manya-keyring-wallet';
}

interface SyncBundle {
  version: number;
  sourceDid: string;
  timestamp: string;
  sequence: number;
  identity: SerializedIdentity;
  credentials: VerifiableCredential[];
  proof: { type: string; algorithm: SignatureAlgorithm; value: string };
}

interface SyncApplyResult {
  applied: string[];
  conflicts: string[];
  skipped: string[];
}

interface EnforcementResult {
  allowed: boolean;
  reason: string;
  resource?: string;
  action?: string;
}

interface KeyringWalletOptions {
  storage?: EncryptedStorage;
  hardwareProvider?: HardwareKeyProvider;
  logger?: Logger;
}
```

---

## Errors

All errors extend `KeyringError`, which extends `Error`. Each subclass carries a stable `code` string.

```ts
class KeyringError extends Error {
  readonly code: string;
  readonly cause?: unknown;
}

class KeyGenerationError extends KeyringError { /* code: 'KEY_GENERATION_ERROR' */ }
class SignatureError       extends KeyringError { /* code: 'SIGNATURE_ERROR' */ }
class VerificationError    extends KeyringError { /* code: 'VERIFICATION_ERROR' */ }
class EncryptionError      extends KeyringError { /* code: 'ENCRYPTION_ERROR' */ }
class DecryptionError      extends KeyringError { /* code: 'DECRYPTION_ERROR' */ }
class StorageError         extends KeyringError { /* code: 'STORAGE_ERROR' */ }
class AccessDeniedError    extends KeyringError { /* code: 'ACCESS_DENIED_ERROR' */ }
class CredentialError      extends KeyringError { /* code: 'CREDENTIAL_ERROR' */ }
class SyncError            extends KeyringError { /* code: 'SYNC_ERROR' */ }
class BackupError          extends KeyringError { /* code: 'BACKUP_ERROR' */ }
class RecoveryError        extends KeyringError { /* code: 'RECOVERY_ERROR' */ }
class HardwareKeyError     extends KeyringError { /* code: 'HARDWARE_KEY_ERROR' */ }
```

Example:

```ts
import { KeyringError, DecryptionError } from '@manya-os/keyring';

try {
  await wallet.importEncrypted(blob, 'wrong-passphrase');
} catch (err) {
  if (err instanceof DecryptionError) {
    console.error('wrong passphrase');
  } else if (err instanceof KeyringError) {
    console.error('other keyring error:', err.code);
  }
}
```

---

## Logging

```ts
interface Logger {
  debug(msg: string, meta?: Record<string, unknown>): void;
  info(msg: string, meta?: Record<string, unknown>): void;
  warn(msg: string, meta?: Record<string, unknown>): void;
  error(msg: string, meta?: Record<string, unknown>): void;
}

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

class ConsoleLogger implements Logger {
  constructor(level?: LogLevel);
}

class SilentLogger implements Logger {}

const SCRUBBED_FIELD_NAMES: readonly string[]; // ['privateKey','password','passphrase','token','secret','credential','iv','tag','share']

function shouldScrubField(name: string): boolean;
function scrubMetadata(meta: unknown): unknown;
```

`ConsoleLogger` writes JSON to stdout (`debug`/`info`) or stderr (`warn`/`error`), and deeply scrubs fields whose names end with any of `SCRUBBED_FIELD_NAMES` (case-insensitive). Example:

```ts
import { ConsoleLogger } from '@manya-os/keyring';

const logger = new ConsoleLogger('info');
logger.info('user:login', { userId: 'u-1', password: 'hunter2' });
// {"level":"info","msg":"user:login","ts":"...","meta":{"userId":"u-1","password":"[redacted]"}}
```

---

## Crypto — hashing

```ts
function sha256(data: Buffer | string): Buffer;
function sha512(data: Buffer | string): Buffer;
function hmac(key: Buffer, data: Buffer, algo?: 'sha256' | 'sha512'): Buffer;
function hkdf(ikm: Buffer, salt: Buffer, info: Buffer, length: number): Buffer;
function pbkdf2(
  passphrase: string | Buffer,
  salt: Buffer,
  iterations: number,
  keyLen: number,
  algo?: 'sha256' | 'sha512'
): Buffer;
function constantTimeEqual(a: Buffer, b: Buffer): boolean;
```

Example:

```ts
import { sha256, hkdf, pbkdf2 } from '@manya-os/keyring';

const masterKey = pbkdf2('my-passphrase', salt, 210_000, 32);
const subKey = hkdf(masterKey, Buffer.alloc(32), Buffer.from('manya:sync:v1'), 32);
const digest = sha256('hello keyring');
```

---

## Crypto — symmetric

```ts
const AES_256_KEY_BYTES = 32;
const AES_GCM_IV_BYTES = 12;
const AES_GCM_TAG_BYTES = 16;

function encrypt(key: Buffer, plaintext: Buffer, aad?: Buffer): EncryptionResult;
function decrypt(
  key: Buffer,
  iv: Buffer,
  ciphertext: Buffer,
  tag: Buffer,
  aad?: Buffer
): Buffer;
```

Example:

```ts
import { encrypt, decrypt, AES_256_KEY_BYTES } from '@manya-os/keyring';
import * as crypto from 'crypto';

const key = crypto.randomBytes(AES_256_KEY_BYTES);
const plain = Buffer.from('hello keyring', 'utf8');
const aad = Buffer.from('context', 'utf8');

const { iv, ciphertext, tag } = encrypt(key, plain, aad);
const recovered = decrypt(key, iv, ciphertext, tag, aad);
```

---

## Crypto — keys

```ts
const DEFAULT_RSA_MODULUS = 3072;
const DEFAULT_RSA_EXPONENT = 65537;
const DEFAULT_EC_CURVE = 'prime256v1';

interface GenerateKeyPairOptions {
  rsaModulusBits?: number;
  rsaPublicExponent?: number;
  ecCurve?: 'prime256v1';
}

interface GeneratedKeyPair {
  publicKey: crypto.KeyObject;
  privateKey: crypto.KeyObject;
  algorithm: SignatureAlgorithm;
}

function algorithmFor(algo: KeyAlgorithm): SignatureAlgorithm;
function generateKeyPair(algo: KeyAlgorithm, opts?: GenerateKeyPairOptions): GeneratedKeyPair;
function deriveKey(master: Buffer, info: Buffer | string, length: number): Buffer;
function importKeyPem(pem: string, type: 'public' | 'private'): crypto.KeyObject;
function exportKeyPem(key: crypto.KeyObject, type: 'public' | 'private'): string;
function getKeyFingerprint(publicKey: crypto.KeyObject | string): string; // 64-char hex
```

Example:

```ts
import { generateKeyPair, exportKeyPem, getKeyFingerprint } from '@manya-os/keyring';

const { publicKey, privateKey, algorithm } = generateKeyPair('ecdsa');
const pubPem = exportKeyPem(publicKey, 'public');
const privPem = exportKeyPem(privateKey, 'private');
console.log(getKeyFingerprint(publicKey)); // 64-char hex SHA-256 of SPKI DER
```

---

## Crypto — signatures

```ts
function sign(
  privateKey: crypto.KeyObject | string,
  data: Buffer,
  algo: SignatureAlgorithm
): string; // hex signature

function verify(
  publicKey: crypto.KeyObject | string,
  data: Buffer,
  signature: Buffer | string,
  algo: SignatureAlgorithm
): boolean; // false for any mismatch (does not throw)

function proofTypeFor(algo: SignatureAlgorithm): string;
```

`verify` is constant-time: it routes the OpenSSL boolean result through `crypto.timingSafeEqual` before returning.

Example:

```ts
import { generateKeyPair, sign, verify } from '@manya-os/keyring';

const { publicKey, privateKey, algorithm } = generateKeyPair('ecdsa');
const data = Buffer.from('hello', 'utf8');
const sig = sign(privateKey, data, algorithm);
console.log(verify(publicKey, data, sig, algorithm)); // true
```

---

## Identity

```ts
class Identity {
  readonly id: string;            // UUID v4
  readonly did: string;           // did:key:z...
  readonly publicKey: string;     // SPKI PEM
  readonly algorithm: SignatureAlgorithm;
  readonly createdAt: string;     // ISO-8601
  metadata: Record<string, unknown>;

  constructor(params: {
    id?: string;
    did: string;
    publicKey: string;
    algorithm: SignatureAlgorithm;
    createdAt?: string;
    metadata?: Record<string, unknown>;
  });

  static fromPublicKey(
    publicKeyPem: string,
    algorithm: SignatureAlgorithm,
    metadata?: Record<string, unknown>
  ): Identity;

  fingerprint(): string;                 // SHA-256 hex of SPKI DER
  serialize(): SerializedIdentity;
  static deserialize(data: SerializedIdentity): Identity;
  equals(other: Identity): boolean;
}

function deriveDidKey(
  publicKey: crypto.KeyObject | string,
  algorithm: SignatureAlgorithm
): string;

function base58Encode(input: Buffer): string; // Bitcoin alphabet
```

Example:

```ts
import { Identity, generateKeyPair, exportKeyPem } from '@manya-os/keyring';

const { publicKey, algorithm } = generateKeyPair('ecdsa');
const pem = exportKeyPem(publicKey, 'public');
const identity = Identity.fromPublicKey(pem, algorithm, { name: 'agent-1' });

console.log(identity.did); // did:key:z...
const restored = Identity.deserialize(identity.serialize());
console.log(restored.equals(identity)); // true
```

---

## Roles & RBAC

```ts
enum Role {
  Admin    = 'admin',
  Agent    = 'agent',
  Operator = 'operator',
  Auditor  = 'auditor',
  Guest    = 'guest',
}

const ALL_ROLES: readonly Role[];

function parseRole(value: string): Role;
function newRoleAssignmentId(): string;

class RoleManager {
  constructor(storage?: EncryptedStorage);

  assignRole(identityId: string, role: Role): Promise<void>;
  revokeRole(identityId: string, role: Role): Promise<void>;
  revokeAll(identityId: string): Promise<void>;
  hasRole(identityId: string, role: Role): Promise<boolean>;
  hasAnyRole(identityId: string, roles: readonly Role[]): Promise<boolean>;
  getRoles(identityId: string): Promise<Role[]>;
  listIdentities(): Promise<string[]>;
}
```

Example:

```ts
import { RoleManager, Role } from '@manya-os/keyring';

const rm = new RoleManager();
await rm.assignRole('id-1', Role.Admin);
await rm.assignRole('id-1', Role.Agent);
console.log(await rm.getRoles('id-1')); // [Role.Admin, Role.Agent]
await rm.revokeRole('id-1', Role.Admin);
console.log(await rm.hasRole('id-1', Role.Admin)); // false
```

---

## Access control

```ts
interface AccessPolicy {
  resource: string;
  action: string;
  allow: Role[];
  deny?: Role[];
  description?: string;
}

function matchResource(pattern: string, value: string): boolean;

class AccessPolicySet {
  add(policy: AccessPolicy): void;
  remove(resource: string, action: string): boolean;
  get(resource: string, action: string): AccessPolicy | undefined;
  match(resource: string, action: string): AccessPolicy | undefined;
  list(): AccessPolicy[];
  replaceAll(policies: AccessPolicy[]): void;
  get size(): number;
}

function defaultPolicySet(): AccessPolicySet;

class AccessEnforcer {
  constructor(roles: RoleManager, policies: AccessPolicySet);

  enforce(
    identityId: string,
    resource: string,
    action: string
  ): Promise<EnforcementResult>;

  enforceOrThrow(
    identityId: string,
    resource: string,
    action: string
  ): Promise<EnforcementResult>; // throws AccessDeniedError on denial

  inspect(resource: string, action: string): AccessPolicy | undefined;
}
```

Decision algorithm:

1. Resolve caller roles via `RoleManager.getRoles`.
2. Look up the most-specific matching policy. If none matches, **deny**.
3. If any caller role is in `policy.deny`, **deny** (deny takes precedence).
4. If any caller role is in `policy.allow`, **allow**.
5. Otherwise **deny**.

Example:

```ts
import { RoleManager, AccessEnforcer, defaultPolicySet, Role } from '@manya-os/keyring';

const rm = new RoleManager();
const enforcer = new AccessEnforcer(rm, defaultPolicySet());

await rm.assignRole('user-1', Role.Agent);
const r = await enforcer.enforce('user-1', 'wallet:credential', 'issue');
console.log(r.allowed, r.reason);
```

---

## Wallet

```ts
const WALLET_PBKDF2_ITERATIONS = 210_000;
const WALLET_SALT_BYTES = 16;
const WALLET_MASTER_KEY_BYTES = 32;

class KeyringWallet {
  readonly roles: RoleManager;
  readonly policies: AccessPolicySet;
  readonly access: AccessEnforcer;

  constructor(opts?: KeyringWalletOptions);

  // Identity management
  createIdentity(
    algo?: KeyAlgorithm,
    metadata?: Record<string, unknown>
  ): Promise<Identity>;
  importIdentity(
    publicKeyPem: string,
    privateKey: crypto.KeyObject,
    algorithm: SignatureAlgorithm,
    metadata?: Record<string, unknown>
  ): Promise<Identity>;
  listIdentities(): Identity[];
  getIdentity(identityId: string): Identity | undefined;
  getPrimaryIdentity(): Identity | undefined;
  setPrimaryIdentity(identityId: string): void;

  // Credential management
  issueCredential(
    subjectDid: string,
    claims: Record<string, unknown>,
    opts?: {
      issuerIdentityId?: string;
      expiresAt?: string;
      id?: string;
    }
  ): Promise<VerifiableCredential>;
  addCredential(credential: VerifiableCredential): Promise<void>;
  listCredentials(): VerifiableCredential[];
  getCredential(id: string): VerifiableCredential | undefined;
  deleteCredential(id: string): boolean;

  // Signing
  sign(
    data: Buffer,
    identityId?: string
  ): Promise<{ algorithm: SignatureAlgorithm; signature: string }>;
  signViaProvider(
    data: Buffer,
    identityId?: string
  ): Promise<{ algorithm: SignatureAlgorithm; signature: string }>;
  verify(
    data: Buffer,
    signature: Buffer | string,
    opts?: {
      identityId?: string;
      publicKey?: crypto.KeyObject | string;
      algorithm?: SignatureAlgorithm;
    }
  ): Promise<boolean>;
  verifyCredential(
    credential: VerifiableCredential,
    issuerIdentityId?: string
  ): Promise<boolean>;

  // Encrypted export / import
  exportEncrypted(passphrase: string): Promise<EncryptedWalletBlob>;
  importEncrypted(blob: EncryptedWalletBlob, passphrase: string): Promise<void>;

  // Role helpers
  assignRole(identityId: string, role: Role): Promise<void>;
  revokeRole(identityId: string, role: Role): Promise<void>;

  // Sequence counter (for sync)
  getSequence(): number;
  bumpSequence(): number;
}
```

Example — full lifecycle:

```ts
import { KeyringWallet, Role } from '@manya-os/keyring';

const wallet = new KeyringWallet();
const id = await wallet.createIdentity('ecdsa', { name: 'agent-1' });
await wallet.assignRole(id.id, Role.Admin);

const cred = await wallet.issueCredential('did:key:zsub', { role: 'operator' });
const { signature } = await wallet.sign(Buffer.from('hello', 'utf8'));

const blob = await wallet.exportEncrypted('passphrase');
const wallet2 = new KeyringWallet();
await wallet2.importEncrypted(blob, 'passphrase');
console.log(wallet2.listCredentials().length); // 1
```

---

## Storage

```ts
interface EncryptedStorage {
  get(key: string): Promise<Buffer | null>;
  put(key: string, value: Buffer): Promise<void>;
  delete(key: string): Promise<void>;
  list(prefix?: string): Promise<string[]>;
}

class InMemoryStorage implements EncryptedStorage {
  get size(): number;
  clear(): void;
}

class FileStorage implements EncryptedStorage {
  constructor(dirPath: string);
  ensureInitialized(): Promise<void>;
}

function assertValidKey(key: string): void; // throws StorageError on invalid key
```

`FileStorage` writes are atomic (write to `.tmp` → `fsync` → `rename`). Storage keys may contain `A-Za-z0-9:_-.` and must not contain `..` (path traversal). The `:` separator is mapped to a directory hierarchy on disk.

Example:

```ts
import { FileStorage, KeyringWallet } from '@manya-os/keyring';

const storage = new FileStorage('./.manya/keyring');
await storage.ensureInitialized();
const wallet = new KeyringWallet({ storage });
```

---

## Credentials

```ts
function issueCredential(params: {
  issuer: string;
  issuerPrivateKey: crypto.KeyObject | string;
  algorithm: SignatureAlgorithm;
  subject: string;
  claims: Record<string, unknown>;
  id?: string;
  issuedAt?: string;
  expiresAt?: string;
}): VerifiableCredential;

function verifyCredential(
  credential: VerifiableCredential,
  issuerPublicKey: crypto.KeyObject | string
): boolean;

function validateCredential(
  credential: VerifiableCredential,
  now?: Date | string
): boolean;

function canonicalCredentialBytes(credential: VerifiableCredential): Buffer;
```

`canonicalCredentialBytes` produces a stable JSON encoding (sorted keys, `proof` field stripped) that is signed at issuance and verified at verification. Round-trips through any JSON serialization preserve the signature as long as the canonical bytes are unchanged.

Example:

```ts
import { issueCredential, verifyCredential, generateKeyPair } from '@manya-os/keyring';

const { privateKey, publicKey, algorithm } = generateKeyPair('ecdsa');

const cred = issueCredential({
  issuer: 'did:key:zissuer',
  issuerPrivateKey: privateKey,
  algorithm,
  subject: 'did:key:zsubject',
  claims: { role: 'operator' },
});

console.log(verifyCredential(cred, publicKey)); // true
```

---

## Recovery — Shamir

```ts
function shamirSplit(secret: Buffer, k: number, n: number): Buffer[];
function shamirCombine(shares: Buffer[]): Buffer;
function verifySharesConsistent(shares: Buffer[], k: number): boolean;

// GF(2^8) primitives (exposed for audit / advanced use).
function gfMul(a: number, b: number): number;
function gfDiv(a: number, b: number): number;
function gfEval(coeffs: Uint8Array, x: number): number;
```

Real Shamir Secret Sharing over GF(2⁸) with the AES polynomial `0x11b` and primitive generator `α = 3`. Each byte of the secret is shared independently using a fresh random polynomial of degree `k - 1`. Share format: 1-byte x-coordinate (1..255) followed by one y-byte per secret byte.

Constraints: `2 ≤ k ≤ n ≤ 255`. The secret must be non-empty.

Example:

```ts
import { shamirSplit, shamirCombine } from '@manya-os/keyring';
import * as crypto from 'crypto';

const secret = crypto.randomBytes(32);
const shares = shamirSplit(secret, 3, 5);

// Any 3 of the 5 shares suffice.
const recovered = shamirCombine([shares[0], shares[2], shares[4]]);
console.log(recovered.equals(secret)); // true
```

---

## Recovery — backups

```ts
const BACKUP_VERSION = 1;

interface BackupPayload {
  version: number;
  backupId: string;
  createdAt: string;
  primaryIdentityId: string | null;
  identities: SerializedIdentity[];
  credentials: VerifiableCredential[];
}

interface RestoredBackup {
  payload: BackupPayload;
}

function createBackup(
  wallet: KeyringWallet,
  passphrase: string
): EncryptedBackup;

function restoreBackup(
  blob: EncryptedBackup,
  passphrase: string
): RestoredBackup;
```

Backups contain **only public identity + credentials**. NO raw private key is included. The backup is encrypted with AES-256-GCM under a key derived from the passphrase via PBKDF2 (210k iterations, SHA-512).

Example:

```ts
import { createBackup, restoreBackup } from '@manya-os/keyring';

const blob = createBackup(wallet, 'backup-passphrase');
const { payload } = restoreBackup(blob, 'backup-passphrase');
console.log(payload.credentials.length);
```

---

## Sync

```ts
class MultiDeviceSync {
  createSyncBundle(
    wallet: KeyringWallet,
    signerIdentityId?: string
  ): SyncBundle;

  applySyncBundle(
    wallet: KeyringWallet,
    bundle: SyncBundle,
    sourcePublicKey: crypto.KeyObject | string
  ): Promise<SyncApplyResult>;

  validateBundle(
    bundle: SyncBundle,
    sourcePublicKey: crypto.KeyObject | string
  ): boolean;
}

function buildBundleFromParts(
  parts: {
    sourceDid: string;
    timestamp: string;
    sequence: number;
    identity: SerializedIdentity;
    credentials: VerifiableCredential[];
  },
  privateKey: crypto.KeyObject,
  algorithm: SignatureAlgorithm
): SyncBundle;
```

`createSyncBundle` produces a signed bundle containing the wallet's primary identity + all credentials + timestamp + sequence number. The bundle is signed with the primary identity's private key.

`applySyncBundle` verifies the signature against `sourcePublicKey`, then applies the bundle to the target wallet:

- If a credential with the same `id` already exists locally with the same `proofValue`, it's **skipped**.
- If a credential with the same `id` exists with a different `proofValue`, it's flagged as a **conflict** and skipped (local state preserved).
- Otherwise the credential is **applied** (added).
- The local sequence counter is bumped forward to match the bundle's sequence if it's behind.

Example:

```ts
import { MultiDeviceSync } from '@manya-os/keyring';

const sync = new MultiDeviceSync();
const bundle = sync.createSyncBundle(walletA);
const result = await sync.applySyncBundle(walletB, bundle, idA.publicKey);
console.log(result.applied, result.skipped, result.conflicts);
```

---

## Hardware

```ts
interface GeneratedHardwareKey {
  keyId: string;
  publicKeyPem: string;
  algorithm: SignatureAlgorithm;
}

interface HardwareKeyProvider {
  isAvailable(): boolean;
  generateKeyPair(
    algo: KeyAlgorithm,
    keyIdHint?: string
  ): Promise<GeneratedHardwareKey>;
  sign(keyId: string, data: Buffer): Promise<Buffer>;
  verify(keyId: string, data: Buffer, signature: Buffer): Promise<boolean>;
  deleteKey?(keyId: string): Promise<void>;
  hasKey?(keyId: string): Promise<boolean>;
}

class SoftwareKeyProvider implements HardwareKeyProvider {
  isAvailable(): boolean;
  generateKeyPair(algo: KeyAlgorithm, keyIdHint?: string): Promise<GeneratedHardwareKey>;
  sign(keyId: string, data: Buffer): Promise<Buffer>;
  verify(keyId: string, data: Buffer, signature: Buffer): Promise<boolean>;
  deleteKey(keyId: string): Promise<void>;
  hasKey(keyId: string): Promise<boolean>;

  // Software-specific helpers (used internally by KeyringWallet):
  replaceKey(keyId: string, privateKey: crypto.KeyObject): void;
  getPrivateKey(keyId: string): crypto.KeyObject | undefined;
  getPublicKey(keyId: string): crypto.KeyObject | undefined;
  getAlgorithm(keyId: string): SignatureAlgorithm | undefined;
  importExistingKey(
    publicKey: crypto.KeyObject,
    privateKey: crypto.KeyObject,
    algorithm: SignatureAlgorithm,
    keyIdHint?: string
  ): string;
  get size(): number;
  clear(): void;
}

function algorithmFor(algo: KeyAlgorithm): SignatureAlgorithm;
```

The default `SoftwareKeyProvider` keeps keys in process memory. To bind keys to a TPM, Secure Enclave, HSM, or WebAuthn authenticator, implement the `HardwareKeyProvider` interface and pass it to `KeyringWallet`.

Example — custom hardware provider:

```ts
import { KeyringWallet, type HardwareKeyProvider } from '@manya-os/keyring';

class MyTpmProvider implements HardwareKeyProvider {
  isAvailable() { return true; }
  async generateKeyPair(algo, keyIdHint) { /* ... TPM calls ... */ }
  async sign(keyId, data) { /* ... TPM calls ... */ }
  async verify(keyId, data, sig) { /* ... TPM calls ... */ }
}

const wallet = new KeyringWallet({ hardwareProvider: new MyTpmProvider() });
```

---

*End of API reference. For release notes, see [CHANGELOG.md](../CHANGELOG.md). For security disclosures, see [SECURITY.md](../SECURITY.md).*
