# @manya-os/attest — API Reference

Complete TypeScript API reference for `@manya-os/attest` v1.0.0.

> Copyright 2024 Manya Hael Foundation. All rights reserved.
> Conceived, directed, and owned by **Uviwe Menyiwe (Azura Daemon)**, founder of the Manya Hael Foundation.
> Licensed under the Apache License, Version 2.0.

## Table of contents

- [Types](#types)
- [Errors](#errors)
- [Logging](#logging)
- [Crypto](#crypto)
  - [Hashing](#hashing)
  - [Keys](#keys)
  - [Signatures](#signatures)
- [Fingerprint](#fingerprint)
- [Challenge](#challenge)
- [Session](#session)
- [Hardware](#hardware)
- [Remote attestation](#remote-attestation)
- [Trust](#trust)
- [Workflow](#workflow)

---

## Types

### `KeyAlgorithm`

```typescript
type KeyAlgorithm = 'rsa' | 'ecdsa';
```

Supported key algorithms. `rsa` produces 3072-bit RSA-PSS keys; `ecdsa` produces ECDSA keys over NIST P-256.

### `SignatureAlgorithm`

```typescript
type SignatureAlgorithm = 'rsa-pss' | 'ecdsa-p256';
```

### `DeviceSignals`

```typescript
interface DeviceSignals {
  cpus: number;
  arch: string;
  platform: string;
  hostname: string;
  macs: string[];            // lowercased 12-char hex, no separators
  totalmem: number;
  nodeVersion: string;
  release: string;
  machineId?: string;
}
```

PII-free hardware/OS signals. NEVER includes username, home dir, or env.

### `RedactedDeviceSignals`

```typescript
interface RedactedDeviceSignals {
  cpus: number;
  arch: string;
  platform: string;
  hostname: string;
  macs: string;              // e.g. "[2 mac(s) redacted]"
  totalmem: number;
  nodeVersion: string;
  release: string;
  machineId: string;         // "[redacted]" or ""
}
```

### `FingerprintComparison`

```typescript
interface FingerprintComparison {
  match: boolean;
  drift: number;            // 0..1, lower = more similar
}
```

### `Challenge`

```typescript
interface Challenge {
  nonce: string;
  challenge: string;        // base64-encoded random bytes
  issuedAt: string;         // ISO-8601
  expiresAt: string;        // ISO-8601
}
```

### `SignedChallengeResponse`

```typescript
interface SignedChallengeResponse {
  nonce: string;
  signature: string;        // hex
  algorithm: SignatureAlgorithm;
  signedAt: string;         // ISO-8601
  publicKeyFingerprint: string;  // 64-char hex SHA-256
}
```

### `Session`

```typescript
interface Session {
  token: string;            // 64-char hex
  sessionId: string;        // UUID v4
  createdAt: string;
  expiresAt: string;
  fingerprint: string;
  identity: string;
  trustScore: number;       // 0..1
}
```

### `SessionRecord`

```typescript
interface SessionRecord extends Session {
  boundNonce?: string;
}
```

### `HardwareProbe`

```typescript
interface HardwareProbe {
  tpm: boolean;
  secureEnclave: boolean;
  tee: boolean;
  details: string;
}
```

### `AttestationQuote`

```typescript
interface AttestationQuote {
  version: number;          // 1
  deviceFingerprint: string;
  measurements: Record<string, string>;
  timestamp: string;        // ISO-8601
  nonce: string;
  signature: string;        // hex
  algorithm: SignatureAlgorithm;
  hardware?: HardwareProbe;
}
```

### `TrustFactors`

```typescript
interface TrustFactors {
  fingerprintStability: number;  // 0..1
  hardware: number;              // 0..1
  attestation: number;           // 0..1
  sessionAge: number;            // 0..1
  priorInteractions: number;     // 0..1
}
```

Also used as the weights vector for `TrustEvaluator`.

### `TrustScore`

```typescript
interface TrustScore {
  score: number;            // 0..1
  factors: TrustFactors;
  decision: 'trust' | 'challenge' | 'reject';
}
```

### `AuthPolicy`

```typescript
interface AuthPolicy {
  requireHardwareAttestation: boolean;
  minTrustScore: number;
  sessionTtlMs: number;
  allowedFingerprintDrift: number;
  attestationFreshnessMs: number;
}
```

### `AuthenticationResult`

```typescript
interface AuthenticationResult {
  success: boolean;
  trust: TrustScore;
  session?: Session;
  reason?: string;
}
```

---

## Errors

All errors extend `AttestError` (which extends `Error`). Each carries a stable `code` string.

```typescript
class AttestError extends Error {
  readonly code: string;
  readonly cause?: unknown;
}

class FingerprintError extends AttestError {}        // code: 'FINGERPRINT_ERROR'
class ChallengeError extends AttestError {}           // code: 'CHALLENGE_ERROR'
class SessionError extends AttestError {}             // code: 'SESSION_ERROR'
class HardwareValidationError extends AttestError {}  // code: 'HARDWARE_VALIDATION_ERROR'
class AttestationError extends AttestError {}         // code: 'ATTESTATION_ERROR'
class WorkflowError extends AttestError {}            // code: 'WORKFLOW_ERROR'
class TrustEvaluationError extends AttestError {}     // code: 'TRUST_EVALUATION_ERROR'
class NonceError extends AttestError {}               // code: 'NONCE_ERROR'
```

```typescript
import { AttestError, FingerprintError } from '@manya-os/attest';
try { /* ... */ } catch (e) {
  if (e instanceof FingerprintError) { /* ... */ }
}
```

---

## Logging

### `Logger` (interface)

```typescript
interface Logger {
  debug(msg: string, meta?: Record<string, unknown>): void;
  info(msg: string, meta?: Record<string, unknown>): void;
  warn(msg: string, meta?: Record<string, unknown>): void;
  error(msg: string, meta?: Record<string, unknown>): void;
}
```

### `LogLevel`

```typescript
type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';
```

### `ConsoleLogger`

```typescript
class ConsoleLogger implements Logger {
  constructor(level?: LogLevel);
}
```

JSON output to stdout (debug/info) or stderr (warn/error). Secrets are scrubbed from metadata via `scrubMetadata`. Scrubbed field names: `privateKey`, `password`, `passphrase`, `token`, `secret`, `credential`, `iv`, `tag`, `share`, `nonce`, `signature`, `macs`, `machineId`.

### `SilentLogger`

```typescript
class SilentLogger implements Logger { /* all methods are no-ops */ }
```

### `scrubMetadata(meta)`

```typescript
function scrubMetadata(meta: unknown): unknown;
```

Deeply clones and scrubs a metadata object. Buffers become `[buffer:N]`. Sensitive fields become `[redacted]`.

### `shouldScrubField(name)`

```typescript
function shouldScrubField(name: string): boolean;
```

Returns true if a field name should be scrubbed (case-insensitive suffix match against `SCRUBBED_FIELD_NAMES`).

### `SCRUBBED_FIELD_NAMES`

```typescript
const SCRUBBED_FIELD_NAMES: readonly string[];
```

---

## Crypto

Self-contained. Does NOT import `@manya-os/keyring`.

### Hashing

```typescript
function sha256(data: Buffer | string): Buffer;
function sha512(data: Buffer | string): Buffer;
function hmac(key: Buffer, data: Buffer, algo?: 'sha256' | 'sha512'): Buffer;
function secureRandom(n: number): Buffer;        // CSPRNG, 1..1MiB
function constantTimeEqual(a: Buffer, b: Buffer): boolean;
function randomToken(bytes?: number): string;    // hex
function uuid(): string;                         // RFC-4122 v4
```

```typescript
import { sha256, secureRandom, constantTimeEqual } from '@manya-os/attest';
const h = sha256('hello');
const r = secureRandom(32);
constantTimeEqual(h, r);  // → false (different lengths)
```

### Keys

```typescript
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

function generateKeyPair(algo: KeyAlgorithm, opts?: GenerateKeyPairOptions): GeneratedKeyPair;
function importKeyPem(pem: string, type: 'public' | 'private'): crypto.KeyObject;
function exportKeyPem(key: crypto.KeyObject, type: 'public' | 'private'): string;
function getKeyFingerprint(publicKey: crypto.KeyObject | string): string;  // 64-char hex
function algorithmFor(algo: KeyAlgorithm): SignatureAlgorithm;
function algorithmForKey(key: crypto.KeyObject): SignatureAlgorithm;
```

```typescript
import { generateKeyPair, exportKeyPem, getKeyFingerprint } from '@manya-os/attest';
const kp = generateKeyPair('ecdsa');
const pem = exportKeyPem(kp.publicKey, 'public');
const fp = getKeyFingerprint(pem);  // 64-char hex
```

### Signatures

```typescript
function sign(
  privateKey: crypto.KeyObject | string,
  data: Buffer,
  algo?: SignatureAlgorithm
): string;  // hex

function verify(
  publicKey: crypto.KeyObject | string,
  data: Buffer,
  signature: Buffer | string,
  algo?: SignatureAlgorithm
): boolean;  // constant-time

function signForChallenge(privateKey, data, algo?): string;  // throws ChallengeError
function signForAttestation(privateKey, data, algo?): string;  // throws AttestationError
function proofTypeFor(algo: SignatureAlgorithm): string;  // 'manya:rsa-pss:2024' | 'manya:ecdsa-p256:2024'
```

If `algo` is omitted, it is inferred from the key type: RSA keys → `rsa-pss`, EC (P-256) keys → `ecdsa-p256`.

```typescript
import { generateKeyPair, sign, verify } from '@manya-os/attest';
const kp = generateKeyPair('ecdsa');
const data = Buffer.from('hello', 'utf8');
const sig = sign(kp.privateKey, data);
verify(kp.publicKey, data, sig);  // → true
```

---

## Fingerprint

### `collectDeviceSignals()`

```typescript
function collectDeviceSignals(): DeviceSignals;
```

Collects PII-free hardware/OS signals. Every collection step is wrapped in try/catch. Guaranteed fields: `cpus`, `arch`, `platform`, `totalmem`, `nodeVersion`.

### `redactSignals(signals)`

```typescript
function redactSignals(signals: DeviceSignals): RedactedDeviceSignals;
```

Returns a log-safe view: `macs` becomes a count marker (`[N mac(s) redacted]`), `machineId` becomes `[redacted]` or `''`.

### `deriveDeviceId(signals)`

```typescript
function deriveDeviceId(signals: DeviceSignals): string;  // 16-char hex
```

Stable opaque device id (NOT the fingerprint — a short correlation id).

### `stableStringify(value)`

```typescript
function stableStringify(value: unknown): string;
```

Stable JSON with sorted keys, no insignificant whitespace.

### `newCorrelationId()`

```typescript
function newCorrelationId(): string;  // UUID v4
```

### `DeviceFingerprint` (class)

```typescript
class DeviceFingerprint {
  static fromSignals(signals: DeviceSignals): DeviceFingerprint;
  static fromString(hash: string): DeviceFingerprint;  // 64-char hex
  compare(other: DeviceFingerprint): FingerprintComparison;  // constant-time
  equals(other: DeviceFingerprint): boolean;
  toString(): string;   // 64-char hex
  valueOf(): string;    // 64-char hex
}
```

```typescript
import { collectDeviceSignals, DeviceFingerprint } from '@manya-os/attest';
const fp1 = DeviceFingerprint.fromSignals(collectDeviceSignals());
const fp2 = DeviceFingerprint.fromString(fp1.toString());
fp1.compare(fp2);  // → { match: true, drift: 0 }
```

---

## Challenge

### `NonceStore` (class)

```typescript
class NonceStore {
  constructor(defaultTtlMs?: number, defaultBytes?: number);
  issue(opts?: NonceIssueOptions): string;
  consume(nonce: string, opts?: { skipConsumeOnExpiry?: boolean }): boolean;
  isValid(nonce: string): boolean;
  cleanup(): number;   // returns # of records removed
  size(): number;      // # of valid (unconsumed, unexpired) nonces
  clear(): void;
}
```

Single-use, TTL-aware. `consume` returns `false` for unknown / consumed / expired nonces. Default TTL: 5 minutes.

### `generateChallenge(opts?)`

```typescript
function generateChallenge(opts?: GenerateChallengeOptions): Challenge;
```

Default TTL: 60s. Default bytes: 32.

### `decodeChallenge(challenge)`

```typescript
function decodeChallenge(challenge: string): Buffer;
```

Base64 → Buffer. Throws `ChallengeError` on invalid input.

### `signChallenge(privateKey, challenge, algo?)`

```typescript
function signChallenge(
  privateKey: crypto.KeyObject | string,
  challenge: Challenge,
  algo?: SignatureAlgorithm
): SignedChallengeResponse;
```

Signs the raw challenge bytes. The response includes the echoed nonce, the signature, the algorithm, the signing timestamp, and the prover's public key fingerprint.

### `verifyResponse(publicKey, challenge, response, expectedNonce)`

```typescript
function verifyResponse(
  publicKey: crypto.KeyObject | string,
  challenge: Challenge,
  response: SignedChallengeResponse,
  expectedNonce: string
): boolean;
```

Checks nonce match (constant-time) + signature verification. Returns `false` (not throw) for any verification failure.

### `isChallengeExpired(challenge, now?)`

```typescript
function isChallengeExpired(challenge: Challenge, now?: number): boolean;
```

---

## Session

### `SessionStore` (interface)

```typescript
interface SessionStore {
  get(token: string): Promise<SessionRecord | null>;
  put(record: SessionRecord): Promise<void>;
  delete(token: string): Promise<boolean>;
  list(): Promise<SessionRecord[]>;
}
```

### `InMemorySessionStore` (class)

```typescript
class InMemorySessionStore implements SessionStore {
  get(token): Promise<SessionRecord | null>;
  put(record): Promise<void>;
  delete(token): Promise<boolean>;
  list(): Promise<SessionRecord[]>;
  clear(): void;
}
```

Makes defensive copies on `put` / `get`.

### `SessionManager` (class)

```typescript
const DEFAULT_SESSION_TTL_MS = 60 * 60 * 1000;
const SESSION_TOKEN_BYTES = 32;

class SessionManager {
  constructor(store?: SessionStore, defaultTtlMs?: number);
  establish(fingerprint: string, identity: string, opts?: EstablishSessionOptions): Promise<Session>;
  verify(token: string): Promise<Session | null>;
  revoke(token: string): Promise<boolean>;
  refresh(token: string, ttlMs?: number): Promise<Session>;
  list(): Promise<Session[]>;
  reap(): Promise<number>;   // removes expired, returns count
}

interface EstablishSessionOptions {
  ttlMs?: number;
  boundNonce?: string;
  trustScore?: number;       // default 1.0
}
```

```typescript
import { SessionManager } from '@manya-os/attest';
const mgr = new SessionManager();
const s = await mgr.establish('fp', 'did:key:zabc', { trustScore: 0.9 });
const verified = await mgr.verify(s.token);
await mgr.refresh(s.token);
await mgr.revoke(s.token);
```

---

## Hardware

### `HardwareValidator` (class)

```typescript
class HardwareValidator {
  probe(): HardwareProbe;                 // never throws
  isAnyHardwarePresent(): boolean;
}

function requireHardwareOrThrow(validator: HardwareValidator): HardwareProbe;
```

Platform probes:

- **Linux**: `/dev/tpm*`, `/sys/class/tpm/`, `/sys/class/misc/tpm0/device/`, `/sys/class/tpm/tpm0/tpm_version_major`, `/dev/sgx*`, `/dev/tee*`, `/sys/class/tee`, `/sys/module/kvm_amd/parameters/sev_es`, `/proc/cpuinfo` (for `sgx`/`sev` flags).
- **macOS**: `ioreg` for `IOPlatformUUID` / `AppleSecureEnclave` / `secure_enclave` / `SEP`; `system_profiler SPiBridgeDataType` for Apple T2 / Apple Silicon.
- **Windows**: `reg query "HKLM\\SYSTEM\\CurrentControlSet\\Services\\TPM\\WMI\\Admin" /v SpecVersion`; `powershell Get-Tpm`; `powershell Get-CimInstance Win32_DeviceGuard` for VBS.

### `HardwareAttestationProvider` (interface)

```typescript
interface HardwareAttestationProvider {
  readonly name: string;
  isAvailable(): boolean | Promise<boolean>;
  attest(data: Buffer, nonce: string): Promise<AttestationQuote>;
  verifyQuote(quote: AttestationQuote, publicKey?: crypto.KeyObject | string): Promise<boolean>;
}
```

### `SoftwareAttestationProvider` (class)

```typescript
class SoftwareAttestationProvider implements HardwareAttestationProvider {
  readonly name = 'software';
  constructor(opts?: {
    algorithm?: 'rsa' | 'ecdsa';
    privateKey?: crypto.KeyObject | string;
    publicKey?: crypto.KeyObject | string;
    hardware?: HardwareValidator;
  });
  isAvailable(): boolean;
  attest(data: Buffer, nonce: string): Promise<AttestationQuote>;
  verifyQuote(quote: AttestationQuote, publicKey?): Promise<boolean>;
  getPublicKeyPem(): string;
  getPublicKeyFingerprint(): string;
  getAlgorithm(): SignatureAlgorithm;
}
```

A development / testing / low-assurance fallback that signs with a local software key. **Provides NO hardware guarantees.** Always available.

### `canonicalQuoteBytes(quote)`

```typescript
function canonicalQuoteBytes(quote: Omit<AttestationQuote, 'signature'>): Buffer;
```

Computes the canonical signed bytes (stable JSON, sorted keys).

---

## Remote attestation

### Quote format

```typescript
const ATTESTATION_QUOTE_VERSION = 1;

function validateQuote(quote: unknown): asserts quote is AttestationQuote;
function serializeQuote(quote: AttestationQuote): Buffer;
function deserializeQuote(buf: Buffer | string): AttestationQuote;
```

### `produceAttestation(...)`

```typescript
function produceAttestation(
  privateKey: crypto.KeyObject | string,
  deviceFingerprint: string,
  measurements: Record<string, string>,
  nonce: string,
  opts?: {
    algorithm?: SignatureAlgorithm;
    timestamp?: string;
    hardware?: HardwareProbe;
  }
): AttestationQuote;
```

Signs the canonical bytes of `{ version, deviceFingerprint, measurements, timestamp, nonce, algorithm, hardware? }`.

### `verifyAttestation(...)`

```typescript
function verifyAttestation(
  publicKey: crypto.KeyObject | string,
  quote: AttestationQuote,
  expectedNonce: string,
  opts?: {
    expectedFingerprint?: string;
    freshnessMs?: number;
    now?: number;
  }
): boolean;
```

Checks (all constant-time):

1. Freshness: `|now - quote.timestamp| <= freshnessMs` (default 5 min).
2. Nonce match: `quote.nonce === expectedNonce`.
3. Fingerprint match (if `expectedFingerprint` provided): `quote.deviceFingerprint === expectedFingerprint`.
4. Signature verification.

### Convenience helpers

```typescript
function produceAndSerializeAttestation(...): Buffer;
function deserializeAndVerifyAttestation(...): boolean;

const DEFAULT_ATTESTATION_FRESHNESS_MS = 5 * 60 * 1000;
```

```typescript
import { generateKeyPair, produceAttestation, verifyAttestation } from '@manya-os/attest';
const kp = generateKeyPair('ecdsa');
const quote = produceAttestation(kp.privateKey, 'device-fp', { v: '1' }, 'nonce-123');
const ok = verifyAttestation(kp.publicKey, quote, 'nonce-123', { expectedFingerprint: 'device-fp' });
```

---

## Trust

### Constants

```typescript
const DEFAULT_FACTOR_WEIGHTS: TrustFactors = {
  fingerprintStability: 0.30,
  hardware: 0.20,
  attestation: 0.30,
  sessionAge: 0.10,
  priorInteractions: 0.10,
};
const TRUST_DECISION_THRESHOLD = 0.7;
const CHALLENGE_DECISION_THRESHOLD = 0.3;
```

### `TrustEvaluator` (class)

```typescript
class TrustEvaluator {
  constructor(weights?: TrustFactors);
  getWeights(): TrustFactors;
  evaluate(inputs: TrustEvaluationInputs): TrustScore;
  evaluateFromFactors(factors: TrustFactors): TrustScore;
  factorize(inputs: TrustEvaluationInputs): TrustFactors;
}

const defaultTrustEvaluator: TrustEvaluator;
```

### `TrustEvaluationInputs`

```typescript
interface TrustEvaluationInputs {
  fingerprintDrift: number;       // 0..1
  hardwarePresent: boolean;
  attestationValid: boolean;
  sessionAgeMs: number;
  priorInteractions: number;
}
```

### Per-factor computation

- `fingerprintStability = max(0, min(1, 1 - fingerprintDrift))`
- `hardware = hardwarePresent ? 1 : 0`
- `attestation = attestationValid ? 1 : 0`
- `sessionAge = max(0, min(1, 0.5 ^ (sessionAgeMs / 1h)))` — 1-hour half-life
- `priorInteractions = max(0, min(1, log10(1 + n) / 2))` — saturates at ~100

### Decision

- `score >= 0.7` → `trust`
- `score >= 0.3` → `challenge`
- `score < 0.3` → `reject`

### Low-level helpers

```typescript
function computeFactors(inputs): TrustFactors;
function aggregateScore(factors: TrustFactors, weights: TrustFactors): number;
function decideFromScore(score: number): 'trust' | 'challenge' | 'reject';
function buildTrustScore(inputs, weights?): TrustScore;
```

---

## Workflow

### Policies

```typescript
const DEFAULT_POLICY_SESSION_TTL_MS = 60 * 60 * 1000;
const DEFAULT_POLICY_ATTESTATION_FRESHNESS_MS = 5 * 60 * 1000;

function defaultPolicy(): AuthPolicy;
function strictPolicy(): AuthPolicy;
function buildPolicy(overrides?: Partial<AuthPolicy>): AuthPolicy;
function validatePolicy(policy: AuthPolicy): void;
```

### `AuthenticationWorkflow` (class)

```typescript
class AuthenticationWorkflow {
  readonly policy: AuthPolicy;
  constructor(opts?: AuthenticationWorkflowOptions);

  // Verifier side
  verifierIssueChallenge(ttlMs?: number): Challenge;
  verifierVerify(inputs: VerifierVerifyInputs): Promise<AuthenticationResult>;

  // Prover side
  proverRespond(challenge: Challenge, inputs: ProverRespondInputs): Promise<{
    response: SignedChallengeResponse;
    quote: AttestationQuote;
  }>;

  // Session management
  verifySession(token: string): Promise<Session | null>;
  revokeSession(token: string): Promise<boolean>;
  refreshSession(token: string, ttlMs?: number): Promise<Session>;

  // Diagnostics
  getSessionManager(): SessionManager;
  getNonceStore(): NonceStore;
}

interface AuthenticationWorkflowOptions {
  policy?: AuthPolicy;
  sessionManager?: SessionManager;
  nonceStore?: NonceStore;
  hardware?: HardwareValidator;
  trustEvaluator?: TrustEvaluator;
  logger?: Logger;
}

interface ProverRespondInputs {
  privateKey: crypto.KeyObject | string;
  deviceFingerprint: string;
  measurements?: Record<string, string>;
  hardwareProvider?: HardwareAttestationProvider;
}

interface VerifierVerifyInputs {
  publicKey: crypto.KeyObject | string;
  challenge: Challenge;
  response: SignedChallengeResponse;
  quote: AttestationQuote;
  expectedFingerprint: string;
  identity: string;
  priorInteractions?: number;
}

function createSoftwareWorkflow(opts?: AuthenticationWorkflowOptions): {
  workflow: AuthenticationWorkflow;
  provider: SoftwareAttestationProvider;
};
```

### Full workflow example

```typescript
import {
  AuthenticationWorkflow, generateKeyPair, exportKeyPem,
  collectDeviceSignals, DeviceFingerprint,
} from '@manya-os/attest';

const proverKp = generateKeyPair('ecdsa');
const proverPubPem = exportKeyPem(proverKp.publicKey, 'public');
const fingerprint = DeviceFingerprint.fromSignals(collectDeviceSignals());

const wf = new AuthenticationWorkflow();

// 1. Verifier issues a challenge.
const challenge = wf.verifierIssueChallenge();

// 2. Prover signs + produces attestation.
const { response, quote } = await wf.proverRespond(challenge, {
  privateKey: proverKp.privateKey,
  deviceFingerprint: fingerprint.toString(),
});

// 3. Verifier validates + establishes session.
const result = await wf.verifierVerify({
  publicKey: proverPubPem,
  challenge, response, quote,
  expectedFingerprint: fingerprint.toString(),
  identity: 'did:key:zprover',
});

if (result.success) {
  console.log('session:', result.session!.token);
  console.log('trust:', result.trust.score, result.trust.decision);
}
```

---

*For more, see [README.md](../README.md), [CHANGELOG.md](../CHANGELOG.md), [CONTRIBUTING.md](../CONTRIBUTING.md), and [SECURITY.md](../SECURITY.md).*
