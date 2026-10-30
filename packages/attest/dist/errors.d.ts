/**
 * @manya-os/attest — typed error hierarchy.
 *
 * Every public function throws a subclass of {@link AttestError}. Callers
 * can catch broadly on {@link AttestError} or narrowly on a specific class.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
/**
 * Base class for every error thrown by @manya-os/attest.
 *
 * Carries an optional `cause` (per ES2022) and a stable `code` string that
 * callers can switch on without parsing messages.
 */
export declare class AttestError extends Error {
    /** Stable machine-readable code, e.g. `FINGERPRINT_ERROR`. */
    readonly code: string;
    /** Optional underlying cause. */
    readonly cause?: unknown;
    constructor(message: string, code?: string, cause?: unknown);
}
/** Thrown when a device-fingerprint operation fails (collection, parsing, drift). */
export declare class FingerprintError extends AttestError {
    constructor(message: string, cause?: unknown);
}
/** Thrown when a challenge operation fails (generation, signing, verification). */
export declare class ChallengeError extends AttestError {
    constructor(message: string, cause?: unknown);
}
/** Thrown when a session operation fails (establish, verify, revoke, refresh). */
export declare class SessionError extends AttestError {
    constructor(message: string, cause?: unknown);
}
/** Thrown when a hardware probe or validation fails (rare — probes are wrapped in try/catch). */
export declare class HardwareValidationError extends AttestError {
    constructor(message: string, cause?: unknown);
}
/** Thrown when an attestation operation fails (production, verification, freshness). */
export declare class AttestationError extends AttestError {
    constructor(message: string, cause?: unknown);
}
/** Thrown when the authentication workflow cannot complete (bad input, policy failure). */
export declare class WorkflowError extends AttestError {
    constructor(message: string, cause?: unknown);
}
/** Thrown when a trust evaluation fails (bad input, out-of-range factors). */
export declare class TrustEvaluationError extends AttestError {
    constructor(message: string, cause?: unknown);
}
/** Thrown when a nonce store operation fails (replay, expiry, malformed nonce). */
export declare class NonceError extends AttestError {
    constructor(message: string, cause?: unknown);
}
//# sourceMappingURL=errors.d.ts.map