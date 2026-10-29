/**
 * @manya-os/keyring — encrypted backup format.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import * as crypto from 'crypto';
import { randomUUID } from 'crypto';
import {
  BackupError,
  DecryptionError,
  EncryptionError,
} from '../errors.js';
import { encrypt, decrypt } from '../crypto/symmetric.js';
import { pbkdf2 } from '../crypto/hashing.js';
import type { EncryptedBackup } from '../types.js';
import type { KeyringWallet } from '../wallet/wallet.js';
import type { VerifiableCredential, SerializedIdentity } from '../types.js';

// Re-export the EncryptedBackup type for convenient single-import access.
export type { EncryptedBackup } from '../types.js';

/** Backup format version. */
export const BACKUP_VERSION = 1;
/** PBKDF2 iterations for backup passphrase → key. */
const BACKUP_PBKDF2_ITERATIONS = 210_000;
/** Salt length. */
const BACKUP_SALT_BYTES = 16;
/** Master key length (AES-256). */
const BACKUP_KEY_BYTES = 32;

const BACKUP_AAD = Buffer.from('manya-keyring-backup-v1', 'utf8');

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
export function createBackup(
  wallet: KeyringWallet,
  passphrase: string
): EncryptedBackup {
  if (!wallet) {
    throw new BackupError('createBackup: wallet required');
  }
  if (typeof passphrase !== 'string' || passphrase.length === 0) {
    throw new BackupError('createBackup: passphrase required');
  }

  const identities = wallet.listIdentities().map((i) => i.serialize());
  const credentials = wallet.listCredentials();
  const primary = wallet.getPrimaryIdentity();

  const payload: BackupPayload = {
    version: BACKUP_VERSION,
    backupId: 'backup-' + randomUUID(),
    createdAt: new Date().toISOString(),
    primaryIdentityId: primary ? primary.id : null,
    identities,
    credentials,
  };

  const salt = crypto.randomBytes(BACKUP_SALT_BYTES);
  const key = pbkdf2(
    passphrase,
    salt,
    BACKUP_PBKDF2_ITERATIONS,
    BACKUP_KEY_BYTES
  );

  const plain = Buffer.from(JSON.stringify(payload), 'utf8');
  let enc;
  try {
    enc = encrypt(key, plain, BACKUP_AAD);
  } catch (err) {
    if (err instanceof EncryptionError) throw err;
    throw new BackupError('createBackup: encryption failed: ' + (err as Error).message, err);
  }

  return {
    version: BACKUP_VERSION,
    salt: salt.toString('base64'),
    iv: enc.iv.toString('base64'),
    ciphertext: enc.ciphertext.toString('base64'),
    tag: enc.tag.toString('base64'),
    createdAt: payload.createdAt,
    iterations: BACKUP_PBKDF2_ITERATIONS,
  };
}

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
export function restoreBackup(
  blob: EncryptedBackup,
  passphrase: string
): RestoredBackup {
  if (!blob || typeof blob !== 'object') {
    throw new BackupError('restoreBackup: blob required');
  }
  if (typeof passphrase !== 'string' || passphrase.length === 0) {
    throw new BackupError('restoreBackup: passphrase required');
  }
  if (blob.version !== BACKUP_VERSION) {
    throw new BackupError(`restoreBackup: unsupported version ${blob.version}`);
  }

  const salt = Buffer.from(blob.salt, 'base64');
  const iterations = blob.iterations ?? BACKUP_PBKDF2_ITERATIONS;
  const key = pbkdf2(passphrase, salt, iterations, BACKUP_KEY_BYTES);

  let plain: Buffer;
  try {
    plain = decrypt(
      key,
      Buffer.from(blob.iv, 'base64'),
      Buffer.from(blob.ciphertext, 'base64'),
      Buffer.from(blob.tag, 'base64'),
      BACKUP_AAD
    );
  } catch (err) {
    if (err instanceof DecryptionError) {
      throw new BackupError(
        'restoreBackup: decryption failed (wrong passphrase?): ' +
          (err as Error).message,
        err
      );
    }
    throw new BackupError('restoreBackup: decryption failed: ' + (err as Error).message, err);
  }

  let payload: BackupPayload;
  try {
    payload = JSON.parse(plain.toString('utf8'));
  } catch (err) {
    throw new BackupError('restoreBackup: corrupt payload JSON', err);
  }

  if (!payload || payload.version !== BACKUP_VERSION) {
    throw new BackupError('restoreBackup: payload version mismatch');
  }
  return { payload };
}
