/**
 * @manya-os/attest — authentication policies.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
import type { AuthPolicy } from '../types.js';
/** Default session TTL: 1 hour. */
export declare const DEFAULT_POLICY_SESSION_TTL_MS: number;
/** Default attestation freshness window: 5 minutes. */
export declare const DEFAULT_POLICY_ATTESTATION_FRESHNESS_MS: number;
/**
 * Default policy: balanced for general use.
 *
 *   - `requireHardwareAttestation: false` — software attestation accepted.
 *   - `minTrustScore: 0.5` — below "trust" (0.7) but above "reject" (0.3).
 *     Sessions are still established at this level; callers should re-challenge.
 *   - `sessionTtlMs: 1 hour`.
 *   - `allowedFingerprintDrift: 0.2` — up to 20% of signals may differ.
 *   - `attestationFreshnessMs: 5 minutes`.
 */
export declare function defaultPolicy(): AuthPolicy;
/**
 * Strict policy: for high-assurance paths (privileged operations, key
 * management, etc.).
 *
 *   - `requireHardwareAttestation: true` — software attestation rejected.
 *   - `minTrustScore: 0.8` — must be solidly in the `trust` band.
 *   - `sessionTtlMs: 15 minutes` — short sessions.
 *   - `allowedFingerprintDrift: 0.0` — exact fingerprint match required.
 *   - `attestationFreshnessMs: 1 minute` — very fresh attestation required.
 */
export declare function strictPolicy(): AuthPolicy;
/**
 * Validate an {@link AuthPolicy}. Throws {@link WorkflowError} on any problem.
 *
 * @param policy - The policy to validate.
 */
export declare function validatePolicy(policy: AuthPolicy): void;
/**
 * Build a policy by merging the default with the supplied overrides.
 *
 * @param overrides - Partial policy overrides.
 */
export declare function buildPolicy(overrides?: Partial<AuthPolicy>): AuthPolicy;
//# sourceMappingURL=policies.d.ts.map