"use strict";
/**
 * @manya-os/keyring — typed error hierarchy.
 *
 * Every public function throws a subclass of {@link KeyringError}. Callers
 * can catch broadly on {@link KeyringError} or narrowly on a specific class.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.HardwareKeyError = exports.RecoveryError = exports.BackupError = exports.SyncError = exports.CredentialError = exports.AccessDeniedError = exports.StorageError = exports.DecryptionError = exports.EncryptionError = exports.VerificationError = exports.SignatureError = exports.KeyGenerationError = exports.KeyringError = void 0;
/**
 * Base class for every error thrown by @manya-os/keyring.
 *
 * Carries an optional `cause` (per ES2022) and a stable `code` string that
 * callers can switch on without parsing messages.
 */
class KeyringError extends Error {
    /** Stable machine-readable code, e.g. `KEY_GENERATION_ERROR`. */
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
exports.KeyringError = KeyringError;
/** Thrown when key generation or derivation fails. */
class KeyGenerationError extends KeyringError {
    constructor(message, cause) {
        super(message, 'KEY_GENERATION_ERROR', cause);
    }
}
exports.KeyGenerationError = KeyGenerationError;
/** Thrown when a signing operation fails. */
class SignatureError extends KeyringError {
    constructor(message, cause) {
        super(message, 'SIGNATURE_ERROR', cause);
    }
}
exports.SignatureError = SignatureError;
/** Thrown when signature verification fails (returns false) or errors. */
class VerificationError extends KeyringError {
    constructor(message, cause) {
        super(message, 'VERIFICATION_ERROR', cause);
    }
}
exports.VerificationError = VerificationError;
/** Thrown when AES-256-GCM encryption fails. */
class EncryptionError extends KeyringError {
    constructor(message, cause) {
        super(message, 'ENCRYPTION_ERROR', cause);
    }
}
exports.EncryptionError = EncryptionError;
/** Thrown when AES-256-GCM decryption fails (auth tag mismatch, bad key, ...). */
class DecryptionError extends KeyringError {
    constructor(message, cause) {
        super(message, 'DECRYPTION_ERROR', cause);
    }
}
exports.DecryptionError = DecryptionError;
/** Thrown when a storage backend reports an I/O or serialization failure. */
class StorageError extends KeyringError {
    constructor(message, cause) {
        super(message, 'STORAGE_ERROR', cause);
    }
}
exports.StorageError = StorageError;
/** Thrown when an access-enforcement check denies an action. */
class AccessDeniedError extends KeyringError {
    constructor(message, cause) {
        super(message, 'ACCESS_DENIED_ERROR', cause);
    }
}
exports.AccessDeniedError = AccessDeniedError;
/** Thrown when a credential operation fails (issuance, verification, format). */
class CredentialError extends KeyringError {
    constructor(message, cause) {
        super(message, 'CREDENTIAL_ERROR', cause);
    }
}
exports.CredentialError = CredentialError;
/** Thrown when a sync operation fails (bad bundle, signature mismatch, conflict). */
class SyncError extends KeyringError {
    constructor(message, cause) {
        super(message, 'SYNC_ERROR', cause);
    }
}
exports.SyncError = SyncError;
/** Thrown when backup creation or restoration fails. */
class BackupError extends KeyringError {
    constructor(message, cause) {
        super(message, 'BACKUP_ERROR', cause);
    }
}
exports.BackupError = BackupError;
/** Thrown when a Shamir secret-sharing operation fails. */
class RecoveryError extends KeyringError {
    constructor(message, cause) {
        super(message, 'RECOVERY_ERROR', cause);
    }
}
exports.RecoveryError = RecoveryError;
/** Thrown when a hardware key provider reports an error. */
class HardwareKeyError extends KeyringError {
    constructor(message, cause) {
        super(message, 'HARDWARE_KEY_ERROR', cause);
    }
}
exports.HardwareKeyError = HardwareKeyError;
//# sourceMappingURL=errors.js.map