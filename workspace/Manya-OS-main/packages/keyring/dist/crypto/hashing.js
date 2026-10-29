"use strict";
/**
 * @manya-os/keyring — hashing primitives.
 *
 * Thin wrappers around Node `crypto` that surface typed errors.
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
exports.sha256 = sha256;
exports.sha512 = sha512;
exports.hmac = hmac;
exports.hkdf = hkdf;
exports.pbkdf2 = pbkdf2;
exports.constantTimeEqual = constantTimeEqual;
const crypto = __importStar(require("crypto"));
const errors_js_1 = require("../errors.js");
/**
 * Compute SHA-256 over `data`.
 * @param data - Bytes to hash.
 * @returns 32-byte digest.
 */
function sha256(data) {
    try {
        const buf = typeof data === 'string' ? Buffer.from(data, 'utf8') : data;
        return crypto.createHash('sha256').update(buf).digest();
    }
    catch (err) {
        throw new errors_js_1.KeyringError('sha256 failed: ' + err.message, 'HASH_ERROR', err);
    }
}
/**
 * Compute SHA-512 over `data`.
 * @param data - Bytes to hash.
 * @returns 64-byte digest.
 */
function sha512(data) {
    try {
        const buf = typeof data === 'string' ? Buffer.from(data, 'utf8') : data;
        return crypto.createHash('sha512').update(buf).digest();
    }
    catch (err) {
        throw new errors_js_1.KeyringError('sha512 failed: ' + err.message, 'HASH_ERROR', err);
    }
}
/**
 * Compute an HMAC.
 * @param key - HMAC key.
 * @param data - Bytes to authenticate.
 * @param algo - Hash algorithm. Defaults to `sha256`.
 * @returns HMAC digest.
 */
function hmac(key, data, algo = 'sha256') {
    try {
        return crypto.createHmac(algo, key).update(data).digest();
    }
    catch (err) {
        throw new errors_js_1.KeyringError('hmac failed: ' + err.message, 'HMAC_ERROR', err);
    }
}
/**
 * HKDF-SHA256 extract-and-expand.
 * @param ikm - Input keying material.
 * @param salt - Salt (may be empty).
 * @param info - Context/application info (may be empty).
 * @param length - Output length in bytes (≤ 255 × 32).
 * @returns Derived key material of `length` bytes.
 */
function hkdf(ikm, salt, info, length) {
    if (length <= 0) {
        throw new errors_js_1.KeyringError('hkdf: length must be > 0', 'HKDF_ERROR');
    }
    if (length > 255 * 32) {
        throw new errors_js_1.KeyringError('hkdf: length exceeds 255 * 32 (255 blocks of SHA-256)', 'HKDF_ERROR');
    }
    try {
        const result = crypto.hkdfSync('sha256', ikm, salt, info, length);
        return Buffer.from(result);
    }
    catch (err) {
        throw new errors_js_1.KeyringError('hkdf failed: ' + err.message, 'HKDF_ERROR', err);
    }
}
/**
 * PBKDF2 password-based key derivation.
 * @param passphrase - User passphrase.
 * @param salt - Salt.
 * @param iterations - Iteration count.
 * @param keyLen - Output length in bytes.
 * @param algo - PRF hash. Defaults to `sha512`.
 * @returns Derived key.
 */
function pbkdf2(passphrase, salt, iterations, keyLen, algo = 'sha512') {
    if (iterations < 1000) {
        throw new errors_js_1.KeyringError('pbkdf2: iterations below safe minimum (1000)', 'PBKDF2_ERROR');
    }
    try {
        return crypto.pbkdf2Sync(passphrase, salt, iterations, keyLen, algo);
    }
    catch (err) {
        throw new errors_js_1.KeyringError('pbkdf2 failed: ' + err.message, 'PBKDF2_ERROR', err);
    }
}
/**
 * Constant-time equality of two buffers.
 * Returns `false` (rather than throwing) when the lengths differ.
 */
function constantTimeEqual(a, b) {
    if (a.length !== b.length)
        return false;
    return crypto.timingSafeEqual(a, b);
}
//# sourceMappingURL=hashing.js.map