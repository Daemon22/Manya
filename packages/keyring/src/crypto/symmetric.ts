/**
 * @manya-os/keyring — symmetric encryption (AES-256-GCM).
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import * as crypto from 'crypto';
import { EncryptionError, DecryptionError } from '../errors.js';
import type { EncryptionResult } from '../types.js';

/** AES-256-GCM key length in bytes. */
export const AES_256_KEY_BYTES = 32;
/** AES-256-GCM IV length in bytes (96 bits per NIST SP 800-38D). */
export const AES_GCM_IV_BYTES = 12;
/** AES-256-GCM authentication-tag length in bytes. */
export const AES_GCM_TAG_BYTES = 16;

/**
 * Encrypt `plaintext` with AES-256-GCM using a fresh random 96-bit IV.
 *
 * @param key - 32-byte key.
 * @param plaintext - Bytes to encrypt.
 * @param aad - Optional additional authenticated data.
 * @returns IV, ciphertext, and tag.
 * @throws {@link EncryptionError} if `key` is not 32 bytes or encryption fails.
 */
export function encrypt(
  key: Buffer,
  plaintext: Buffer,
  aad?: Buffer
): EncryptionResult {
  if (!Buffer.isBuffer(key) || key.length !== AES_256_KEY_BYTES) {
    throw new EncryptionError(
      `AES-256-GCM requires a 32-byte key (got ${key?.length ?? 0})`
    );
  }
  if (!Buffer.isBuffer(plaintext)) {
    throw new EncryptionError('plaintext must be a Buffer');
  }
  try {
    const iv = crypto.randomBytes(AES_GCM_IV_BYTES);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv, {
      authTagLength: AES_GCM_TAG_BYTES,
    });
    if (aad && aad.length > 0) {
      cipher.setAAD(aad);
    }
    const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const tag = cipher.getAuthTag();
    return { iv, ciphertext, tag };
  } catch (err) {
    if (err instanceof EncryptionError) throw err;
    throw new EncryptionError('aes-256-gcm encrypt failed: ' + (err as Error).message, err);
  }
}

/**
 * Decrypt an AES-256-GCM ciphertext.
 *
 * @param key - 32-byte key.
 * @param iv - 12-byte IV used at encryption time.
 * @param ciphertext - Ciphertext bytes.
 * @param tag - 16-byte authentication tag.
 * @param aad - Optional additional authenticated data (must match encryption).
 * @returns Plaintext.
 * @throws {@link DecryptionError} if the key is malformed, the auth tag does
 *   not validate, or any low-level crypto error occurs.
 */
export function decrypt(
  key: Buffer,
  iv: Buffer,
  ciphertext: Buffer,
  tag: Buffer,
  aad?: Buffer
): Buffer {
  if (!Buffer.isBuffer(key) || key.length !== AES_256_KEY_BYTES) {
    throw new DecryptionError(
      `AES-256-GCM requires a 32-byte key (got ${key?.length ?? 0})`
    );
  }
  if (!Buffer.isBuffer(iv) || iv.length !== AES_GCM_IV_BYTES) {
    throw new DecryptionError(`IV must be ${AES_GCM_IV_BYTES} bytes`);
  }
  if (!Buffer.isBuffer(tag) || tag.length !== AES_GCM_TAG_BYTES) {
    throw new DecryptionError(`tag must be ${AES_GCM_TAG_BYTES} bytes`);
  }
  try {
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv, {
      authTagLength: AES_GCM_TAG_BYTES,
    });
    decipher.setAuthTag(tag);
    if (aad && aad.length > 0) {
      decipher.setAAD(aad);
    }
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  } catch (err) {
    if (err instanceof DecryptionError) throw err;
    throw new DecryptionError('aes-256-gcm decrypt failed: ' + (err as Error).message, err);
  }
}
