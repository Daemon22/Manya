/**
 * @manya-os/ledger — Merkle proof type and verifier.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Conceived, directed, and owned by Uviwe Menyiwe (Azura Daemon), founder
 * of the Manya Hael Foundation.
 *
 * Licensed under the Apache License, Version 2.0.
 */

import * as crypto from 'crypto';
import { MerkleError } from '../errors.js';
import type { MerkleProof } from '../types.js';
import { sha256 } from '../crypto/hashing.js';

/**
 * Verify a Merkle inclusion proof.
 *
 * Reconstructs the root by repeatedly hashing `leaf` (or the running hash)
 * with each sibling in the proof, then compares the result to `root` using
 * a constant-time equality.
 *
 * @param leaf - The leaf hash being proved.
 * @param proof - The inclusion proof (siblings + sides).
 * @param root - The expected Merkle root.
 * @returns `true` iff the proof reconstructs `root`.
 */
export function verifyProof(
  leaf: Buffer,
  proof: MerkleProof,
  root: Buffer
): boolean {
  if (!Buffer.isBuffer(leaf) || !Buffer.isBuffer(root)) {
    throw new MerkleError('verifyProof: leaf and root must be Buffers');
  }
  if (!proof || !Array.isArray(proof.siblings)) {
    throw new MerkleError('verifyProof: proof.siblings must be an array');
  }
  let acc: Buffer = Buffer.from(leaf); // defensive copy
  for (const step of proof.siblings) {
    if (!step || !Buffer.isBuffer(step.hash)) {
      throw new MerkleError('verifyProof: each sibling must have a Buffer hash');
    }
    if (step.side !== 'left' && step.side !== 'right') {
      throw new MerkleError('verifyProof: sibling.side must be "left" or "right"');
    }
    // Domain-separated concatenation: 0x01 prefix for inner nodes (RFC 6962).
    if (step.side === 'left') {
      acc = sha256(Buffer.concat([INNER_PREFIX, step.hash, acc])) as Buffer;
    } else {
      acc = sha256(Buffer.concat([INNER_PREFIX, acc, step.hash])) as Buffer;
    }
  }
  // Constant-time compare.
  if (acc.length !== root.length) return false;
  return crypto.timingSafeEqual(acc, root);
}

/** Domain-separation prefix for inner (parent) nodes per RFC 6962. */
const INNER_PREFIX = Buffer.from([0x01]);
