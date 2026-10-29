/**
 * Multi-algorithm hashing for the Manya Forge tool.
 * Supports SHA-256, SHA-384, SHA-512, SHA3-256, SHA3-512, and BLAKE2b-512.
 */

import { createHash, randomBytes } from 'node:crypto';

/** Algorithms supported by this module. */
const SUPPORTED_ALGORITHMS = new Set([
  'sha256', 'sha384', 'sha512',
  'sha3-256', 'sha3-512',
  'blake2b512',
]);

/** Digest output lengths in bytes per algorithm. */
const DIGEST_LENGTHS = {
  'sha256': 32,
  'sha384': 48,
  'sha512': 64,
  'sha3-256': 32,
  'sha3-512': 64,
  'blake2b512': 64,
};

/**
 * Hashes data with the specified algorithm.
 * @param {Buffer} data - The data to hash.
 * @param {string} algorithm - One of the supported hash algorithms.
 * @returns {{ digest: string, algorithm: string, length: number }}
 * @throws {Error} If the algorithm is not supported.
 */
export function hash(data, algorithm) {
  if (!SUPPORTED_ALGORITHMS.has(algorithm)) {
    throw new Error(
      `Unsupported algorithm "${algorithm}". Supported: ${[...SUPPORTED_ALGORITHMS].join(', ')}`,
    );
  }
  const digest = createHash(algorithm).update(data).digest('hex');
  return {
    digest,
    algorithm,
    length: DIGEST_LENGTHS[algorithm],
  };
}

/**
 * Hashes data with an optional salt prepended.
 * @param {Buffer} data - The data to hash.
 * @param {string} algorithm - One of the supported hash algorithms.
 * @param {Buffer} [salt] - Optional salt (16 bytes). Generated randomly if omitted.
 * @returns {{ digest: string, algorithm: string, salt: string, length: number }}
 * @throws {Error} If the algorithm is not supported.
 */
export function hashWithSalt(data, algorithm, salt) {
  if (!SUPPORTED_ALGORITHMS.has(algorithm)) {
    throw new Error(
      `Unsupported algorithm "${algorithm}". Supported: ${[...SUPPORTED_ALGORITHMS].join(', ')}`,
    );
  }
  const usedSalt = salt ?? randomBytes(16);
  const digest = createHash(algorithm).update(usedSalt).update(data).digest('hex');
  return {
    digest,
    algorithm,
    salt: usedSalt.toString('hex'),
    length: DIGEST_LENGTHS[algorithm],
  };
}
