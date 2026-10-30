# @manya-os/attest

> Device and session attestation for the **MANYA Intelligence OS** — device fingerprinting, trusted session establishment, signed challenge-response authentication, session verification, hardware validation, remote attestation, authentication workflows, and device trust evaluation.

`@manya-os/attest` is part of the MANYA Intelligence OS monorepo, conceived, directed, and owned by **Uviwe Menyiwe (Azura Daemon)**, founder of the **Manya Hael Foundation**. It is the trust layer that binds sovereign agents (provisioned by `@manya-os/keyring`) to the physical devices they run on — without ever collecting personally-identifying information.

## Vision

The MANYA Intelligence OS is a sovereign, modular, local-first intelligence operating system. An agent that runs on a laptop in Cape Town today may migrate to a server in Lagos tomorrow; an agent that performs privileged operations must prove that it is *the same* agent, on *the expected* hardware, before it is allowed to act.

`@manya-os/attest` answers three questions:

1. **Who is this device?** — `DeviceFingerprint` produces a stable SHA-256 over a PII-free vector of hardware/OS signals (CPU count, arch, platform, hostname, MACs, total memory, Node version, OS release, optional machine id).
2. **Can I prove it?** — signed challenge-response (`signChallenge` / `verifyResponse`) plus signed attestation quotes (`produceAttestation` / `verifyAttestation`) bind the prover's identity key to the device fingerprint.
3. **How much can I trust it?** — `TrustEvaluator` combines fingerprint stability, hardware presence, attestation validity, session age, and prior interactions into a `TrustScore` in `[0, 1]` with a `trust` / `challenge` / `reject` decision.

The `AuthenticationWorkflow` orchestrates all three into a single challenge → sign → attest → verify → session-establish flow.

## Features

| Area | Highlights |
| --- | --- |
| **Crypto (self-contained)** | SHA-256/512, HMAC, secure random, constant-time compare; RSA-PSS 3072 + ECDSA P-256 key generation; SPKI fingerprints; constant-time `sign` / `verify`. |
| **Device fingerprinting** | PII-free signal collection (NO username, home dir, env vars); stable SHA-256 hash; per-field drift scoring; `redactSignals` for safe logging. |
| **Challenge-response** | Fresh challenge generation with TTL; signed responses; nonce store with single-use enforcement and TTL expiry. |
| **Sessions** | Session manager with TTL (default 1h), establish / verify / revoke / refresh; pluggable `SessionStore` (in-memory or distributed); bound nonces for replay protection. |
| **Hardware validation** | Heuristic probes for TPM (Linux/Windows), Secure Enclave (macOS), TEE (SGX/SEV/TrustZone/VBS); never throws; `SoftwareAttestationProvider` fallback for dev/low-assurance. |
| **Remote attestation** | Signed `AttestationQuote` with canonical (sorted-key) bytes; freshness + nonce + fingerprint + signature verification; serialize/deserialize for transport. |
| **Trust evaluation** | Weighted, per-factor `TrustScore` in `[0, 1]`; default and strict policy presets; pluggable weights. |
| **Workflow** | `AuthenticationWorkflow` orchestrates the full flow; default and strict `AuthPolicy` presets; `createSoftwareWorkflow` convenience. |
| **Errors** | Typed hierarchy: `AttestError` base + `FingerprintError`, `ChallengeError`, `SessionError`, `HardwareValidationError`, `AttestationError`, `WorkflowError`, `TrustEvaluationError`, `NonceError`. |
| **Logging** | Structured JSON logger with secret scrubbing (`token`, `nonce`, `signature`, `macs`, `machineId`, etc.). |

## Install

```bash
npm install @manya-os/attest
# or, in the monorepo:
pnpm install
```

`@manya-os/attest` has **zero runtime dependencies** — it uses only Node.js `crypto` and built-ins (`os`, `fs`, `path`, `child_process`). It works on Node 18+.

## Quick start

### 1. Device fingerprint

```typescript
import { collectDeviceSignals, DeviceFingerprint, redactSignals } from '@manya-os/attest';

const signals = collectDeviceSignals();
const fp = DeviceFingerprint.fromSignals(signals);

console.log('fingerprint:', fp.toString());
// → 64-char hex SHA-256

console.log('redacted signals for logging:', redactSignals(signals));
// → { cpus, arch, platform, hostname, macs: '[2 mac(s) redacted]', ... }
```

### 2. Challenge-response authentication

```typescript
import { generateKeyPair, generateChallenge, signChallenge, verifyResponse, NonceStore } from '@manya-os/attest';

const prover = generateKeyPair('ecdsa');
const nonces = new NonceStore();

// Verifier side.
const challenge = generateChallenge();
const trackedNonce = nonces.issue(); // single-use

// Prover side.
const response = signChallenge(prover.privateKey, { ...challenge, nonce: trackedNonce });

// Verifier side.
const ok = verifyResponse(prover.publicKey, { ...challenge, nonce: trackedNonce }, response, trackedNonce);
console.log('verified:', ok); // → true
console.log('replay rejected:', nonces.consume(trackedNonce)); // → false (already consumed)
```

### 3. Full attestation workflow

