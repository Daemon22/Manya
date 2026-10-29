/**
 * @manya-os/keyring — hashing primitives.
 *
 * Thin wrappers around Node `crypto` that surface typed errors.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import * as crypto from 'crypto';
import { KeyringError } from '../errors.js';

/**
 * Compute SHA-256 over `data`.
 * @param data - Bytes to hash.
 * @returns 32-byte digest.
 */
export function sha256(data: Buffer | string): Buffer {
  try {
    const buf = typeof data === 'string' ? Buffer.from(data, 'utf8') : data;
    return crypto.createHash('sha256').update(buf).digest();
  } catch (err) {
    throw new KeyringError('sha256 failed: ' + (err as Error).message, 'HASH_ERROR', err);
  }
}

/**
 * Compute SHA-512 over `data`.
 * @param data - Bytes to hash.
 * @returns 64-byte digest.
 */
export function sha512(data: Buffer | string): Buffer {
  try {
    const buf = typeof data === 'string' ? Buffer.from(data, 'utf8') : data;
    return crypto.createHash('sha512').update(buf).digest();
  } catch (err) {
    throw new KeyringError('sha512 failed: ' + (err as Error).message, 'HASH_ERROR', err);
  }
}

/**
 * Compute an HMAC.
 * @param key - HMAC key.
 * @param data - Bytes to authenticate.
 * @param algo - Hash algorithm. Defaults to `sha256`.
 * @returns HMAC digest.
 */
export function hmac(key: Buffer, data: Buffer, algo: 'sha256' | 'sha512' = 'sha256'): Buffer {
  try {
    return crypto.createHmac(algo, key).update(data).digest();
  } catch (err) {
    throw new KeyringError('hmac failed: ' + (err as Error).message, 'HMAC_ERROR', err);
  }
}

/**
 * HKDF-SHA256 extract-and-expand.
 * @param ikm - Input keying material.
 * @param salt - Salt (may be empty).
 * @param info - Context/application info (may be empty).
 * @param length - Output length in bytes (≤ 255 × 32).
 * @returns Derived key material of `length` bytes.
 */
export function hkdf(
  ikm: Buffer,
  salt: Buffer,
  info: Buffer,
  length: number
): Buffer {
  if (length <= 0) {
    throw new KeyringError('hkdf: length must be > 0', 'HKDF_ERROR');
  }
  if (length > 255 * 32) {
    throw new KeyringError(
      'hkdf: length exceeds 255 * 32 (255 blocks of SHA-256)',
      'HKDF_ERROR'
    );
  }
  try {
    const result = crypto.hkdfSync('sha256', ikm, salt, info, length);
    return Buffer.from(result);
  } catch (err) {
    throw new KeyringError('hkdf failed: ' + (err as Error).message, 'HKDF_ERROR', err);
  }
}

/**
 * PBKDF2 password-based key derivation.
 * @param passphrase - User passphrase.
 * @param salt - Salt.
 * @param iterations - Iteration count.
 * @param keyLen - Output length in bytes.
 * @param algo - PRF hash. Defaults to `sha512`.
 * @returns Derived key.
 */
export function pbkdf2(
  passphrase: string | Buffer,
  salt: Buffer,
  iterations: number,
  keyLen: number,
  algo: 'sha256' | 'sha512' = 'sha512'
): Buffer {
  if (iterations < 1000) {
    throw new KeyringError('pbkdf2: iterations below safe minimum (1000)', 'PBKDF2_ERROR');
  }
  try {
    return crypto.pbkdf2Sync(passphrase, salt, iterations, keyLen, algo);
  } catch (err) {
    throw new KeyringError('pbkdf2 failed: ' + (err as Error).message, 'PBKDF2_ERROR', err);
  }
}

/**
 * Constant-time equality of two buffers.
 * Returns `false` (rather than throwing) when the lengths differ.
 */
export function constantTimeEqual(a: Buffer, b: Buffer): boolean {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
