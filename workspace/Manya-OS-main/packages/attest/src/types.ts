/**
 * @manya-os/attest — shared type definitions.
 *
 * These types are part of the public API surface and must remain stable across
 * minor versions. Internal-only types live alongside their owning modules.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Conceived, directed, and owned by Uviwe Menyiwe (Azura Daemon), founder
 * of the Manya Hael Foundation.
 *
 * Licensed under the Apache License, Version 2.0.
 */

import type * as crypto from 'crypto';

/**
 * Supported key algorithms for attestation. `rsa` produces 3072-bit RSA-PSS
 * keys; `ecdsa` produces ECDSA keys over the NIST P-256 curve.
 */
export type KeyAlgorithm = 'rsa' | 'ecdsa';

/**
 * Supported signature algorithms. Maps 1:1 to {@link KeyAlgorithm}.
 * - `rsa-pss` — RSA-PSS with SHA-256 and salt length equal to the digest.
 * - `ecdsa-p256` — ECDSA over NIST P-256 with SHA-256.
 */
export type SignatureAlgorithm = 'rsa-pss' | 'ecdsa-p256';

/**
 * Raw device signals collected by {@link import('./fingerprint/collector.js').collectDeviceSignals}.
 *
 * These signals NEVER include personally-identifying information (PII) such as
 * the OS username, home directory, or environment variables. They describe
 * the physical/virtual hardware the agent is running on, nothing more.
 */
export interface DeviceSignals {
  /** Number of logical CPU cores. */
  cpus: number;
  /** CPU architecture (e.g. `x64`, `arm64`). */
  arch: string;
  /** Operating system platform (e.g. `linux`, `darwin`, `win32`). */
  platform: string;
  /** OS hostname. */
  hostname: string;
  /** Non-loopback MAC addresses, lowercased without separators. May be empty. */
  macs: string[];
  /** Total system memory in bytes. */
  totalmem: number;
  /** Node.js version string (e.g. `v18.19.0`). */
  nodeVersion: string;
  /** OS release string. */
  release: string;
  /** Optional stable machine id (e.g. `/etc/machine-id`, macOS IOPlatformUUID). */
  machineId?: string;
}

/**
 * A redacted view of {@link DeviceSignals} suitable for logging. Sensitive
 * fields (`macs`, `machineId`) are replaced with literal markers.
 */
export interface RedactedDeviceSignals {
  cpus: number;
  arch: string;
  platform: string;
  hostname: string;
  macs: string;
  totalmem: number;
  nodeVersion: string;
  release: string;
  machineId: string;
}

/**
 * Result of comparing two {@link import('./fingerprint/fingerprint.js').DeviceFingerprint}s.
 *
 * `drift` is in `[0, 1]` — `0` means the fingerprints are identical,
 * `1` means they share no common signal. `match` is `true` iff `drift === 0`.
 */
export interface FingerprintComparison {
  /** Whether the two fingerprints are an exact match. */
  match: boolean;
  /** Drift score in `[0, 1]` (lower is more similar). */
  drift: number;
}

/**
 * A challenge issued by a verifier to a prover.
 */
export interface Challenge {
  /** Opaque single-use nonce (used by the nonce store). */
  nonce: string;
  /** Base64-encoded challenge bytes the prover must sign. */
  challenge: string;
  /** ISO-8601 issuance timestamp. */
  issuedAt: string;
  /** ISO-8601 expiry timestamp. */
  expiresAt: string;
}

/**
 * Options for {@link import('./challenge/challenge.js').generateChallenge}.
 */
export interface GenerateChallengeOptions {
  /** Challenge TTL in milliseconds. Defaults to 60_000 (60 s). */
  ttlMs?: number;
  /** Challenge byte length. Defaults to 32. */
  bytes?: number;
}

/**
 * A signed challenge response produced by the prover.
 */
export interface SignedChallengeResponse {
  /** Echoed nonce from the original {@link Challenge}. */
  nonce: string;
  /** Hex-encoded signature over the canonical challenge bytes. */
  signature: string;
  /** Signature algorithm used. */
  algorithm: SignatureAlgorithm;
  /** ISO-8601 signing timestamp. */
  signedAt: string;
  /** Hex SHA-256 fingerprint of the prover's public key. */
  publicKeyFingerprint: string;
}

/**
 * A trusted session established after successful authentication.
 */
export interface Session {
  /** Opaque session token (presented by the client on subsequent calls). */
  token: string;
  /** Internal session identifier (UUID v4). */
  sessionId: string;
  /** ISO-8601 creation timestamp. */
  createdAt: string;
  /** ISO-8601 expiry timestamp. */
  expiresAt: string;
  /** Device fingerprint string bound to this session. */
  fingerprint: string;
  /** Free-form identity (DID, user id, agent id) bound to this session. */
  identity: string;
  /** Trust score in `[0, 1]` at the time of session establishment. */
  trustScore: number;
}