```typescript
import {
  AuthenticationWorkflow,
  generateKeyPair,
  exportKeyPem,
  collectDeviceSignals,
  DeviceFingerprint,
} from '@manya-os/attest';

// Prover: generate keys + collect fingerprint.
const proverKp = generateKeyPair('ecdsa');
const proverPubPem = exportKeyPem(proverKp.publicKey, 'public');
const fingerprint = DeviceFingerprint.fromSignals(collectDeviceSignals());

// Verifier: set up the workflow.
const verifier = new AuthenticationWorkflow();

// 1. Verifier issues a challenge.
const challenge = verifier.verifierIssueChallenge();

// 2. Prover responds with signed challenge + attestation quote.
const { response, quote } = await verifier.proverRespond(challenge, {
  privateKey: proverKp.privateKey,
  deviceFingerprint: fingerprint.toString(),
  measurements: { agent: 'azura', version: '1' },
});

// 3. Verifier validates response + quote + fingerprint match, establishes session.
const result = await verifier.verifierVerify({
  publicKey: proverPubPem,
  challenge,
  response,
  quote,
  expectedFingerprint: fingerprint.toString(),
  identity: 'did:key:zprover1',
});

if (result.success) {
  console.log('session established:', result.session!.token);
  console.log('trust score:', result.trust.score, '→', result.trust.decision);
} else {
  console.log('authentication failed:', result.reason);
}
```

## Configuration

### `AuthPolicy`

| Field | Default | Strict | Description |
| --- | --- | --- | --- |
| `requireHardwareAttestation` | `false` | `true` | Reject sessions when no hardware attestation root is present. |
| `minTrustScore` | `0.5` | `0.8` | Minimum trust score required to establish a session. |
| `sessionTtlMs` | `3_600_000` (1h) | `900_000` (15m) | Session TTL. |
| `allowedFingerprintDrift` | `0.2` | `0.0` | Maximum allowed fingerprint drift (0 = exact match). |
| `attestationFreshnessMs` | `300_000` (5m) | `60_000` (1m) | Maximum allowed attestation age. |

Use `defaultPolicy()`, `strictPolicy()`, or `buildPolicy(overrides)`.

### Trust weights

`TrustEvaluator` accepts a custom `TrustFactors` weights vector. Defaults:

| Factor | Default weight | Notes |
| --- | --- | --- |
| `fingerprintStability` | 0.30 | `1 - fingerprintDrift`, clamped to `[0, 1]`. |
| `hardware` | 0.20 | `1` if hardware roots present, `0` otherwise. |
| `attestation` | 0.30 | `1` if attestation verified, `0` otherwise. |
| `sessionAge` | 0.10 | Decays with 1-hour half-life; clamped to `[0, 1]`. |
| `priorInteractions` | 0.10 | Log-scaled; saturates at ~100 interactions. |

Decision thresholds: `>= 0.7` → `trust`, `>= 0.3` → `challenge`, `< 0.3` → `reject`.

### SessionStore

`InMemorySessionStore` is the default. To use a distributed store (Redis, Postgres, etc.), implement the `SessionStore` interface:

```typescript
import type { SessionStore, SessionRecord } from '@manya-os/attest';

class RedisSessionStore implements SessionStore {
  async get(token: string): Promise<SessionRecord | null> { /* ... */ }
  async put(record: SessionRecord): Promise<void> { /* ... */ }
  async delete(token: string): Promise<boolean> { /* ... */ }
  async list(): Promise<SessionRecord[]> { /* ... */ }
}
```

## Security notes

- **PII-free fingerprints**: `collectDeviceSignals` collects ONLY hardware/OS signals. It NEVER collects username, home dir, or environment variables. MACs and machine id are scrubbed by `redactSignals` before logging.
- **Constant-time comparisons**: `verify` / `verifyResponse` / `verifyAttestation` use `crypto.timingSafeEqual` for signature, nonce, and fingerprint comparison.
- **Single-use nonces**: `NonceStore.consume` is single-use — replayed nonces are rejected. TTL-based expiry + cleanup.
- **Replay protection**: sessions are bound to the challenge nonce (`boundNonce` field on `SessionRecord`).
- **Attestation freshness**: `verifyAttestation` rejects quotes older than `freshnessMs` (default 5 min).
- **Hardware probes never throw**: `HardwareValidator.probe()` is wrapped in try/catch and always returns a `HardwareProbe` (with everything `false` on error).
- **No raw private keys in logs**: `ConsoleLogger` scrubs `privateKey`, `password`, `passphrase`, `token`, `secret`, `credential`, `iv`, `tag`, `share`, `nonce`, `signature`, `macs`, `machineId`.
- **Self-contained**: this package does NOT import from `@manya-os/keyring` (a sibling workspace). All crypto primitives are implemented locally using Node's `crypto` module.

For the full security surface, see [SECURITY.md](./SECURITY.md). For the full API reference, see [docs/API.md](./docs/API.md).

## License

Apache-2.0, copyright **Manya Hael Foundation**. See [LICENSE](./LICENSE).

## Author

**Uviwe Menyiwe (Azura Daemon) <foundation@manyahael.org>**, founder of the Manya Hael Foundation.
