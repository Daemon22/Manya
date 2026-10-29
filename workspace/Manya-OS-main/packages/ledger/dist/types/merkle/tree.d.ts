/**
 * @manya-os/ledger — Merkle tree.
 *
 * A binary Merkle tree built from leaf hashes using SHA-256, with RFC 6962
 * domain separation:
 *   - leaf hash:  `H(0x00 || leaf)`
 *   - inner hash: `H(0x01 || left || right)`
 *
 * Odd-arity handling: when a level has an odd number of nodes, the LAST node
 * is duplicated before pairing (RFC 6962 "duplicate last leaf" strategy).
 *
 * The tree is built eagerly (all intermediate hashes computed at construction
 * time) so subsequent `getProof` calls are O(log n) without re-hashing.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Conceived, directed, and owned by Uviwe Menyiwe (Azura Daemon), founder
 * of the Manya Hael Foundation.
 *
 * Licensed under the Apache License, Version 2.0.
 */
import type { MerkleProof } from '../types.js';
/**
 * Binary Merkle tree over SHA-256 leaf hashes.
 *
 * Use {@link MerkleTree.build} to construct a tree from raw leaf bytes.
 */
export declare class MerkleTree {
    private readonly levels;
    readonly leafCount: number;
    /**
     * Build a Merkle tree from raw leaf bytes.
     *
     * Each leaf is hashed with the RFC 6962 leaf prefix (`H(0x00 || leaf)`).
     * Empty input is rejected.
     *
     * @param leaves - Raw leaf bytes (non-empty array of Buffers).
     * @returns A built Merkle tree.
     * @throws {@link MerkleError} if `leaves` is empty or contains non-Buffer values.
     */
    static build(leaves: Buffer[]): MerkleTree;
    private constructor();
    /** The Merkle root (32-byte SHA-256 digest). */
    root(): Buffer;
    /**
     * Produce an inclusion proof for the leaf at `index`.
     *
     * @param index - 0-based leaf index.
     * @returns A {@link MerkleProof} (index + siblings).
     * @throws {@link MerkleError} if `index` is out of range.
     */
    getProof(index: number): MerkleProof;
    /**
     * Verify an inclusion proof against this tree's root.
     *
     * Convenience wrapper around {@link verifyProof} that uses the tree's root.
     *
     * @param leaf - The original leaf bytes.
     * @param proof - The inclusion proof.
     * @returns `true` iff the proof reconstructs the tree's root.
     */
    verifyProof(leaf: Buffer, proof: MerkleProof): boolean;
}
//# sourceMappingURL=tree.d.ts.map