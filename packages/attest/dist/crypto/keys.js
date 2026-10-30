"use strict";
/**
 * @manya-os/attest — key generation, import/export, fingerprints.
 *
 * Self-contained: implements locally the subset of @manya-os/keyring's key
 * utilities needed by @manya-os/attest (RSA-PSS 3072, ECDSA P-256).
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
exports.algorithmForKey = algorithmForKey;
exports.generateKeyPair = generateKeyPair;
exports.importKeyPem = importKeyPem;
exports.exportKeyPem = exportKeyPem;
exports.getKeyFingerprint = getKeyFingerprint;
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
            throw new errors_js_1.AttestError(`unknown key algorithm: ${algo}`);
    }
}
/**
 * Map a `crypto.KeyObject`'s `asymmetricKeyType` to a {@link SignatureAlgorithm}.
 * Throws if the key type is not RSA or EC (P-256).
 */
function algorithmForKey(key) {
    let type;
    try {
        type = key.asymmetricKeyType;
    }
    catch (err) {
        throw new errors_js_1.AttestError('algorithmForKey: cannot read key type: ' + err.message, 'KEY_TYPE_ERROR', err);
    }
    if (type === 'rsa')
        return 'rsa-pss';
    if (type === 'ec') {
        // Verify the curve is P-256.
        let details;
        try {
            details = key.asymmetricKeyDetails;
        }
        catch {
            // Fall through to default.
        }
        if (details && details.namedCurve) {
            const curve = details.namedCurve;
            if (curve !== 'P-256' && curve !== 'prime256v1' && curve !== 'secp256r1') {
                throw new errors_js_1.AttestError(`algorithmForKey: only NIST P-256 is supported, got ${curve}`);
            }
        }
        return 'ecdsa-p256';
    }
    throw new errors_js_1.AttestError(`algorithmForKey: unsupported key type: ${type ?? 'unknown'} (only rsa and ec are supported)`);
}
/**
 * Generate a key pair.
 *
 * @param algo - `'rsa'` for RSA-PSS or `'ecdsa'` for ECDSA P-256.
 * @param opts - Optional parameters.
 * @returns Key pair + resolved signature algorithm.
 * @throws {@link AttestError} on any failure.
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
                throw new errors_js_1.AttestError(`unsupported EC curve: ${curve}. Only 'prime256v1' (NIST P-256) is supported.`);
            }
            ({ publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
                namedCurve: curve,
            }));
        }
        else {
            throw new errors_js_1.AttestError(`unknown key algorithm: ${algo}`);
        }
        return { publicKey, privateKey, algorithm: algorithmFor(algo) };
    }
    catch (err) {
        if (err instanceof errors_js_1.AttestError)
            throw err;
        throw new errors_js_1.AttestError('key generation failed: ' + err.message, 'KEY_GENERATION_ERROR', err);
    }
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
        throw new errors_js_1.AttestError(`failed to import ${type} key from PEM: ${err.message}`, 'KEY_IMPORT_ERROR', err);
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
        return key.export({ type: 'pkcs8', format: 'pem' }).toString('utf8');
    }
    catch (err) {
        throw new errors_js_1.AttestError(`failed to export ${type} key to PEM: ${err.message}`, 'KEY_EXPORT_ERROR', err);
    }
}
/**
 * Compute a hex-encoded SHA-256 fingerprint of a public key's SPKI DER encoding.
 *
 * Accepts either a KeyObject or a PEM string for convenience.
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
        throw new errors_js_1.FingerprintError('getKeyFingerprint failed: ' + err.message, err);
    }
}
//# sourceMappingURL=keys.js.map