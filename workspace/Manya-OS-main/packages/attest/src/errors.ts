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
export class AttestError extends Error {
  /** Stable machine-readable code, e.g. `FINGERPRINT_ERROR`. */
  public readonly code: string;
  /** Optional underlying cause. */
  public override readonly cause?: unknown;

  constructor(message: string, code?: string, cause?: unknown) {
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

/** Thrown when a device-fingerprint operation fails (collection, parsing, drift). */
export class FingerprintError extends AttestError {
  constructor(message: string, cause?: unknown) {
    super(message, 'FINGERPRINT_ERROR', cause);
  }
}

/** Thrown when a challenge operation fails (generation, signing, verification). */
export class ChallengeError extends AttestError {
  constructor(message: string, cause?: unknown) {
    super(message, 'CHALLENGE_ERROR', cause);
  }
}

/** Thrown when a session operation fails (establish, verify, revoke, refresh). */
export class SessionError extends AttestError {
  constructor(message: string, cause?: unknown) {
    super(message, 'SESSION_ERROR', cause);
  }
}

/** Thrown when a hardware probe or validation fails (rare — probes are wrapped in try/catch). */
export class HardwareValidationError extends AttestError {
  constructor(message: string, cause?: unknown) {
    super(message, 'HARDWARE_VALIDATION_ERROR', cause);
  }
}

/** Thrown when an attestation operation fails (production, verification, freshness). */
export class AttestationError extends AttestError {
  constructor(message: string, cause?: unknown) {
    super(message, 'ATTESTATION_ERROR', cause);
  }
}

/** Thrown when the authentication workflow cannot complete (bad input, policy failure). */
export class WorkflowError extends AttestError {
  constructor(message: string, cause?: unknown) {
    super(message, 'WORKFLOW_ERROR', cause);
  }
}

/** Thrown when a trust evaluation fails (bad input, out-of-range factors). */
export class TrustEvaluationError extends AttestError {
  constructor(message: string, cause?: unknown) {
    super(message, 'TRUST_EVALUATION_ERROR', cause);
  }
}

/** Thrown when a nonce store operation fails (replay, expiry, malformed nonce). */
export class NonceError extends AttestError {
  constructor(message: string, cause?: unknown) {
    super(message, 'NONCE_ERROR', cause);
  }
}
