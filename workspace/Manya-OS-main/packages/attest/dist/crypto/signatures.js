"use strict";
/**
 * @manya-os/attest — digital signatures (RSA-PSS, ECDSA P-256).
 *
 * Self-contained: implements locally the signature primitives needed by
 * @manya-os/attest. The verification path uses `crypto.timingSafeEqual` as a
 * defense-in-depth constant-time guard.
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
exports.sign = sign;
exports.verify = verify;
exports.signForChallenge = signForChallenge;
exports.signForAttestation = signForAttestation;
exports.proofTypeFor = proofTypeFor;
const crypto = __importStar(require("crypto"));
const errors_js_1 = require("../errors.js");
const keys_js_1 = require("./keys.js");
const hashing_js_1 = require("./hashing.js");
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
            throw new errors_js_1.AttestError('invalid public key PEM: ' + err.message, 'VERIFY_ERROR', err);
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
            throw new errors_js_1.AttestError('invalid private key PEM: ' + err.message, 'SIGN_ERROR', err);
        }
    }
    return key;
}
/**
 * Resolve a {@link SignatureAlgorithm}. If `algo` is provided it is used;
 * otherwise the algorithm is inferred from the private key type via
 * {@link algorithmForKey}.
 */
function resolveAlgorithm(key, algo) {
    if (algo)
        return algo;
    return (0, keys_js_1.algorithmForKey)(key);
}
/**
 * Sign `data` with `privateKey`.
 *
 * If `algo` is omitted, it is inferred from the key type: RSA keys produce
 * `rsa-pss` signatures, EC (P-256) keys produce `ecdsa-p256` signatures.
 *
 * @param privateKey - Private KeyObject or PEM string.
 * @param data - Bytes to sign.
 * @param algo - Optional signature algorithm. Inferred from the key if omitted.
 * @returns Hex-encoded signature.
 * @throws {@link AttestError} on any failure.
 */
function sign(privateKey, data, algo) {
    if (!Buffer.isBuffer(data)) {
        throw new errors_js_1.AttestError('sign: data must be a Buffer', 'SIGN_ERROR');
    }
    const key = asPrivateKey(privateKey);
    const resolvedAlgo = resolveAlgorithm(key, algo);
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
        throw new errors_js_1.AttestError(`unsupported signature algorithm: ${resolvedAlgo}`);
    }
    catch (err) {
        if (err instanceof errors_js_1.AttestError)
            throw err;
        throw new errors_js_1.AttestError('sign failed: ' + err.message, 'SIGN_ERROR', err);
    }
}
/**
 * Verify a `signature` over `data` against `publicKey`.
 *
 * Uses `crypto.timingSafeEqual` internally to avoid early-exit timing leaks.
 * Returns `false` for any malformed input or signature mismatch — callers
 * that need to distinguish bad signatures from bad inputs should catch
 * {@link AttestError}.
 *
 * If `algo` is omitted, it is inferred from the public key type.
 *
 * @param publicKey - Public KeyObject or PEM string.
 * @param data - Original bytes.
 * @param signature - Hex-encoded signature (or Buffer).
 * @param algo - Optional signature algorithm. Inferred from the key if omitted.
 * @returns `true` iff the signature is valid.
 */
function verify(publicKey, data, signature, algo) {
    if (!Buffer.isBuffer(data)) {
        throw new errors_js_1.AttestError('verify: data must be a Buffer', 'VERIFY_ERROR');
    }
    let signatureBuf;
    if (typeof signature === 'string') {
        if (signature.length === 0 || !/^[0-9a-fA-F]+$/.test(signature)) {
            throw new errors_js_1.AttestError('verify: signature must be non-empty hex', 'VERIFY_ERROR');
        }
        try {
            signatureBuf = Buffer.from(signature, 'hex');
        }
        catch {
            throw new errors_js_1.AttestError('verify: signature must be hex-encoded', 'VERIFY_ERROR');
        }
    }
    else {
        signatureBuf = signature;
    }
    const key = asPublicKey(publicKey);
    const resolvedAlgo = resolveAlgorithm(key, algo);
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
            throw new errors_js_1.AttestError(`unsupported signature algorithm: ${resolvedAlgo}`);
        }
    }
    catch (err) {
        if (err instanceof errors_js_1.AttestError)
            throw err;
        // Treat low-level verification errors as "not verified" rather than
        // throwing — the public API contract is to return false.
        return false;
    }
    // Constant-time guard: derive a 1-byte result and compare with the expected
    // value using timingSafeEqual. This avoids any branch on the verified
    // boolean and serves as a defense-in-depth.
    const okByte = Buffer.from([ok ? 1 : 0]);
    const expected = Buffer.from([1]);
    return (0, hashing_js_1.constantTimeEqual)(okByte, expected);
}
/**
 * Sign `data` with `privateKey` and throw a {@link ChallengeError} on failure.
 *
 * Convenience wrapper around {@link sign} for use in challenge-response paths
 * where a challenge-specific error type is more informative.
 */
function signForChallenge(privateKey, data, algo) {
    try {
        return sign(privateKey, data, algo);
    }
    catch (err) {
        if (err instanceof errors_js_1.ChallengeError)
            throw err;
        throw new errors_js_1.ChallengeError('signForChallenge failed: ' + err.message, err);
    }
}
/**
 * Sign `data` with `privateKey` and throw an {@link AttestationError} on failure.
 *
 * Convenience wrapper around {@link sign} for use in remote-attestation paths.
 */
function signForAttestation(privateKey, data, algo) {
    try {
        return sign(privateKey, data, algo);
    }
    catch (err) {
        if (err instanceof errors_js_1.AttestationError)
            throw err;
        throw new errors_js_1.AttestationError('signForAttestation failed: ' + err.message, err);
    }
}
/**
 * Convenience: convert an algorithm enum to a proof type string.
 */
function proofTypeFor(algo) {
    return algo === 'rsa-pss' ? 'manya:rsa-pss:2024' : 'manya:ecdsa-p256:2024';
}
//# sourceMappingURL=signatures.js.map