/**
 * @manya-os/keyring — symmetric encryption (AES-256-GCM).
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
import type { EncryptionResult } from '../types.js';
/** AES-256-GCM key length in bytes. */
export declare const AES_256_KEY_BYTES = 32;
/** AES-256-GCM IV length in bytes (96 bits per NIST SP 800-38D). */
export declare const AES_GCM_IV_BYTES = 12;
/** AES-256-GCM authentication-tag length in bytes. */
export declare const AES_GCM_TAG_BYTES = 16;
/**
 * Encrypt `plaintext` with AES-256-GCM using a fresh random 96-bit IV.
 *
 * @param key - 32-byte key.
 * @param plaintext - Bytes to encrypt.
 * @param aad - Optional additional authenticated data.
 * @returns IV, ciphertext, and tag.
 * @throws {@link EncryptionError} if `key` is not 32 bytes or encryption fails.
 */
export declare function encrypt(key: Buffer, plaintext: Buffer, aad?: Buffer): EncryptionResult;
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
export declare function decrypt(key: Buffer, iv: Buffer, ciphertext: Buffer, tag: Buffer, aad?: Buffer): Buffer;
//# sourceMappingURL=symmetric.d.ts.map