/**
 * Persistent session record stored in a {@link import('./session/store.js').SessionStore}.
 * Carries the same data as {@link Session} plus the original challenge nonce
 * for replay protection.
 */
export interface SessionRecord extends Session {
  /** Challenge nonce bound to this session (for replay protection). */
  boundNonce?: string;
}

/**
 * Result of probing the local hardware for attestation roots.
 */
export interface HardwareProbe {
  /** Whether a Trusted Platform Module (TPM) is present. */
  tpm: boolean;
  /** Whether a Secure Enclave (macOS) is present. */
  secureEnclave: boolean;
  /** Whether a Trusted Execution Environment (TEE) is present. */
  tee: boolean;
  /** Human-readable details of what was probed. */
  details: string;
}

/**
 * A signed attestation quote produced by a prover.
 *
 * The canonical signed payload is `deviceFingerprint || measurements (JSON) ||
 * timestamp || nonce`. The signature is computed over that with the prover's
 * private key.
 */
export interface AttestationQuote {
  /** Quote format version. */
  version: number;
  /** Prover's device fingerprint string. */
  deviceFingerprint: string;
  /** Stable map of measurement name → hex value. */
  measurements: Record<string, string>;
  /** ISO-8601 quote timestamp. */
  timestamp: string;
  /** Echoed nonce from the verifier's challenge. */
  nonce: string;
  /** Hex-encoded signature over the canonical quote bytes. */
  signature: string;
  /** Signature algorithm used. */
  algorithm: SignatureAlgorithm;
  /** Optional hardware attestation report (if a hardware provider was used). */
  hardware?: HardwareProbe;
}

/**
 * Inputs to {@link import('./trust/evaluator.js').TrustEvaluator.evaluate}.
 */
export interface TrustEvaluationInputs {
  /** Fingerprint drift in `[0, 1]` (0 = exact match, 1 = no overlap). */
  fingerprintDrift: number;
  /** Whether hardware attestation roots (TPM / SE / TEE) are present. */
  hardwarePresent: boolean;
  /** Whether the attestation quote was verified successfully. */
  attestationValid: boolean;
  /** Age of the session in milliseconds (0 for a fresh session). */
  sessionAgeMs: number;
  /** Number of prior successful interactions with this identity. */
  priorInteractions: number;
}

/**
 * Per-factor breakdown of a {@link TrustScore}.
 */
export interface TrustFactors {
  /** Contribution of fingerprint stability to the score (0..1). */
  fingerprintStability: number;
  /** Contribution of hardware presence to the score (0..1). */
  hardware: number;
  /** Contribution of attestation validity to the score (0..1). */
  attestation: number;
  /** Contribution of session freshness to the score (0..1). */
  sessionAge: number;
  /** Contribution of prior interactions to the score (0..1). */
  priorInteractions: number;
}

/**
 * A trust score in `[0, 1]` with a per-factor breakdown and an overall
 * decision. `decision` is `trust` when `score >= 0.7`, `challenge` when
 * `0.3 <= score < 0.7`, and `reject` when `score < 0.3`.
 */
export interface TrustScore {
  /** Aggregate trust score in `[0, 1]`. */
  score: number;
  /** Per-factor contributions. */
  factors: TrustFactors;
  /** Overall decision based on `score`. */
  decision: 'trust' | 'challenge' | 'reject';
  /** Whether any active capability grant influenced the trust decision. */
  grantInfluence?: string;
}

/**
 * Callback to check if a capability grant is still valid.
 * Returns true if the grant is active and covers the specified capability.
 */
export type GrantValidityCheck = (grantId: string, capability: string) => boolean;

/**
 * Authentication policy. Configures the {@link import('./workflow/authenticator.js').AuthenticationWorkflow}.
 */
export interface AuthPolicy {
  /** Whether hardware attestation is required (rejects if absent). */
  requireHardwareAttestation: boolean;
  /** Minimum trust score required for a session to be established. */
  minTrustScore: number;
  /** Session TTL in milliseconds. */
  sessionTtlMs: number;
  /** Maximum allowed fingerprint drift (`0` = exact match required). */
  allowedFingerprintDrift: number;
  /** Maximum allowed attestation freshness in milliseconds. */
  attestationFreshnessMs: number;
}

/**
 * Result of the full authentication workflow.
 */
export interface AuthenticationResult {
  /** Whether authentication succeeded. */
  success: boolean;
  /** Trust score computed for this authentication. */
  trust: TrustScore;
  /** Established session, if `success` is `true`. */
  session?: Session;
  /** Reason for failure, if `success` is `false`. */
  reason?: string;
}

/**
 * Key material generated by {@link import('./crypto/keys.js').generateKeyPair}.
 */
export interface GeneratedKeyPair {
  publicKey: crypto.KeyObject;
  privateKey: crypto.KeyObject;
  /** Resolved signature algorithm. */
  algorithm: SignatureAlgorithm;
}

/** Re-export to keep `crypto` types accessible to consumers. */
export type { KeyObject } from 'crypto';
