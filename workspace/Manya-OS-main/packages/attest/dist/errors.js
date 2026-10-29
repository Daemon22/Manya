"use strict";
/**
 * @manya-os/attest — typed error hierarchy.
 *
 * Every public function throws a subclass of {@link AttestError}. Callers
 * can catch broadly on {@link AttestError} or narrowly on a specific class.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.NonceError = exports.TrustEvaluationError = exports.WorkflowError = exports.AttestationError = exports.HardwareValidationError = exports.SessionError = exports.ChallengeError = exports.FingerprintError = exports.AttestError = void 0;
/**
 * Base class for every error thrown by @manya-os/attest.
 *
 * Carries an optional `cause` (per ES2022) and a stable `code` string that
 * callers can switch on without parsing messages.
 */
class AttestError extends Error {
    /** Stable machine-readable code, e.g. `FINGERPRINT_ERROR`. */
    code;
    /** Optional underlying cause. */
    cause;
    constructor(message, code, cause) {
        super(message);
        this.name = new.target.name;
        this.code = code ?? new.target.name;
        if (cause !== undefined) {
            this.cause = cause;
        }
        // Restore prototype chain after subclassing Error in TS strict mode.
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
exports.AttestError = AttestError;
/** Thrown when a device-fingerprint operation fails (collection, parsing, drift). */
class FingerprintError extends AttestError {
    constructor(message, cause) {
        super(message, 'FINGERPRINT_ERROR', cause);
    }
}
exports.FingerprintError = FingerprintError;
/** Thrown when a challenge operation fails (generation, signing, verification). */
class ChallengeError extends AttestError {
    constructor(message, cause) {
        super(message, 'CHALLENGE_ERROR', cause);
    }
}
exports.ChallengeError = ChallengeError;
/** Thrown when a session operation fails (establish, verify, revoke, refresh). */
class SessionError extends AttestError {
    constructor(message, cause) {
        super(message, 'SESSION_ERROR', cause);
    }
}
exports.SessionError = SessionError;
/** Thrown when a hardware probe or validation fails (rare — probes are wrapped in try/catch). */
class HardwareValidationError extends AttestError {
    constructor(message, cause) {
        super(message, 'HARDWARE_VALIDATION_ERROR', cause);
    }
}
exports.HardwareValidationError = HardwareValidationError;
/** Thrown when an attestation operation fails (production, verification, freshness). */
class AttestationError extends AttestError {
    constructor(message, cause) {
        super(message, 'ATTESTATION_ERROR', cause);
    }
}
exports.AttestationError = AttestationError;
/** Thrown when the authentication workflow cannot complete (bad input, policy failure). */
class WorkflowError extends AttestError {
    constructor(message, cause) {
        super(message, 'WORKFLOW_ERROR', cause);
    }
}
exports.WorkflowError = WorkflowError;
/** Thrown when a trust evaluation fails (bad input, out-of-range factors). */
class TrustEvaluationError extends AttestError {
    constructor(message, cause) {
        super(message, 'TRUST_EVALUATION_ERROR', cause);
    }
}
exports.TrustEvaluationError = TrustEvaluationError;
/** Thrown when a nonce store operation fails (replay, expiry, malformed nonce). */
class NonceError extends AttestError {
    constructor(message, cause) {
        super(message, 'NONCE_ERROR', cause);
    }
}
exports.NonceError = NonceError;
//# sourceMappingURL=errors.js.map