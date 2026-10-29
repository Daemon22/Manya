/**
 * @manya-os/ledger — hashing primitives.
 *
 * Self-contained crypto wrappers around Node `crypto`. This package must NOT
 * import from a sibling workspace; all primitives are implemented locally.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Conceived, directed, and owned by Uviwe Menyiwe (Azura Daemon), founder
 * of the Manya Hael Foundation.
 *
 * Licensed under the Apache License, Version 2.0.
 */

import * as crypto from 'crypto';
import { LedgerError } from '../errors.js';

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
    throw new LedgerError('sha256 failed: ' + (err as Error).message, 'HASH_ERROR', err);
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
    throw new LedgerError('sha512 failed: ' + (err as Error).message, 'HASH_ERROR', err);
  }
}

/**
 * Compute an HMAC.
 * @param key - HMAC key.
 * @param data - Bytes to authenticate.
 * @param algo - Hash algorithm. Defaults to `sha256`.
 * @returns HMAC digest.
 */
export function hmac(
  key: Buffer,
  data: Buffer,
  algo: 'sha256' | 'sha512' = 'sha256'
): Buffer {
  try {
    return crypto.createHmac(algo, key).update(data).digest();
  } catch (err) {
    throw new LedgerError('hmac failed: ' + (err as Error).message, 'HMAC_ERROR', err);
  }
}

/**
 * Return `n` cryptographically-secure random bytes.
 *
 * Uses `crypto.randomBytes` (CSPRNG backed by `/dev/urandom` or equivalent).
 * Throws if `n` is not a positive finite integer or exceeds 1 MiB.
 * @param n - Number of bytes (must be a positive finite integer).
 * @returns `n` random bytes.
 */
export function secureRandom(n: number): Buffer {
  if (!Number.isInteger(n) || n <= 0) {
    throw new LedgerError('secureRandom: length must be a positive integer', 'RANDOM_ERROR');
  }
  if (n > 1024 * 1024) {
    throw new LedgerError(
      'secureRandom: refusing to allocate > 1 MiB in a single call',
      'RANDOM_ERROR'
    );
  }
  try {
    return crypto.randomBytes(n);
  } catch (err) {
    throw new LedgerError('secureRandom failed: ' + (err as Error).message, 'RANDOM_ERROR', err);
  }
}

/**
 * Constant-time equality of two buffers.
 *
 * Returns `false` (rather than throwing) when the lengths differ — this is
 * the standard approach for compare-then-equal primitives, but callers
 * handling secrets of differing lengths should hash first to avoid leaking
 * length information.
 */
export function constantTimeEqual(a: Buffer, b: Buffer): boolean {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/**
 * Generate a random hex-encoded token of `bytes` entropy.
 * @param bytes - Number of random bytes (defaults to 32).
 * @returns 2*`bytes`-character hex string.
 */
export function randomToken(bytes = 32): string {
  return secureRandom(bytes).toString('hex');
}

/**
 * Generate a UUID v4 using `crypto.randomUUID`.
 * @returns RFC-4122 v4 UUID string.
 */
export function uuid(): string {
  try {
    return crypto.randomUUID();
  } catch (err) {
    throw new LedgerError('uuid failed: ' + (err as Error).message, 'UUID_ERROR', err);
  }
}

/**
 * Hex-encoded SHA-256 of `data`.
 *
 * Convenience wrapper around {@link sha256}.
 * @param data - Bytes to hash.
 * @returns 64-character lowercase hex string.
 */
export function sha256Hex(data: Buffer | string): string {
  return sha256(data).toString('hex');
}
