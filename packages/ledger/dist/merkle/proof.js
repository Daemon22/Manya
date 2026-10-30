"use strict";
/**
 * @manya-os/ledger — Merkle proof type and verifier.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Conceived, directed, and owned by Uviwe Menyiwe (Azura Daemon), founder
 * of the Manya Hael Foundation.
 *
 * Licensed under the Apache License, Version 2.0.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyProof = verifyProof;
const crypto = __importStar(require("crypto"));
const errors_js_1 = require("../errors.js");
const hashing_js_1 = require("../crypto/hashing.js");
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
function verifyProof(leaf, proof, root) {
    if (!Buffer.isBuffer(leaf) || !Buffer.isBuffer(root)) {
        throw new errors_js_1.MerkleError('verifyProof: leaf and root must be Buffers');
    }
    if (!proof || !Array.isArray(proof.siblings)) {
        throw new errors_js_1.MerkleError('verifyProof: proof.siblings must be an array');
    }
    let acc = Buffer.from(leaf); // defensive copy
    for (const step of proof.siblings) {
        if (!step || !Buffer.isBuffer(step.hash)) {
            throw new errors_js_1.MerkleError('verifyProof: each sibling must have a Buffer hash');
        }
        if (step.side !== 'left' && step.side !== 'right') {
            throw new errors_js_1.MerkleError('verifyProof: sibling.side must be "left" or "right"');
        }
        // Domain-separated concatenation: 0x01 prefix for inner nodes (RFC 6962).
        if (step.side === 'left') {
            acc = (0, hashing_js_1.sha256)(Buffer.concat([INNER_PREFIX, step.hash, acc]));
        }
        else {
            acc = (0, hashing_js_1.sha256)(Buffer.concat([INNER_PREFIX, acc, step.hash]));
        }
    }
    // Constant-time compare.
    if (acc.length !== root.length)
        return false;
    return crypto.timingSafeEqual(acc, root);
}
/** Domain-separation prefix for inner (parent) nodes per RFC 6962. */
const INNER_PREFIX = Buffer.from([0x01]);
//# sourceMappingURL=proof.js.map