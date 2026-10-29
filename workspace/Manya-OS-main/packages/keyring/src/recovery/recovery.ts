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

import * as crypto from 'crypto';
import { RecoveryError } from '../errors.js';

// ----- GF(2^8) arithmetic with polynomial 0x11b -----

const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);

(function initTables(): void {
  // 2 (i.e., the residue of x) is NOT a primitive element of GF(2^8) modulo
  // the AES polynomial 0x11b — its order is only 51. We use 3 (= x + 1),
  // which IS primitive (order 255), as our generator α.
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    // Multiply by 3 = 2·x XOR x: first double-with-reduction, then XOR x.
    const doubled = (x << 1) ^ (x & 0x80 ? 0x11b : 0);
    x = (doubled ^ x) & 0xff;
  }
  // Duplicate the exp table so we can do additions of logs without modular
  // reduction in callers.
  for (let i = 255; i < 512; i++) {
    GF_EXP[i] = GF_EXP[i - 255];
  }
  GF_LOG[0] = 0; // log(0) is undefined; we guard against it in callers.
})();

/**
 * Multiply two field elements in GF(2^8).
 * @internal
 */
export function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[GF_LOG[a] + GF_LOG[b]];
}

/**
 * Divide two field elements. Throws on division by zero.
 * @internal
 */
export function gfDiv(a: number, b: number): number {
  if (b === 0) {
    throw new RecoveryError('GF(256) division by zero');
  }
  if (a === 0) return 0;
  return GF_EXP[(GF_LOG[a] - GF_LOG[b] + 255) % 255];
}

/**
 * Evaluate a polynomial at x in GF(2^8).
 * Coefficients are little-endian: coeffs[0] is the constant term.
 * @internal
 */
export function gfEval(coeffs: Uint8Array, x: number): number {
  let result = 0;
  for (let i = coeffs.length - 1; i >= 0; i--) {
    result = gfMul(result, x) ^ coeffs[i];
  }
  return result;
}

/**
 * Validate split parameters.
 */
function assertSplitParams(k: number, n: number): void {
  if (!Number.isInteger(k) || !Number.isInteger(n)) {
    throw new RecoveryError('k and n must be integers');
  }
  if (k < 2) {
    throw new RecoveryError(`k must be >= 2 (got ${k})`);
  }
  if (n < k) {
    throw new RecoveryError(`n must be >= k (got n=${n}, k=${k})`);
  }
  if (n > 255) {
    throw new RecoveryError(`n must be <= 255 (got ${n})`);
  }
}

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
export function shamirSplit(secret: Buffer, k: number, n: number): Buffer[] {
  if (!Buffer.isBuffer(secret)) {
    throw new RecoveryError('secret must be a Buffer');
  }
  if (secret.length === 0) {
    throw new RecoveryError('secret must be non-empty');
  }
  assertSplitParams(k, n);

  // Pre-generate one polynomial per byte position. Each polynomial has
  // degree k-1; coefficients[0] is the secret byte, the rest are random.
  const polys: Uint8Array[] = [];
  for (let pos = 0; pos < secret.length; pos++) {
    const coeffs = new Uint8Array(k);
    coeffs[0] = secret[pos];
    const rand = crypto.randomBytes(k - 1);
    for (let j = 1; j < k; j++) {
      coeffs[j] = rand[j - 1];
    }
    polys.push(coeffs);
  }

  const shares: Buffer[] = [];
  for (let i = 0; i < n; i++) {
    const x = i + 1; // x-coordinates are 1..n (0 is reserved for the secret)
    const out = Buffer.alloc(1 + secret.length);
    out[0] = x;
    for (let pos = 0; pos < secret.length; pos++) {
      out[1 + pos] = gfEval(polys[pos], x);
    }
    shares.push(out);
  }
  return shares;
}

/**
 * Reconstruct a secret from `>= k` shares using Lagrange interpolation at
 * x = 0.
 *
 * @param shares - At least `k` shares from the original split.
 * @returns Reconstructed secret.
 * @throws {@link RecoveryError} for invalid input.
 */
export function shamirCombine(shares: Buffer[]): Buffer {
  if (!Array.isArray(shares) || shares.length < 2) {
    throw new RecoveryError('need at least 2 shares to combine');
  }
  // Validate shares have consistent length and unique x-coordinates.
  const len = shares[0].length;
  if (len < 2) {
    throw new RecoveryError('share too short (must be >= 2 bytes)');
  }
  const xs: number[] = [];
  for (let i = 0; i < shares.length; i++) {
    if (!Buffer.isBuffer(shares[i])) {
      throw new RecoveryError(`share ${i} is not a Buffer`);
    }
    if (shares[i].length !== len) {
      throw new RecoveryError('all shares must have the same length');
    }
    if (shares[i][0] === 0) {
      throw new RecoveryError('share x-coordinate must be non-zero');
    }
    xs.push(shares[i][0]);
  }
  // Detect duplicate x-coordinates.
  const seen = new Set<number>();
  for (const x of xs) {
    if (seen.has(x)) {
      throw new RecoveryError(`duplicate share x-coordinate: ${x}`);
    }
    seen.add(x);
  }

  const secretLen = len - 1;
  const out = Buffer.alloc(secretLen);
  for (let pos = 0; pos < secretLen; pos++) {
    let secret = 0;
    for (let i = 0; i < shares.length; i++) {
      const xi = xs[i];
      const yi = shares[i][1 + pos];
      let num = 1;
      let den = 1;
      for (let j = 0; j < shares.length; j++) {
        if (i === j) continue;
        const xj = xs[j];
        // Lagrange basis evaluated at 0: prod (0 - xj) / (xi - xj)
        // In GF(2^8), subtraction == addition (XOR).
        num = gfMul(num, xj);
        den = gfMul(den, xi ^ xj);
      }
      const term = gfMul(yi, gfDiv(num, den));
      secret ^= term;
    }
    out[pos] = secret;
  }
  return out;
}

/**
 * Verify that a set of shares is internally consistent: any `k`-subset
 * reconstructs the same secret. Useful for testing and audit.
 *
 * @param shares - Shares to verify.
 * @param k - Threshold.
 * @returns `true` iff every k-subset reconstructs the same secret.
 */
export function verifySharesConsistent(shares: Buffer[], k: number): boolean {
  if (shares.length < k) return false;
  let reference: Buffer | null = null;
  // Iterate over all k-subsets.
  const indices: number[] = [];
  for (let i = 0; i < k; i++) indices.push(i);

  // Helper: next k-subset in lexicographic order.
  const nextSubset = (): boolean => {
    let i = k - 1;
    while (i >= 0 && indices[i] === shares.length - k + i) i--;
    if (i < 0) return false;
    indices[i]++;
    for (let j = i + 1; j < k; j++) indices[j] = indices[j - 1] + 1;
    return true;
  };

  do {
    const subset = indices.map((idx) => shares[idx]);
    const recovered = shamirCombine(subset);
    if (reference === null) {
      reference = recovered;
    } else if (!recovered.equals(reference)) {
      return false;
    }
  } while (nextSubset());

  return true;
}
