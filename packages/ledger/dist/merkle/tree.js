"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.MerkleTree = void 0;
const errors_js_1 = require("../errors.js");
const hashing_js_1 = require("../crypto/hashing.js");
const proof_js_1 = require("./proof.js");
/** Domain-separation prefix for leaf nodes per RFC 6962. */
const LEAF_PREFIX = Buffer.from([0x00]);
/** Domain-separation prefix for inner (parent) nodes per RFC 6962. */
const INNER_PREFIX = Buffer.from([0x01]);
/**
 * Binary Merkle tree over SHA-256 leaf hashes.
 *
 * Use {@link MerkleTree.build} to construct a tree from raw leaf bytes.
 */
class MerkleTree {
    levels;
    leafCount;
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
    static build(leaves) {
        if (!Array.isArray(leaves) || leaves.length === 0) {
            throw new errors_js_1.MerkleError('MerkleTree.build: leaves must be a non-empty array');
        }
        for (let i = 0; i < leaves.length; i++) {
            if (!Buffer.isBuffer(leaves[i])) {
                throw new errors_js_1.MerkleError(`MerkleTree.build: leaf ${i} is not a Buffer`);
            }
        }
        // Compute leaf-level hashes (with prefix).
        let level = leaves.map((l) => (0, hashing_js_1.sha256)(Buffer.concat([LEAF_PREFIX, l])));
        const levels = [level];
        // Build up to the root.
        while (level.length > 1) {
            const next = [];
            const padded = level.length % 2 === 1 ? [...level, level[level.length - 1]] : level;
            for (let i = 0; i < padded.length; i += 2) {
                next.push((0, hashing_js_1.sha256)(Buffer.concat([INNER_PREFIX, padded[i], padded[i + 1]])));
            }
            levels.push(next);
            level = next;
        }
        return new MerkleTree(levels, leaves.length);
    }
    constructor(levels, leafCount) {
        this.levels = levels;
        this.leafCount = leafCount;
    }
    /** The Merkle root (32-byte SHA-256 digest). */
    root() {
        const top = this.levels[this.levels.length - 1];
        return Buffer.from(top[0]);
    }
    /**
     * Produce an inclusion proof for the leaf at `index`.
     *
     * @param index - 0-based leaf index.
     * @returns A {@link MerkleProof} (index + siblings).
     * @throws {@link MerkleError} if `index` is out of range.
     */
    getProof(index) {
        if (!Number.isInteger(index) || index < 0 || index >= this.leafCount) {
            throw new errors_js_1.MerkleError(`getProof: index ${index} out of range [0, ${this.leafCount})`);
        }
        const siblings = [];
        let idx = index;
        for (let level = 0; level < this.levels.length - 1; level++) {
            const nodes = this.levels[level];
            // Determine the sibling index. When the level has odd arity and the
            // current node is the last one, the sibling is itself (duplicate).
            const siblingIdx = idx % 2 === 0 ? idx + 1 : idx - 1;
            // If the sibling index is out of range (odd arity at the boundary),
            // the sibling is the current node itself.
            let siblingHash;
            if (siblingIdx < nodes.length) {
                siblingHash = nodes[siblingIdx];
            }
            else {
                siblingHash = nodes[idx];
            }
            const side = idx % 2 === 0 ? 'right' : 'left';
            siblings.push({ hash: Buffer.from(siblingHash), side });
            idx = Math.floor(idx / 2);
        }
        return { index, siblings };
    }
    /**
     * Verify an inclusion proof against this tree's root.
     *
     * Convenience wrapper around {@link verifyProof} that uses the tree's root.
     *
     * @param leaf - The original leaf bytes.
     * @param proof - The inclusion proof.
     * @returns `true` iff the proof reconstructs the tree's root.
     */
    verifyProof(leaf, proof) {
        return (0, proof_js_1.verifyProof)(leaf, proof, this.root());
    }
}
exports.MerkleTree = MerkleTree;
//# sourceMappingURL=tree.js.map