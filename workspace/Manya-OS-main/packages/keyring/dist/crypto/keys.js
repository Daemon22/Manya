"use strict";
/**
 * @manya-os/keyring — key generation, derivation, import/export, fingerprints.
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
exports.DEFAULT_EC_CURVE = exports.DEFAULT_RSA_EXPONENT = exports.DEFAULT_RSA_MODULUS = void 0;
exports.algorithmFor = algorithmFor;
exports.generateKeyPair = generateKeyPair;
exports.deriveKey = deriveKey;
exports.importKeyPem = importKeyPem;
exports.exportKeyPem = exportKeyPem;
exports.getKeyFingerprint = getKeyFingerprint;
exports.exportPublicRaw = exportPublicRaw;
const crypto = __importStar(require("crypto"));
const errors_js_1 = require("../errors.js");
const hashing_js_1 = require("./hashing.js");
/** RSA modulus length used by default (>= 3072 bits per NIST SP 800-57). */
exports.DEFAULT_RSA_MODULUS = 3072;
/** RSA public exponent. */
exports.DEFAULT_RSA_EXPONENT = 65537;
/** EC named curve used for ECDSA. */
exports.DEFAULT_EC_CURVE = 'prime256v1';
/**
 * Map a {@link KeyAlgorithm} to its concrete {@link SignatureAlgorithm}.
 */
function algorithmFor(algo) {
    switch (algo) {
        case 'rsa':
            return 'rsa-pss';
        case 'ecdsa':
            return 'ecdsa-p256';
        default:
            throw new errors_js_1.KeyGenerationError(`unknown key algorithm: ${algo}`);
    }
}
/**
 * Generate a key pair.
 *
 * @param algo - `'rsa'` for RSA-PSS or `'ecdsa'` for ECDSA P-256.
 * @param opts - Optional parameters.
 * @returns Key pair + resolved signature algorithm.
 * @throws {@link KeyGenerationError} on any failure.
 */
function generateKeyPair(algo, opts = {}) {
    try {
        let publicKey;
        let privateKey;
        if (algo === 'rsa') {
            ({ publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
                modulusLength: opts.rsaModulusBits ?? exports.DEFAULT_RSA_MODULUS,
                publicExponent: opts.rsaPublicExponent ?? exports.DEFAULT_RSA_EXPONENT,
            }));
        }
        else if (algo === 'ecdsa') {
            const curve = opts.ecCurve ?? exports.DEFAULT_EC_CURVE;
            if (curve !== 'prime256v1') {
                throw new errors_js_1.KeyGenerationError(`unsupported EC curve: ${curve}. Only 'prime256v1' (NIST P-256) is supported.`);
            }
            ({ publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
                namedCurve: curve,
            }));
        }
        else {
            throw new errors_js_1.KeyGenerationError(`unknown key algorithm: ${algo}`);
        }
        return { publicKey, privateKey, algorithm: algorithmFor(algo) };
    }
    catch (err) {
        if (err instanceof errors_js_1.KeyGenerationError)
            throw err;
        throw new errors_js_1.KeyGenerationError('key generation failed: ' + err.message, err);
    }
}
/**
 * Derive a subkey from a master key using HKDF-SHA256.
 *
 * @param master - Input keying material (any length).
 * @param info - Contextual info (e.g. `keyring:sync:v1`).
 * @param length - Output length in bytes (≤ 255 × 32).
 * @returns Derived key material.
 */
function deriveKey(master, info, length) {
    const infoBuf = typeof info === 'string' ? Buffer.from(info, 'utf8') : info;
    // Empty salt is permitted by RFC 5869; we use a zeroed salt to be explicit.
    const salt = Buffer.alloc(32, 0);
    return (0, hashing_js_1.hkdf)(master, salt, infoBuf, length);
}
/**
 * Import a public or private key from PEM.
 *
 * @param pem - PEM-encoded key.
 * @param type - `'public'` or `'private'`.
 */
function importKeyPem(pem, type) {
    try {
        if (type === 'public') {
            return crypto.createPublicKey(pem);
        }
        return crypto.createPrivateKey(pem);
    }
    catch (err) {
        throw new errors_js_1.KeyGenerationError(`failed to import ${type} key from PEM: ${err.message}`, err);
    }
}
/**
 * Export a key as PEM (SPKI for public, PKCS#8 for private).
 *
 * @param key - KeyObject to export.
 * @param type - `'public'` or `'private'`.
 * @returns PEM string.
 */
function exportKeyPem(key, type) {
    try {
        if (type === 'public') {
            return key.export({ type: 'spki', format: 'pem' }).toString('utf8');
        }
        return key
            .export({ type: 'pkcs8', format: 'pem' })
            .toString('utf8');
    }
    catch (err) {
        throw new errors_js_1.KeyGenerationError(`failed to export ${type} key to PEM: ${err.message}`, err);
    }
}
/**
 * Compute a hex-encoded SHA-256 fingerprint of a public key's DER encoding.
 *
 * @param publicKey - Public key (KeyObject or PEM string).
 * @returns 64-character hex string.
 */
function getKeyFingerprint(publicKey) {
    try {
        const keyObj = typeof publicKey === 'string'
            ? crypto.createPublicKey(publicKey)
            : publicKey;
        const der = keyObj.export({ type: 'spki', format: 'der' });
        return (0, hashing_js_1.sha256)(der).toString('hex');
    }
    catch (err) {
        throw new errors_js_1.KeyGenerationError('getKeyFingerprint failed: ' + err.message, err);
    }
}
/**
 * Export a public key's raw bytes (uncompressed point for EC, DER for RSA).
 * Used internally for did:key derivation.
 *
 * @internal
 */
function exportPublicRaw(key) {
    try {
        return key.export({ type: 'spki', format: 'der' });
    }
    catch (err) {
        throw new errors_js_1.KeyringError('exportPublicRaw failed: ' + err.message, 'KEY_EXPORT_ERROR', err);
    }
}
//# sourceMappingURL=keys.js.map