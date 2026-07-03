/**
 * Cryptographic timestamping for the Manya Stamp tool.
 * Creates tamper-proof proofs that data existed at a specific point in time.
 */

import { createHash, randomBytes } from 'node:crypto';

/**
 * Creates a cryptographic timestamp proof for the given data.
 * @param {Buffer} data - The data to stamp.
 * @param {object} [options] - Stamp options.
 * @param {string} [options.algorithm='sha256'] - Hash algorithm.
 * @param {string} [options.issuer='manya'] - Stamp issuer identifier.
 * @param {string} [options.nonce] - Optional nonce for uniqueness.
 * @returns {{ hash: string, algorithm: string, timestamp: string, nonce: string, issuer: string, version: number }}
 */
export function stamp(data, options = {}) {
  if (!Buffer.isBuffer(data) || data.length === 0) {
    throw new Error('Data must be a non-empty Buffer');
  }
  const algorithm = options.algorithm || 'sha256';
  const nonce = options.nonce || randomBytes(16).toString('hex');
  const issuer = options.issuer || 'manya';
  const hash = createHash(algorithm).update(data).update(nonce).digest('hex');
  return {
    hash,
    algorithm,
    timestamp: new Date().toISOString(),
    nonce,
    issuer,
    version: 1,
  };
}

/**
 * Verifies that a stamp proof matches the given data.
 * @param {object} proof - The stamp proof to verify.
 * @param {Buffer} data - The original data.
 * @returns {{ valid: boolean, hash: string, expectedHash: string, timestamp: string }}
 */
export function verify(proof, data) {
  if (!proof || !proof.hash || !proof.nonce || !proof.algorithm) {
    throw new Error('Invalid stamp proof: missing required fields');
  }
  if (!Buffer.isBuffer(data) || data.length === 0) {
    throw new Error('Data must be a non-empty Buffer');
  }
  const expectedHash = createHash(proof.algorithm).update(data).update(proof.nonce).digest('hex');
  return {
    valid: proof.hash === expectedHash,
    hash: proof.hash,
    expectedHash,
    timestamp: proof.timestamp,
  };
}
