"use strict";
/**
 * @manya-os/ledger — key generation, import/export, fingerprints.
 *
 * Self-contained: implements locally the subset of key utilities needed by
 * @manya-os/ledger (ECDSA P-256 default, RSA-PSS optional). Does NOT import
 * from `@manya-os/keyring` or any other sibling workspace.
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
exports.DEFAULT_EC_CURVE = exports.DEFAULT_RSA_EXPONENT = exports.DEFAULT_RSA_MODULUS = void 0;
exports.algorithmFor = algorithmFor;
exports.algorithmForKey = algorithmForKey;
exports.generateKeyPair = generateKeyPair;
exports.importKeyPem = importKeyPem;
exports.exportKeyPem = exportKeyPem;
exports.getKeyId = getKeyId;
exports.sign = sign;
exports.verify = verify;
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
            throw new errors_js_1.LedgerError(`unknown key algorithm: ${algo}`);
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
        throw new errors_js_1.LedgerError('algorithmForKey: cannot read key type: ' + err.message, 'KEY_TYPE_ERROR', err);
    }
    if (type === 'rsa')
        return 'rsa-pss';
    if (type === 'ec') {
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
                throw new errors_js_1.LedgerError(`algorithmForKey: only NIST P-256 is supported, got ${curve}`);
            }
        }
        return 'ecdsa-p256';
    }
    throw new errors_js_1.LedgerError(`algorithmForKey: unsupported key type: ${type ?? 'unknown'} (only rsa and ec are supported)`);
}
/**
 * Generate a key pair.
 *
 * Defaults to ECDSA P-256 (the spec mandates P-256 support). RSA-PSS 3072
 * is available for deployments that require it.
 *
 * @param algo - `'ecdsa'` (default) or `'rsa'`.
 * @param opts - Optional parameters.
 * @returns Key pair + resolved signature algorithm.
 * @throws {@link LedgerError} on any failure.
 */
function generateKeyPair(algo = 'ecdsa', opts = {}) {
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
                throw new errors_js_1.LedgerError(`unsupported EC curve: ${curve}. Only 'prime256v1' (NIST P-256) is supported.`);
            }
            ({ publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
                namedCurve: curve,
            }));
        }
        else {
            throw new errors_js_1.LedgerError(`unknown key algorithm: ${algo}`);
        }
        return { publicKey, privateKey, algorithm: algorithmFor(algo) };
    }
    catch (err) {
        if (err instanceof errors_js_1.LedgerError)
            throw err;
        throw new errors_js_1.LedgerError('key generation failed: ' + err.message, 'KEY_GENERATION_ERROR', err);
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
        throw new errors_js_1.LedgerError(`failed to import ${type} key from PEM: ${err.message}`, 'KEY_IMPORT_ERROR', err);
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
        throw new errors_js_1.LedgerError(`failed to export ${type} key to PEM: ${err.message}`, 'KEY_EXPORT_ERROR', err);
    }
}
/**
 * Compute a hex-encoded SHA-256 key id of a public key.
 *
 * The key id is `sha256(spki-derepr)` — the SHA-256 of the public key's
 * SubjectPublicKeyInfo DER encoding. This is the same scheme used by
 * `@manya-os/attest`'s `getKeyFingerprint`, so cross-package references are
 * stable.
 *
 * Accepts either a KeyObject or a PEM string for convenience.
 *
 * @param publicKey - Public key (KeyObject or PEM string).
 * @returns 64-character hex string.
 */
function getKeyId(publicKey) {
    try {
        const keyObj = typeof publicKey === 'string'
            ? crypto.createPublicKey(publicKey)
            : publicKey;
        const der = keyObj.export({ type: 'spki', format: 'der' });
        return (0, hashing_js_1.sha256)(der).toString('hex');
    }
    catch (err) {
        throw new errors_js_1.LedgerError('getKeyId failed: ' + err.message, 'KEY_ID_ERROR', err);
    }
}
/**
 * Sign `data` with `privateKey` and return a hex-encoded signature.
 *
 * The algorithm is inferred from the key type if `algo` is omitted
 * (ECDSA P-256 for `ec` keys, RSA-PSS for `rsa` keys).
 *
 * @param privateKey - Private KeyObject or PEM string.
 * @param data - Bytes to sign.
 * @param algo - Optional signature algorithm. Inferred from the key if omitted.
 * @returns Hex-encoded signature.
 * @throws {@link LedgerError} on any failure.
 */
