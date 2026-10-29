# Security Policy — @manya-os/attest

For the general security policy (supported versions, reporting a vulnerability, disclosure timeline, scope, principles), see the root [SECURITY.md](../../SECURITY.md). This file describes the **package-specific** security surface.

## Cryptographic surface

`@manya-os/attest` uses Node.js `crypto` (OpenSSL-backed) for all cryptographic operations:

| Operation | Primitive |
| --- | --- |
| Asymmetric signatures | RSA-PSS (SHA-256, salt length = digest) and ECDSA over NIST P-256 (SHA-256). |
| Hashing | SHA-256, SHA-512, HMAC-SHA-256, HMAC-SHA-512. |
| Random number generation | `crypto.randomBytes` (CSPRNG backed by `/dev/urandom` or equivalent). |
| UUID generation | `crypto.randomUUID` (RFC-4122 v4). |
| Constant-time comparison | `crypto.timingSafeEqual` (with length guard). |

Custom cryptographic code is **not** used. The package is **self-contained**: it does NOT import from `@manya-os/keyring` (a sibling workspace). All primitives are implemented locally in `src/crypto/` and use Node's `crypto` directly.

## Fingerprint privacy

`collectDeviceSignals` collects ONLY hardware/OS signals:

- CPU count, architecture, platform, OS release, hostname
- Non-loopback MAC addresses (lowercased, no separators)
- Total system memory
- Node.js version
- Optional stable machine id (Linux `/etc/machine-id`, macOS `IOPlatformUUID`, Windows `MachineGuid`)

It NEVER collects:

- OS username (`os.userInfo().username`)
- Home directory (`os.homedir()`)
- Environment variables (`process.env.*`)
- Process arguments (`process.argv`)
- Filesystem paths under the user's home

`redactSignals(signals)` produces a log-safe view that replaces `macs` with a count marker and `machineId` with `[redacted]`. All MACs and the machine id are also in the `SCRUBBED_FIELD_NAMES` list so `ConsoleLogger` will scrub them from any logged metadata.

## Constant-time comparisons

All verification paths route the OpenSSL boolean result through `crypto.timingSafeEqual` as a defense-in-depth:

- `crypto/signatures.ts:verify` — wraps the OpenSSL verify result in a 1-byte Buffer compared with `timingSafeEqual`.
- `challenge/challenge.ts:verifyResponse` — compares the response nonce to the expected nonce with `timingSafeEqual`.
- `remote/attestation.ts:verifyAttestation` — compares the quote nonce and the expected fingerprint with `timingSafeEqual`.
- `fingerprint/fingerprint.ts:compare` — compares per-field hashes (and the top-level hash) with `timingSafeEqual`.

## Nonce single-use / replay protection

`NonceStore.consume(nonce)` is single-use:

- A nonce consumed by a successful verification is marked consumed and can NEVER be reused.
- A nonce consumed by a failed verification is also marked consumed — this prevents an attacker from racing the verifier.
- TTL expiry causes `consume` to return `false` (not throw).
- `cleanup()` removes both expired AND consumed records.

`AuthenticationWorkflow.verifierVerify` consumes the challenge nonce before any other check, so a replay attempt fails immediately.

## Attestation freshness

`verifyAttestation` enforces a freshness window:

```
|now - quote.timestamp| <= freshnessMs
```

The default `freshnessMs` is 5 minutes (`DEFAULT_ATTESTATION_FRESHNESS_MS`). The strict policy uses 1 minute. The absolute value allows for minor clock skew between prover and verifier while still rejecting stale quotes.

## Hardware probes never throw

`HardwareValidator.probe()` is wrapped in a top-level try/catch. Individual platform probes (`probeLinuxTpm`, `probeLinuxTee`, `probeMacSecureEnclave`, `probeWindowsTpm`, `probeWindowsTee`) are each wrapped in their own try/catch. If any probe throws unexpectedly, `probe()` returns a `HardwareProbe` with everything set to `false` and `details` describing the error.

This is essential because `probe()` is called from the attestation production path; a thrown probe would prevent the prover from producing ANY attestation quote, even a software-signed fallback.

## Audit logging

`AuthenticationWorkflow` accepts a `Logger` and emits `info`-level audit events for: session establishment (with sessionId, identity, trustScore). The default `ConsoleLogger` scrubs the following field names (case-insensitive suffix match) from logged metadata:

`privateKey`, `password`, `passphrase`, `token`, `secret`, `credential`, `iv`, `tag`, `share`, `nonce`, `signature`, `macs`, `machineId`.

Use `SilentLogger` (the default) if you do not want any logging.

## Session security

- **Tokens**: 256-bit CSPRNG-generated hex strings.
- **TTL**: default 1 hour; configurable via `AuthPolicy.sessionTtlMs` or per-call via `EstablishSessionOptions.ttlMs`.
- **Bound nonce**: sessions carry an optional `boundNonce` field (the challenge nonce that established the session) for replay protection.
- **Refresh**: `SessionManager.refresh(token)` issues a new token and revokes the old one. Refresh on an expired session throws `SessionError`.
- **Reap**: `SessionManager.reap()` removes expired sessions from the store.
- **Pluggable storage**: `InMemorySessionStore` is the default. Distributed deployments should implement `SessionStore` against Redis / Postgres / etc. with the same single-use semantics for token issuance.

## Threat model (summary)

In scope:

- **Replay of a signed challenge response**: rejected by single-use `NonceStore`.
- **Replay of an attestation quote**: rejected by single-use `NonceStore` (the quote's nonce is consumed during verification) AND by the freshness window.
- **Tampering with an attestation quote** (modified measurements / fingerprint / timestamp): signature verification rejects.
- **Wrong public key**: signature verification rejects.
- **Drifted device fingerprint** (prover claims a different fingerprint than the verifier expects): `verifyAttestation`'s `expectedFingerprint` check rejects.
- **Expired session**: `SessionManager.verify` returns `null` and opportunistically deletes the session.
- **Session token brute-force**: 256-bit CSPRNG tokens — computationally infeasible.
- **PII leakage via logs**: `ConsoleLogger` scrubs `macs`, `machineId`, `nonce`, `signature`, `token`, etc.
- **Hardware probe failure on exotic platforms**: `probe()` is wrapped in try/catch and returns `false` rather than throwing.

Out of scope (use other controls):

- **Compromise of the prover's private key**: an attacker with the private key can produce valid challenges and quotes. Mitigate by storing the private key in a `HardwareKeyProvider` (TPM / Secure Enclave / HSM).
- **Compromise of the verifier's session store**: an attacker with write access to the store can forge sessions. Mitigate by using a tamper-evident store (e.g. signed session records).
- **Clock skew beyond the freshness window**: if the prover and verifier clocks differ by more than `freshnessMs`, valid quotes will be rejected. Mitigate by syncing clocks (NTP) and tuning `freshnessMs`.
- **Side-channel attacks on the host process**: an attacker with process memory can read private keys. Use a `HardwareKeyProvider` for higher assurance.
- **Hardware attestation spoofing**: the `SoftwareAttestationProvider` provides NO hardware guarantees. It is a fallback for development / testing / low-assurance deployments. For high-assurance deployments, implement a real `HardwareAttestationProvider` (TPM2-TSS, Apple Secure Enclave, Intel SGX SDK, etc.).

## Disclosure timeline

See the root [SECURITY.md](../../SECURITY.md). Critical issues in this package may accelerate the standard timeline.

## Contact

- General security: **security@manyahael.org**
- Maintainer escalation: **foundation@manyahael.org**
