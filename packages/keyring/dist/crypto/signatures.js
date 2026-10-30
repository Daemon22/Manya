"use strict";
/**
 * @manya-os/keyring — digital signatures (RSA-PSS, ECDSA P-256).
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
exports.proofTypeFor = proofTypeFor;
const crypto = __importStar(require("crypto"));
const errors_js_1 = require("../errors.js");
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
            throw new errors_js_1.VerificationError('invalid public key PEM: ' + err.message, err);
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
            throw new errors_js_1.SignatureError('invalid private key PEM: ' + err.message, err);
        }
    }
    return key;
}
/**
 * Build the `algorithm`-specific options for `crypto.sign`/`crypto.verify`.
 */
function signingOptions(algo) {
    if (algo === 'rsa-pss') {
        return {
            key: undefined, // set by caller
            padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
            saltLength: crypto.constants.RSA_PSS_SALTLEN_DIGEST,
        };
    }
    // ECDSA — no extra options required.
    return { key: undefined };
}
/**
 * Sign `data` with `privateKey` using `algo`.
 *
 * @param privateKey - Private KeyObject or PEM string.
 * @param data - Bytes to sign.
 * @param algo - Signature algorithm.
 * @returns Hex-encoded signature.
 * @throws {@link SignatureError} on any failure.
 */
function sign(privateKey, data, algo) {
    if (!Buffer.isBuffer(data)) {
        throw new errors_js_1.SignatureError('data must be a Buffer');
    }
    const key = asPrivateKey(privateKey);
    try {
        if (algo === 'rsa-pss') {
            const sig = crypto.sign(SIGN_HASH, data, {
                key,
                padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
                saltLength: crypto.constants.RSA_PSS_SALTLEN_DIGEST,
            });
            return sig.toString('hex');
        }
        if (algo === 'ecdsa-p256') {
            const sig = crypto.sign(SIGN_HASH, data, key);
            return sig.toString('hex');
        }
        throw new errors_js_1.SignatureError(`unsupported signature algorithm: ${algo}`);
    }
    catch (err) {
        if (err instanceof errors_js_1.SignatureError)
            throw err;
        throw new errors_js_1.SignatureError('sign failed: ' + err.message, err);
    }
}
/**
 * Verify a `signature` over `data` against `publicKey` using `algo`.
 *
 * Uses `crypto.timingSafeEqual` internally to avoid early-exit timing leaks.
 * Returns `false` for any malformed input or signature mismatch — callers
 * that need to distinguish bad signatures from bad inputs should catch
 * {@link VerificationError}.
 *
 * @param publicKey - Public KeyObject or PEM string.
 * @param data - Original bytes.
 * @param signature - Hex-encoded signature.
 * @param algo - Signature algorithm.
 * @returns `true` iff the signature is valid.
 * @throws {@link VerificationError} only for malformed inputs that cannot be
 *   safely coerced to `false` (e.g. invalid hex signature).
 */
function verify(publicKey, data, signature, algo) {
    if (!Buffer.isBuffer(data)) {
        throw new errors_js_1.VerificationError('data must be a Buffer');
    }
    let signatureBuf;
    if (typeof signature === 'string') {
        try {
            signatureBuf = Buffer.from(signature, 'hex');
        }
        catch {
            throw new errors_js_1.VerificationError('signature must be hex-encoded');
        }
        if (signatureBuf.length === 0 || !/^[0-9a-fA-F]+$/.test(signature)) {
            throw new errors_js_1.VerificationError('signature must be non-empty hex');
        }
    }
    else {
        signatureBuf = signature;
    }
    const key = asPublicKey(publicKey);
    let ok;
    try {
        if (algo === 'rsa-pss') {
            ok = crypto.verify(SIGN_HASH, data, {
                key,
                padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
                saltLength: crypto.constants.RSA_PSS_SALTLEN_DIGEST,
            }, signatureBuf);
        }
        else if (algo === 'ecdsa-p256') {
            ok = crypto.verify(SIGN_HASH, data, key, signatureBuf);
        }
        else {
            throw new errors_js_1.VerificationError(`unsupported signature algorithm: ${algo}`);
        }
    }
    catch (err) {
        if (err instanceof errors_js_1.VerificationError)
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
 * Convenience: convert an algorithm enum to a proof type string.
 */
function proofTypeFor(algo) {
    return algo === 'rsa-pss' ? 'manya:rsa-pss:2024' : 'manya:ecdsa-p256:2024';
}
// Suppress unused-warning for the helper that exists for parity/future use.
void signingOptions;
//# sourceMappingURL=signatures.js.map