import * as crypto from 'crypto';
import {
  shamirSplit,
  shamirCombine,
  gfMul,
  gfDiv,
  gfEval,
  verifySharesConsistent,
  RecoveryError,
} from '@manya-os/keyring';

describe('Shamir Secret Sharing over GF(256)', () => {
  it('gfMul: 0 * x = 0', () => {
    expect(gfMul(0, 5)).toBe(0);
    expect(gfMul(5, 0)).toBe(0);
  });

  it('gfMul: 1 * x = x', () => {
    expect(gfMul(1, 5)).toBe(5);
    expect(gfMul(5, 1)).toBe(5);
  });

  it('gfMul is commutative', () => {
    for (let i = 0; i < 20; i++) {
      const a = crypto.randomInt(1, 256);
      const b = crypto.randomInt(1, 256);
      expect(gfMul(a, b)).toBe(gfMul(b, a));
    }
  });

  it('gfDiv: a / a = 1 for any nonzero a', () => {
    for (let i = 0; i < 20; i++) {
      const a = crypto.randomInt(1, 256);
      expect(gfDiv(a, a)).toBe(1);
    }
  });

  it('gfDiv: a / b * b = a for nonzero b', () => {
    for (let i = 0; i < 20; i++) {
      const a = crypto.randomInt(0, 256);
      const b = crypto.randomInt(1, 256);
      expect(gfMul(gfDiv(a, b), b)).toBe(a);
    }
  });

  it('gfDiv throws on division by zero', () => {
    expect(() => gfDiv(5, 0)).toThrow(RecoveryError);
  });

  it('gfEval: constant polynomial', () => {
    const c = new Uint8Array([42]);
    expect(gfEval(c, 1)).toBe(42);
    expect(gfEval(c, 100)).toBe(42);
  });

  it('gfEval: linear polynomial f(x) = a + b*x', () => {
    // f(x) = 3 + 5*x → f(2) = 3 + 5*2 = 3 XOR gfMul(5,2)
    const c = new Uint8Array([3, 5]);
    const expected = 3 ^ gfMul(5, 2);
    expect(gfEval(c, 2)).toBe(expected);
  });

  it('splits a secret into n shares (k=3, n=5)', () => {
    const secret = crypto.randomBytes(32);
    const shares = shamirSplit(secret, 3, 5);
    expect(shares.length).toBe(5);
    for (const s of shares) {
      expect(s.length).toBe(secret.length + 1);
      expect(s[0]).toBeGreaterThanOrEqual(1);
      expect(s[0]).toBeLessThanOrEqual(5);
    }
    // All x-coordinates must be distinct.
    const xs = new Set(shares.map((s) => s[0]));
    expect(xs.size).toBe(5);
  });

  it('combines with exactly k shares', () => {
    const secret = crypto.randomBytes(64);
    const shares = shamirSplit(secret, 3, 5);
    const recovered = shamirCombine(shares.slice(0, 3));
    expect(recovered.equals(secret)).toBe(true);
  });

  it('combines with any k-of-n subset', () => {
    const secret = crypto.randomBytes(32);
    const shares = shamirSplit(secret, 3, 5);
    // Try a few different subsets of size 3.
    const subsets = [
      [0, 1, 2],
      [0, 2, 4],
      [1, 3, 4],
      [2, 3, 4],
    ];
    for (const idxs of subsets) {
      const recovered = shamirCombine(idxs.map((i) => shares[i]));
      expect(recovered.equals(secret)).toBe(true);
    }
  });

  it('combines with more than k shares (extra shares ok)', () => {
    const secret = crypto.randomBytes(16);
    const shares = shamirSplit(secret, 2, 5);
    const recovered = shamirCombine(shares);
    expect(recovered.equals(secret)).toBe(true);
  });

  it('fails to combine with fewer than k shares (wrong result)', () => {
    const secret = crypto.randomBytes(32);
    const shares = shamirSplit(secret, 3, 5);
    // 2 shares should NOT reconstruct the secret.
    const recovered = shamirCombine([shares[0], shares[1]]);
    expect(recovered.equals(secret)).toBe(false);
  });

  it('throws on invalid split params', () => {
    expect(() => shamirSplit(Buffer.from('x'), 1, 5)).toThrow(RecoveryError); // k < 2
    expect(() => shamirSplit(Buffer.from('x'), 5, 3)).toThrow(RecoveryError); // n < k
    expect(() => shamirSplit(Buffer.from('x'), 2, 256)).toThrow(RecoveryError); // n > 255
    expect(() => shamirSplit(Buffer.alloc(0), 2, 3)).toThrow(RecoveryError); // empty
  });

  it('throws on combine with < 2 shares', () => {
    expect(() => shamirCombine([])).toThrow(RecoveryError);
    expect(() => shamirCombine([Buffer.from([1, 2])])).toThrow(RecoveryError);
  });

  it('throws on duplicate x-coordinates', () => {
    const secret = crypto.randomBytes(8);
    const shares = shamirSplit(secret, 2, 3);
    // Make two shares have the same x-coordinate.
    const dup = [
      Buffer.from(shares[0]),
      Buffer.from(shares[0]),
    ];
    expect(() => shamirCombine(dup)).toThrow(RecoveryError);
  });

  it('throws on inconsistent share lengths', () => {
    const secret = crypto.randomBytes(8);
    const shares = shamirSplit(secret, 2, 3);
    const bad = [shares[0], Buffer.from([2, 1, 2, 3, 4, 5, 6, 7, 8, 9])];
    expect(() => shamirCombine(bad)).toThrow(RecoveryError);
  });

  it('throws on x-coordinate of 0', () => {
    const secret = crypto.randomBytes(8);
    const shares = shamirSplit(secret, 2, 3);
    shares[0][0] = 0;
    expect(() => shamirCombine(shares)).toThrow(RecoveryError);
  });

  it('handles single-byte secret', () => {
    const secret = Buffer.from([42]);
    const shares = shamirSplit(secret, 2, 3);
    const recovered = shamirCombine([shares[0], shares[1]]);
    expect(recovered[0]).toBe(42);
  });

  it('verifySharesConsistent returns true for valid shares', () => {
    const secret = crypto.randomBytes(16);
    const shares = shamirSplit(secret, 3, 5);
    expect(verifySharesConsistent(shares, 3)).toBe(true);
  });

  it('verifySharesConsistent returns false for tampered shares', () => {
    const secret = crypto.randomBytes(16);
    const shares = shamirSplit(secret, 3, 5);
    // Tamper with one share's y-byte.
    shares[1][1] ^= 0xff;
    expect(verifySharesConsistent(shares, 3)).toBe(false);
  });

  it('randomized: many k/n combinations round-trip', () => {
    for (let iter = 0; iter < 10; iter++) {
      const k = crypto.randomInt(2, 6);
      const n = crypto.randomInt(k, 8);
      const len = crypto.randomInt(1, 65);
      const secret = crypto.randomBytes(len);
      const shares = shamirSplit(secret, k, n);
      // Pick k random distinct shares.
      const indices = new Set<number>();
      while (indices.size < k) {
        indices.add(crypto.randomInt(0, n));
      }
      const subset = Array.from(indices).map((i) => shares[i]);
      const recovered = shamirCombine(subset);
      expect(recovered.equals(secret)).toBe(true);
    }
  });
});