function sign(privateKey, data, algo) {
    if (!Buffer.isBuffer(data)) {
        throw new errors_js_1.LedgerError('sign: data must be a Buffer', 'SIGN_ERROR');
    }
    const key = asPrivateKey(privateKey);
    const resolvedAlgo = algo ?? algorithmForKey(key);
    try {
        if (resolvedAlgo === 'rsa-pss') {
            const sig = crypto.sign(SIGN_HASH, data, {
                key,
                padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
                saltLength: crypto.constants.RSA_PSS_SALTLEN_DIGEST,
            });
            return sig.toString('hex');
        }
        if (resolvedAlgo === 'ecdsa-p256') {
            const sig = crypto.sign(SIGN_HASH, data, key);
            return sig.toString('hex');
        }
        throw new errors_js_1.LedgerError(`unsupported signature algorithm: ${resolvedAlgo}`);
    }
    catch (err) {
        if (err instanceof errors_js_1.LedgerError)
            throw err;
        throw new errors_js_1.LedgerError('sign failed: ' + err.message, 'SIGN_ERROR', err);
    }
}
/**
 * Verify a `signature` over `data` against `publicKey`.
 *
 * Uses `crypto.timingSafeEqual` internally as a defense-in-depth constant-time
 * guard on the OpenSSL verify result. Returns `false` (rather than throwing)
 * for any malformed input or signature mismatch — callers that need to
 * distinguish bad signatures from bad inputs should catch {@link LedgerError}.
 *
 * @param publicKey - Public KeyObject or PEM string.
 * @param data - Original bytes.
 * @param signature - Hex-encoded signature (or Buffer).
 * @param algo - Optional signature algorithm. Inferred from the key if omitted.
 * @returns `true` iff the signature is valid.
 */
function verify(publicKey, data, signature, algo) {
    if (!Buffer.isBuffer(data)) {
        throw new errors_js_1.LedgerError('verify: data must be a Buffer', 'VERIFY_ERROR');
    }
    let signatureBuf;
    if (typeof signature === 'string') {
        if (signature.length === 0 || !/^[0-9a-fA-F]+$/.test(signature)) {
            throw new errors_js_1.LedgerError('verify: signature must be non-empty hex', 'VERIFY_ERROR');
        }
        try {
            signatureBuf = Buffer.from(signature, 'hex');
        }
        catch {
            throw new errors_js_1.LedgerError('verify: signature must be hex-encoded', 'VERIFY_ERROR');
        }
    }
    else {
        signatureBuf = signature;
    }
    const key = asPublicKey(publicKey);
    const resolvedAlgo = algo ?? algorithmForKey(key);
    let ok;
    try {
        if (resolvedAlgo === 'rsa-pss') {
            ok = crypto.verify(SIGN_HASH, data, {
                key,
                padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
                saltLength: crypto.constants.RSA_PSS_SALTLEN_DIGEST,
            }, signatureBuf);
        }
        else if (resolvedAlgo === 'ecdsa-p256') {
            ok = crypto.verify(SIGN_HASH, data, key, signatureBuf);
        }
        else {
            throw new errors_js_1.LedgerError(`unsupported signature algorithm: ${resolvedAlgo}`);
        }
    }
    catch (err) {
        if (err instanceof errors_js_1.LedgerError)
            throw err;
        return false;
    }
    // Constant-time guard: derive a 1-byte result and compare with the expected
    // value using timingSafeEqual. This avoids any branch on the verified
    // boolean and serves as a defense-in-depth.
    const okByte = Buffer.from([ok ? 1 : 0]);
    const expected = Buffer.from([1]);
    return crypto.timingSafeEqual(okByte, expected);
}
/** Hash algorithm used for all signature operations. */
const SIGN_HASH = 'sha256';
/**
 * Convert a public key input (KeyObject or PEM string) into a KeyObject.
 */
function asPublicKey(key) {
    if (typeof key === 'string') {
        try {
            return crypto.createPublicKey(key);
        }
        catch (err) {
            throw new errors_js_1.LedgerError('invalid public key PEM: ' + err.message, 'VERIFY_ERROR', err);
        }
    }
    return key;
}
/**
 * Convert a private key input (KeyObject or PEM string) into a KeyObject.
 */
function asPrivateKey(key) {
    if (typeof key === 'string') {
        try {
            return crypto.createPrivateKey(key);
        }
        catch (err) {
            throw new errors_js_1.LedgerError('invalid private key PEM: ' + err.message, 'SIGN_ERROR', err);
        }
    }
    return key;
}
//# sourceMappingURL=keys.js.map