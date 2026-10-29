"use strict";
/**
 * @manya-os/keyring — Identity (sovereign, did:key-style).
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
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
exports.Identity = void 0;
exports.base58Encode = base58Encode;
exports.deriveDidKey = deriveDidKey;
const crypto = __importStar(require("crypto"));
const crypto_1 = require("crypto");
const errors_js_1 = require("../errors.js");
const keys_js_1 = require("../crypto/keys.js");
const hashing_js_1 = require("../crypto/hashing.js");
/**
 * Base58-Bitcoin alphabet (used by did:key / multibase 'z').
 */
const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
/**
 * Encode bytes as base58 (Bitcoin alphabet).
 * @internal
 */
function base58Encode(input) {
    if (input.length === 0)
        return '';
    // Count leading zero bytes — each encodes to a single '1'.
    let zeros = 0;
    while (zeros < input.length && input[zeros] === 0)
        zeros++;
    // Big-endian byte array → big-endian base58 digits (stored LSB-first).
    const digits = [];
    for (let i = zeros; i < input.length; i++) {
        let carry = input[i];
        for (let j = 0; j < digits.length; j++) {
            carry += digits[j] << 8;
            digits[j] = carry % 58;
            carry = (carry / 58) | 0;
        }
        while (carry > 0) {
            digits.push(carry % 58);
            carry = (carry / 58) | 0;
        }
    }
    let out = '';
    for (let i = 0; i < zeros; i++)
        out += BASE58_ALPHABET[0];
    for (let i = digits.length - 1; i >= 0; i--) {
        out += BASE58_ALPHABET[digits[i]];
    }
    return out;
}
/**
 * Derive a did:key-style DID from a public key + algorithm.
 *
 * The format is `did:key:z<base58(algo-prefix || key-material)>` where:
 * - `algo-prefix` is `0x85 0x1a` (custom marker for RSA-PSS) followed by
 *   `sha256(spki-der)`, OR `0x12 0x00` (multicodec secp256r1-pub) followed
 *   by the raw P-256 point bytes.
 *
 * The `z` prefix follows the multibase spec for base58btc. This is a
 * deterministic, stable derivation: the same key always produces the same DID.
 *
 * @param publicKey - Public KeyObject or PEM string.
 * @param algorithm - Signature algorithm.
 */
function deriveDidKey(publicKey, algorithm) {
    try {
        const keyObj = typeof publicKey === 'string'
            ? crypto.createPublicKey(publicKey)
            : publicKey;
        let body;
        if (algorithm === 'rsa-pss') {
            // Use SHA-256 of the SPKI DER — keeps the DID short for RSA keys.
            const spkiDer = (0, keys_js_1.exportPublicRaw)(keyObj);
            const digest = (0, hashing_js_1.sha256)(spkiDer);
            // Custom prefix: marker byte 0x85 + 0x1a (RSA-PSS in manya) + digest.
            body = Buffer.concat([Buffer.from([0x85, 0x1a]), digest]);
        }
        else {
            // P-256: export raw uncompressed point (0x04 || X || Y).
            const raw = keyObj.export({ type: 'spki', format: 'der' });
            // SPKI for EC keys ends with the SEC1 point. We prefix with multicodec
            // secp256r1-pub (0x1200) for did:key interop.
            body = Buffer.concat([Buffer.from([0x12, 0x00]), raw]);
        }
        return 'did:key:z' + base58Encode(body);
    }
    catch (err) {
        throw new errors_js_1.KeyGenerationError('deriveDidKey failed: ' + err.message, err);
    }
}
/**
 * A sovereign identity. Holds the *public* form of a keypair — never the
 * private key. The associated private key is held by a
 * {@link HardwareKeyProvider} and addressed by key id (see
 * {@link KeyringWallet}).
 */
class Identity {
    /** UUID v4. */
    id;
    /** did:key-style DID derived from the public key. */
    did;
    /** SPKI PEM-encoded public key. */
    publicKey;
    /** Signature algorithm. */
    algorithm;
    /** ISO-8601 creation timestamp. */
    createdAt;
    /** Free-form public metadata (e.g. agent name, profile URL). */
    metadata;
    constructor(params) {
        this.id = params.id ?? (0, crypto_1.randomUUID)();
        this.did = params.did;
        this.publicKey = params.publicKey;
        this.algorithm = params.algorithm;
        this.createdAt = params.createdAt ?? new Date().toISOString();
        this.metadata = params.metadata ?? {};
    }
    /**
     * Construct an {@link Identity} from a PEM-encoded public key + algorithm.
     */
    static fromPublicKey(publicKeyPem, algorithm, metadata = {}) {
        const did = deriveDidKey(publicKeyPem, algorithm);
        return new Identity({
            did,
            publicKey: publicKeyPem,
            algorithm,
            metadata,
        });
    }
    /** Short hex fingerprint of the public key (SHA-256 of DER). */
    fingerprint() {
        return (0, keys_js_1.getKeyFingerprint)(this.publicKey);
    }
    /** Serialize to a plain object suitable for JSON. */
    serialize() {
        return {
            id: this.id,
            did: this.did,
            publicKey: this.publicKey,
            algorithm: this.algorithm,
            createdAt: this.createdAt,
            metadata: this.metadata,
        };
    }
    /** Deserialize from a plain object. */
    static deserialize(data) {
        if (!data || typeof data !== 'object') {
            throw new errors_js_1.KeyringError('Identity.deserialize: expected object', 'IDENTITY_DESERIALIZE_ERROR');
        }
        const required = ['id', 'did', 'publicKey', 'algorithm', 'createdAt'];
        for (const key of required) {
            if (!(key in data)) {
                throw new errors_js_1.KeyringError(`Identity.deserialize: missing field '${key}'`, 'IDENTITY_DESERIALIZE_ERROR');
            }
        }
        if (data.algorithm !== 'rsa-pss' && data.algorithm !== 'ecdsa-p256') {
            throw new errors_js_1.KeyringError(`Identity.deserialize: unsupported algorithm '${data.algorithm}'`, 'IDENTITY_DESERIALIZE_ERROR');
        }
        return new Identity({
            id: data.id,
            did: data.did,
            publicKey: data.publicKey,
            algorithm: data.algorithm,
            createdAt: data.createdAt,
            metadata: data.metadata ?? {},
        });
    }
    /** Equality by DID. */
    equals(other) {
        return this.did === other.did;
    }
}
exports.Identity = Identity;
//# sourceMappingURL=identity.js.map