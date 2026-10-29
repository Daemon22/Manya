/**
 * @manya-os/ledger — Merkle proof type and verifier.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Conceived, directed, and owned by Uviwe Menyiwe (Azura Daemon), founder
 * of the Manya Hael Foundation.
 *
 * Licensed under the Apache License, Version 2.0.
 */
import type { MerkleProof } from '../types.js';
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
export declare function verifyProof(leaf: Buffer, proof: MerkleProof, root: Buffer): boolean;
//# sourceMappingURL=proof.d.ts.map