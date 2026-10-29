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
export declare class KeyringError extends Error {
    /** Stable machine-readable code, e.g. `KEY_GENERATION_ERROR`. */
    readonly code: string;
    /** Optional underlying cause. */
    readonly cause?: unknown;
    constructor(message: string, code?: string, cause?: unknown);
}
/** Thrown when key generation or derivation fails. */
export declare class KeyGenerationError extends KeyringError {
    constructor(message: string, cause?: unknown);
}
/** Thrown when a signing operation fails. */
export declare class SignatureError extends KeyringError {
    constructor(message: string, cause?: unknown);
}
/** Thrown when signature verification fails (returns false) or errors. */
export declare class VerificationError extends KeyringError {
    constructor(message: string, cause?: unknown);
}
/** Thrown when AES-256-GCM encryption fails. */
export declare class EncryptionError extends KeyringError {
    constructor(message: string, cause?: unknown);
}
/** Thrown when AES-256-GCM decryption fails (auth tag mismatch, bad key, ...). */
export declare class DecryptionError extends KeyringError {
    constructor(message: string, cause?: unknown);
}
/** Thrown when a storage backend reports an I/O or serialization failure. */
export declare class StorageError extends KeyringError {
    constructor(message: string, cause?: unknown);
}
/** Thrown when an access-enforcement check denies an action. */
export declare class AccessDeniedError extends KeyringError {
    constructor(message: string, cause?: unknown);
}
/** Thrown when a credential operation fails (issuance, verification, format). */
export declare class CredentialError extends KeyringError {
    constructor(message: string, cause?: unknown);
}
/** Thrown when a sync operation fails (bad bundle, signature mismatch, conflict). */
export declare class SyncError extends KeyringError {
    constructor(message: string, cause?: unknown);
}
/** Thrown when backup creation or restoration fails. */
export declare class BackupError extends KeyringError {
    constructor(message: string, cause?: unknown);
}
/** Thrown when a Shamir secret-sharing operation fails. */
export declare class RecoveryError extends KeyringError {
    constructor(message: string, cause?: unknown);
}
/** Thrown when a hardware key provider reports an error. */
export declare class HardwareKeyError extends KeyringError {
    constructor(message: string, cause?: unknown);
}
//# sourceMappingURL=errors.d.ts.map