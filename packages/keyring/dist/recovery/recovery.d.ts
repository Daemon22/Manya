/**
 * @manya-os/keyring — Shamir Secret Sharing over GF(2^8).
 *
 * Implements real (k-of-n) secret sharing using the irreducible polynomial
 * 0x11b (AES field polynomial). Each byte of the secret is shared
 * independently: a random polynomial f(x) of degree k-1 with f(0) = secret
 * is generated, and share i = f(i+1).
 *
 * Combine uses Lagrange interpolation at x = 0.
 *
 * Share format: a Buffer of length `1 + secret.length`, where the first byte
 * is the x-coordinate (share id, 1..255) and the remaining bytes are the
 * y-coordinates for each byte-position of the secret.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
/**
 * Multiply two field elements in GF(2^8).
 * @internal
 */
export declare function gfMul(a: number, b: number): number;
/**
 * Divide two field elements. Throws on division by zero.
 * @internal
 */
export declare function gfDiv(a: number, b: number): number;
/**
 * Evaluate a polynomial at x in GF(2^8).
 * Coefficients are little-endian: coeffs[0] is the constant term.
 * @internal
 */
export declare function gfEval(coeffs: Uint8Array, x: number): number;
/**
 * Split a secret into `n` shares, any `k` of which can recombine.
 *
 * For each byte position of the secret, a fresh random polynomial of degree
 * `k - 1` is generated with its constant term equal to the secret byte. The
 * polynomial is then evaluated at `x = 1..n` to produce the `n` shares.
 *
 * @param secret - Secret bytes to split.
 * @param k - Threshold number of shares required to reconstruct.
 * @param n - Total number of shares to produce.
 * @returns Array of `n` share Buffers.
 * @throws {@link RecoveryError} for invalid parameters.
 */
export declare function shamirSplit(secret: Buffer, k: number, n: number): Buffer[];
/**
 * Reconstruct a secret from `>= k` shares using Lagrange interpolation at
 * x = 0.
 *
 * @param shares - At least `k` shares from the original split.
 * @returns Reconstructed secret.
 * @throws {@link RecoveryError} for invalid input.
 */
export declare function shamirCombine(shares: Buffer[]): Buffer;
/**
 * Verify that a set of shares is internally consistent: any `k`-subset
 * reconstructs the same secret. Useful for testing and audit.
 *
 * @param shares - Shares to verify.
 * @param k - Threshold.
 * @returns `true` iff every k-subset reconstructs the same secret.
 */
export declare function verifySharesConsistent(shares: Buffer[], k: number): boolean;
//# sourceMappingURL=recovery.d.ts.map