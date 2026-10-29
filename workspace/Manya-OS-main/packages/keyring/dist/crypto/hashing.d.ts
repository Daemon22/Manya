/**
 * @manya-os/keyring — hashing primitives.
 *
 * Thin wrappers around Node `crypto` that surface typed errors.
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
 * HKDF-SHA256 extract-and-expand.
 * @param ikm - Input keying material.
 * @param salt - Salt (may be empty).
 * @param info - Context/application info (may be empty).
 * @param length - Output length in bytes (≤ 255 × 32).
 * @returns Derived key material of `length` bytes.
 */
export declare function hkdf(ikm: Buffer, salt: Buffer, info: Buffer, length: number): Buffer;
/**
 * PBKDF2 password-based key derivation.
 * @param passphrase - User passphrase.
 * @param salt - Salt.
 * @param iterations - Iteration count.
 * @param keyLen - Output length in bytes.
 * @param algo - PRF hash. Defaults to `sha512`.
 * @returns Derived key.
 */
export declare function pbkdf2(passphrase: string | Buffer, salt: Buffer, iterations: number, keyLen: number, algo?: 'sha256' | 'sha512'): Buffer;
/**
 * Constant-time equality of two buffers.
 * Returns `false` (rather than throwing) when the lengths differ.
 */
export declare function constantTimeEqual(a: Buffer, b: Buffer): boolean;
//# sourceMappingURL=hashing.d.ts.map