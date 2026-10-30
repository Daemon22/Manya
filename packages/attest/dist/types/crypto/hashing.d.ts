/**
 * @manya-os/attest — hashing primitives.
 *
 * Self-contained crypto wrappers around Node `crypto`. This package must NOT
 * import from `@manya-os/keyring` (a sibling workspace); all primitives are
 * implemented locally.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
/**
 * Compute SHA-256 over `data`.
 * @param data - Bytes to hash.
 * @returns 32-byte digest.
 */
export declare function sha256(data: Buffer | string): Buffer;
/**
 * Compute SHA-512 over `data`.
 * @param data - Bytes to hash.
 * @returns 64-byte digest.
 */
export declare function sha512(data: Buffer | string): Buffer;
/**
 * Compute an HMAC.
 * @param key - HMAC key.
 * @param data - Bytes to authenticate.
 * @param algo - Hash algorithm. Defaults to `sha256`.
 * @returns HMAC digest.
 */
export declare function hmac(key: Buffer, data: Buffer, algo?: 'sha256' | 'sha512'): Buffer;
/**
 * Return `n` cryptographically-secure random bytes.
 *
 * Uses `crypto.randomBytes` (CSPRNG backed by `/dev/urandom` or equivalent).
 * Throws if `n` is not a positive finite integer.
 * @param n - Number of bytes (must be a positive finite integer).
 * @returns `n` random bytes.
 */
export declare function secureRandom(n: number): Buffer;
/**
 * Constant-time equality of two buffers.
 *
 * Returns `false` (rather than throwing) when the lengths differ — this is
 * the standard approach for compare-then-equal primitives, but callers
 * handling secrets of differing lengths should hash first to avoid leaking
 * length information.
 */
export declare function constantTimeEqual(a: Buffer, b: Buffer): boolean;
/**
 * Generate a random hex-encoded token of `bytes` entropy.
 * @param bytes - Number of random bytes (defaults to 32).
 * @returns 2*`bytes`-character hex string.
 */
export declare function randomToken(bytes?: number): string;
/**
 * Generate a UUID v4 using `crypto.randomUUID`.
 * @returns RFC-4122 v4 UUID string.
 */
export declare function uuid(): string;
//# sourceMappingURL=hashing.d.ts.map