"use strict";
/**
 * @manya-os/attest — authentication policies.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_POLICY_ATTESTATION_FRESHNESS_MS = exports.DEFAULT_POLICY_SESSION_TTL_MS = void 0;
exports.defaultPolicy = defaultPolicy;
exports.strictPolicy = strictPolicy;
exports.validatePolicy = validatePolicy;
exports.buildPolicy = buildPolicy;
const errors_js_1 = require("../errors.js");
/** Default session TTL: 1 hour. */
exports.DEFAULT_POLICY_SESSION_TTL_MS = 60 * 60 * 1000;
/** Default attestation freshness window: 5 minutes. */
exports.DEFAULT_POLICY_ATTESTATION_FRESHNESS_MS = 5 * 60 * 1000;
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
function defaultPolicy() {
    return {
        requireHardwareAttestation: false,
        minTrustScore: 0.5,
        sessionTtlMs: exports.DEFAULT_POLICY_SESSION_TTL_MS,
        allowedFingerprintDrift: 0.2,
        attestationFreshnessMs: exports.DEFAULT_POLICY_ATTESTATION_FRESHNESS_MS,
    };
}
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
function strictPolicy() {
    return {
        requireHardwareAttestation: true,
        minTrustScore: 0.8,
        sessionTtlMs: 15 * 60 * 1000,
        allowedFingerprintDrift: 0.0,
        attestationFreshnessMs: 60 * 1000,
    };
}
/**
 * Validate an {@link AuthPolicy}. Throws {@link WorkflowError} on any problem.
 *
 * @param policy - The policy to validate.
 */
function validatePolicy(policy) {
    if (!policy || typeof policy !== 'object') {
        throw new errors_js_1.WorkflowError('validatePolicy: policy must be an object');
    }
    if (typeof policy.requireHardwareAttestation !== 'boolean') {
        throw new errors_js_1.WorkflowError('validatePolicy: requireHardwareAttestation must be boolean');
    }
    if (typeof policy.minTrustScore !== 'number' ||
        !Number.isFinite(policy.minTrustScore) ||
        policy.minTrustScore < 0 ||
        policy.minTrustScore > 1) {
        throw new errors_js_1.WorkflowError('validatePolicy: minTrustScore must be a finite number in [0, 1]');
    }
    if (!Number.isInteger(policy.sessionTtlMs) || policy.sessionTtlMs <= 0) {
        throw new errors_js_1.WorkflowError('validatePolicy: sessionTtlMs must be a positive integer');
    }
    if (typeof policy.allowedFingerprintDrift !== 'number' ||
        !Number.isFinite(policy.allowedFingerprintDrift) ||
        policy.allowedFingerprintDrift < 0 ||
        policy.allowedFingerprintDrift > 1) {
        throw new errors_js_1.WorkflowError('validatePolicy: allowedFingerprintDrift must be a finite number in [0, 1]');
    }
    if (!Number.isInteger(policy.attestationFreshnessMs) || policy.attestationFreshnessMs <= 0) {
        throw new errors_js_1.WorkflowError('validatePolicy: attestationFreshnessMs must be a positive integer');
    }
}
/**
 * Build a policy by merging the default with the supplied overrides.
 *
 * @param overrides - Partial policy overrides.
 */
function buildPolicy(overrides = {}) {
    const merged = { ...defaultPolicy(), ...overrides };
    validatePolicy(merged);
    return merged;
}
//# sourceMappingURL=policies.js.map