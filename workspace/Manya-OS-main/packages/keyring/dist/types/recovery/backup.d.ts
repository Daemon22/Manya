/**
 * @manya-os/keyring — encrypted backup format.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
import type { EncryptedBackup } from '../types.js';
import type { KeyringWallet } from '../wallet/wallet.js';
import type { VerifiableCredential, SerializedIdentity } from '../types.js';
export type { EncryptedBackup } from '../types.js';
/** Backup format version. */
export declare const BACKUP_VERSION = 1;
/**
 * The plaintext contents of a backup. The private key is NOT included —
 * only the public identity and credentials. Backups are intended for
 * portability and recovery-of-state; private key recovery uses Shamir
 * secret sharing (see {@link shamirSplit}).
 */
export interface BackupPayload {
    /** Format version. */
    version: number;
    /** UUID of this backup. */
    backupId: string;
    /** ISO-8601 creation timestamp. */
    createdAt: string;
    /** Primary identity id, if any. */
    primaryIdentityId: string | null;
    /** Public identities (no private keys). */
    identities: SerializedIdentity[];
    /** Credentials. */
    credentials: VerifiableCredential[];
}
/**
 * Result of {@link restoreBackup}.
 */
export interface RestoredBackup {
    /** Decrypted payload. */
    payload: BackupPayload;
}
/**
 * Create an encrypted backup of a wallet's public state (identities +
 * credentials). Private keys are excluded — use Shamir secret sharing
 * (see {@link shamirSplit}) for private-key recovery.
 *
 * @param wallet - Wallet to back up.
 * @param passphrase - User passphrase. Used to derive the encryption key
 *   via PBKDF2 (210k iterations, SHA-512).
 * @returns Encrypted backup blob (JSON-serializable).
 */
export declare function createBackup(wallet: KeyringWallet, passphrase: string): EncryptedBackup;
/**
 * Restore (decrypt) an encrypted backup blob.
 *
 * Note: this returns the decrypted payload only — it does NOT mutate the
 * wallet. Use {@link KeyringWallet.addCredential} and friends to apply the
 * restored state.
 *
 * @param blob - Encrypted backup.
 * @param passphrase - Passphrase used at creation time.
 * @returns Decrypted payload.
 */
export declare function restoreBackup(blob: EncryptedBackup, passphrase: string): RestoredBackup;
//# sourceMappingURL=backup.d.ts.map