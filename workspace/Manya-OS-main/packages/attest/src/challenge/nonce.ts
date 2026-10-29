/**
 * @manya-os/attest — cryptographic nonce store with TTL.
 *
 * Single-use nonces prevent replay attacks: a verifier issues a nonce, the
 * prover must echo it back signed, and the verifier consumes (invalidates)
 * the nonce after a successful or failed attempt.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import { NonceError } from '../errors.js';
import { secureRandom, uuid } from '../crypto/hashing.js';

/** Internal record for an issued nonce. */
interface NonceRecord {
  /** The nonce value (hex). */
  nonce: string;
  /** ISO-8601 issuance timestamp. */
  issuedAt: number;
  /** Absolute expiry (epoch ms). */
  expiresAt: number;
  /** Whether the nonce has been consumed. */
  consumed: boolean;
}

/** Default nonce TTL: 5 minutes. */
export const DEFAULT_NONCE_TTL_MS = 5 * 60 * 1000;
/** Default nonce byte length: 32 (256 bits). */
export const DEFAULT_NONCE_BYTES = 32;

/**
 * Options for {@link NonceStore.issue}.
 */
export interface NonceIssueOptions {
  /** TTL in milliseconds. Defaults to {@link DEFAULT_NONCE_TTL_MS}. */
  ttlMs?: number;
  /** Number of random bytes. Defaults to {@link DEFAULT_NONCE_BYTES}. */
  bytes?: number;
}

/**
 * A single-use nonce store with TTL expiry.
 *
 * - `issue()` returns a fresh, unique nonce.
 * - `consume(nonce)` validates that the nonce exists, is unconsumed, and is
 *   not expired; if so, marks it consumed and returns `true`. Otherwise
 *   returns `false` (or throws on malformed input).
 * - `cleanup()` removes expired records.
 *
 * This implementation is in-memory and process-local. Distributed deployments
 * should replace it with a shared store (Redis, etc.) with the same interface.
 */
export class NonceStore {
  private readonly records = new Map<string, NonceRecord>();
  private readonly defaultTtlMs: number;
  private readonly defaultBytes: number;

  /**
   * @param defaultTtlMs - Default TTL applied to issued nonces.
   * @param defaultBytes - Default byte length for issued nonces.
   */
  constructor(defaultTtlMs: number = DEFAULT_NONCE_TTL_MS, defaultBytes: number = DEFAULT_NONCE_BYTES) {
    if (!Number.isInteger(defaultTtlMs) || defaultTtlMs <= 0) {
      throw new NonceError('defaultTtlMs must be a positive integer');
    }
    if (!Number.isInteger(defaultBytes) || defaultBytes <= 0 || defaultBytes > 256) {
      throw new NonceError('defaultBytes must be an integer in [1, 256]');
    }
    this.defaultTtlMs = defaultTtlMs;
    this.defaultBytes = defaultBytes;
  }

  /**
   * Issue a fresh single-use nonce.
   *
   * The nonce is returned as a hex string. It is guaranteed unique within
   * this store (collisions are detected and regenerated).
   *
   * @param opts - Optional issue parameters.
   */
  issue(opts: NonceIssueOptions = {}): string {
    const ttlMs = opts.ttlMs ?? this.defaultTtlMs;
    const bytes = opts.bytes ?? this.defaultBytes;
    if (!Number.isInteger(ttlMs) || ttlMs <= 0) {
      throw new NonceError('ttlMs must be a positive integer');
    }
    if (!Number.isInteger(bytes) || bytes <= 0 || bytes > 256) {
      throw new NonceError('bytes must be an integer in [1, 256]');
    }
    const now = Date.now();
    // Generate a unique nonce. Combine random bytes with a UUID prefix to
    // guarantee uniqueness even in the astronomically unlikely event of a
    // 32-byte random collision.
    let nonce: string;
    let attempts = 0;
    do {
      const rand = secureRandom(bytes).toString('hex');
      const id = uuid().replace(/-/g, '');
      nonce = `${id}${rand}`;
      attempts++;
      if (attempts > 16) {
        // Should be unreachable.
        throw new NonceError('issue: failed to generate a unique nonce after 16 attempts');
      }
    } while (this.records.has(nonce));

    this.records.set(nonce, {
      nonce,
      issuedAt: now,
      expiresAt: now + ttlMs,
      consumed: false,
    });
    return nonce;
  }

  /**
   * Consume (invalidate) a nonce. Returns `true` if the nonce was valid and
   * unconsumed; returns `false` if the nonce was unknown, already consumed,
   * or expired.
   *
   * Single-use semantics: a successful consume marks the nonce as consumed
   * and it can NEVER be consumed again.
   *
   * @param nonce - The nonce to consume.
   * @param opts.skipConsumeOnExpiry - If true, expired nonces are NOT marked
   *   consumed (they'll be cleaned up by `cleanup()`). Default false.
   */
  consume(nonce: string, opts: { skipConsumeOnExpiry?: boolean } = {}): boolean {
    if (typeof nonce !== 'string' || nonce.length === 0) {
      throw new NonceError('consume: nonce must be a non-empty string');
    }
    const record = this.records.get(nonce);
    if (!record) return false;
    const now = Date.now();
    if (record.consumed) return false;
    if (now >= record.expiresAt) {
      // Expired — either consume (so it's never reusable) or leave for cleanup.
      if (!opts.skipConsumeOnExpiry) {
        record.consumed = true;
      }
      return false;
    }
    record.consumed = true;
    return true;
  }

  /**
   * Check whether a nonce is currently valid (present, unconsumed, unexpired).
   * Does NOT consume the nonce.
   */
  isValid(nonce: string): boolean {
    const record = this.records.get(nonce);
    if (!record) return false;
    if (record.consumed) return false;
    return Date.now() < record.expiresAt;
  }

  /**
   * Remove expired (and consumed) records. Returns the number of records
   * removed.
   */
  cleanup(): number {
    const now = Date.now();
    let removed = 0;
    for (const [key, record] of this.records) {
      if (now >= record.expiresAt || record.consumed) {
        this.records.delete(key);
        removed++;
      }
    }
    return removed;
  }

  /**
   * Return the number of currently-tracked (non-expired, unconsumed) nonces.
   */
  size(): number {
    const now = Date.now();
    let count = 0;
    for (const record of this.records.values()) {
      if (!record.consumed && now < record.expiresAt) count++;
    }
    return count;
  }

  /**
   * Clear all records (useful in tests).
   */
  clear(): void {
    this.records.clear();
  }
}
