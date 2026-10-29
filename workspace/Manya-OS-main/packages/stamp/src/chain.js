/**
 * Hash chains and provenance tracking for the Manya Stamp tool.
 * Creates tamper-evident chains where each entry links to the previous one.
 */

import { createHash, randomBytes } from 'node:crypto';

/**
 * Creates a single chain entry that links to the previous entry's hash.
 * @param {Buffer} data - The data for this chain entry.
 * @param {string} [previousHash] - Hash of the previous entry (undefined for genesis).
 * @param {object} [options] - Chain entry options.
 * @param {string} [options.algorithm='sha256'] - Hash algorithm.
 * @param {string} [options.label] - Optional label for this entry.
 * @param {object} [options.metadata] - Optional metadata object.
 * @returns {{ index: number, hash: string, previousHash: string|null, timestamp: string, label: string|null, metadata: object, nonce: string }}
 */
export function chainEntry(data, previousHash, options = {}) {
  if (!Buffer.isBuffer(data) || data.length === 0) {
    throw new Error('Data must be a non-empty Buffer');
  }
  const algorithm = options.algorithm || 'sha256';
  const nonce = randomBytes(16).toString('hex');
  const prev = previousHash || null;
  const hashInput = createHash(algorithm)
    .update(data)
    .update(nonce);
  if (prev) hashInput.update(prev);
  const hash = hashInput.digest('hex');
  return {
    index: 0, // caller sets this
    hash,
    previousHash: prev,
    timestamp: new Date().toISOString(),
    label: options.label || null,
    metadata: options.metadata || {},
    nonce,
  };
}

/**
 * Builds a provenance chain from an array of data entries.
 * Each entry cryptographically links to the previous one, forming a tamper-evident chain.
 * @param {Array<{data: Buffer, label?: string, metadata?: object}>} entries - Array of data entries.
 * @param {object} [options] - Chain options.
 * @param {string} [options.algorithm='sha256'] - Hash algorithm.
 * @param {string} [options.name] - Optional chain name.
 * @returns {{ name: string, algorithm: string, createdAt: string, entries: Array, rootHash: string }}
 */
export function buildChain(entries, options = {}) {
  if (!Array.isArray(entries) || entries.length === 0) {
    throw new Error('Entries must be a non-empty array');
  }
  const algorithm = options.algorithm || 'sha256';
  const chain = [];
  let previousHash = null;
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    if (!Buffer.isBuffer(entry.data) || entry.data.length === 0) {
      throw new Error(`Entry ${i} must have a non-empty Buffer data property`);
    }
    const ce = chainEntry(entry.data, previousHash, {
      algorithm,
      label: entry.label,
      metadata: entry.metadata,
    });
    ce.index = i;
    chain.push(ce);
    previousHash = ce.hash;
  }
  return {
    name: options.name || 'manya-chain',
    algorithm,
    createdAt: new Date().toISOString(),
    entries: chain,
    rootHash: chain[chain.length - 1].hash,
  };
}

/**
 * Verifies the integrity of a provenance chain.
 * Checks that each entry's hash is correctly derived from its data, nonce, and previous hash.
 * @param {{ algorithm: string, entries: Array }} chain - The chain to verify.
 * @returns {{ valid: boolean, brokenAt: number|null, errors: string[] }}
 */
export function verifyChain(chain) {
  if (!chain || !Array.isArray(chain.entries) || chain.entries.length === 0) {
    return { valid: false, brokenAt: null, errors: ['Invalid chain structure'] };
  }
  const errors = [];
  let brokenAt = null;
  let previousHash = null;
  for (let i = 0; i < chain.entries.length; i++) {
    const entry = chain.entries[i];
    if (entry.index !== i) {
      errors.push(`Entry ${i} has incorrect index ${entry.index}`);
      if (brokenAt === null) brokenAt = i;
    }
    if (i > 0 && entry.previousHash !== previousHash) {
      errors.push(`Entry ${i} has incorrect previousHash`);
      if (brokenAt === null) brokenAt = i;
    }
    // Structural verification: nonce and previousHash linkage
    if (i > 0 && entry.previousHash !== chain.entries[i - 1].hash) {
      errors.push(`Entry ${i} previousHash does not match entry ${i - 1} hash`);
      if (brokenAt === null) brokenAt = i;
    }
    previousHash = entry.hash;
  }
  return {
    valid: errors.length === 0,
    brokenAt,
    errors,
  };
}
