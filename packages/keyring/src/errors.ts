/**
 * @manya-os/keyring — typed error hierarchy.
 *
 * Every public function throws a subclass of {@link KeyringError}. Callers
 * can catch broadly on {@link KeyringError} or narrowly on a specific class.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

/**
 * Base class for every error thrown by @manya-os/keyring.
 *
 * Carries an optional `cause` (per ES2022) and a stable `code` string that
 * callers can switch on without parsing messages.
 */
export class KeyringError extends Error {
  /** Stable machine-readable code, e.g. `KEY_GENERATION_ERROR`. */
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

/** Thrown when key generation or derivation fails. */
export class KeyGenerationError extends KeyringError {
  constructor(message: string, cause?: unknown) {
    super(message, 'KEY_GENERATION_ERROR', cause);
  }
}

/** Thrown when a signing operation fails. */
export class SignatureError extends KeyringError {
  constructor(message: string, cause?: unknown) {
    super(message, 'SIGNATURE_ERROR', cause);
  }
}

/** Thrown when signature verification fails (returns false) or errors. */
export class VerificationError extends KeyringError {
  constructor(message: string, cause?: unknown) {
    super(message, 'VERIFICATION_ERROR', cause);
  }
}

/** Thrown when AES-256-GCM encryption fails. */
export class EncryptionError extends KeyringError {
  constructor(message: string, cause?: unknown) {
    super(message, 'ENCRYPTION_ERROR', cause);
  }
}

/** Thrown when AES-256-GCM decryption fails (auth tag mismatch, bad key, ...). */
export class DecryptionError extends KeyringError {
  constructor(message: string, cause?: unknown) {
    super(message, 'DECRYPTION_ERROR', cause);
  }
}

/** Thrown when a storage backend reports an I/O or serialization failure. */
export class StorageError extends KeyringError {
  constructor(message: string, cause?: unknown) {
    super(message, 'STORAGE_ERROR', cause);
  }
}

/** Thrown when an access-enforcement check denies an action. */
export class AccessDeniedError extends KeyringError {
  constructor(message: string, cause?: unknown) {
    super(message, 'ACCESS_DENIED_ERROR', cause);
  }
}

/** Thrown when a credential operation fails (issuance, verification, format). */
export class CredentialError extends KeyringError {
  constructor(message: string, cause?: unknown) {
    super(message, 'CREDENTIAL_ERROR', cause);
  }
}

/** Thrown when a sync operation fails (bad bundle, signature mismatch, conflict). */
export class SyncError extends KeyringError {
  constructor(message: string, cause?: unknown) {
    super(message, 'SYNC_ERROR', cause);
  }
}

/** Thrown when backup creation or restoration fails. */
export class BackupError extends KeyringError {
  constructor(message: string, cause?: unknown) {
    super(message, 'BACKUP_ERROR', cause);
  }
}

/** Thrown when a Shamir secret-sharing operation fails. */
export class RecoveryError extends KeyringError {
  constructor(message: string, cause?: unknown) {
    super(message, 'RECOVERY_ERROR', cause);
  }
}

/** Thrown when a hardware key provider reports an error. */
export class HardwareKeyError extends KeyringError {
  constructor(message: string, cause?: unknown) {
    super(message, 'HARDWARE_KEY_ERROR', cause);
  }
}
