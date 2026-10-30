"use strict";
/**
 * @manya-os/attest — hashing primitives.
 *
 * Self-contained crypto wrappers around Node `crypto`. This package must NOT
 * import from `@manya-os/keyring` (a sibling workspace); all primitives are
 * implemented locally.
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
exports.secureRandom = secureRandom;
exports.constantTimeEqual = constantTimeEqual;
exports.randomToken = randomToken;
exports.uuid = uuid;
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
        throw new errors_js_1.AttestError('sha256 failed: ' + err.message, 'HASH_ERROR', err);
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
        throw new errors_js_1.AttestError('sha512 failed: ' + err.message, 'HASH_ERROR', err);
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
        throw new errors_js_1.AttestError('hmac failed: ' + err.message, 'HMAC_ERROR', err);
    }
}
/**
 * Return `n` cryptographically-secure random bytes.
 *
 * Uses `crypto.randomBytes` (CSPRNG backed by `/dev/urandom` or equivalent).
 * Throws if `n` is not a positive finite integer.
 * @param n - Number of bytes (must be a positive finite integer).
 * @returns `n` random bytes.
 */
function secureRandom(n) {
    if (!Number.isInteger(n) || n <= 0) {
        throw new errors_js_1.AttestError('secureRandom: length must be a positive integer', 'RANDOM_ERROR');
    }
    if (n > 1024 * 1024) {
        throw new errors_js_1.AttestError('secureRandom: refusing to allocate > 1 MiB in a single call', 'RANDOM_ERROR');
    }
    try {
        return crypto.randomBytes(n);
    }
    catch (err) {
        throw new errors_js_1.AttestError('secureRandom failed: ' + err.message, 'RANDOM_ERROR', err);
    }
}
/**
 * Constant-time equality of two buffers.
 *
 * Returns `false` (rather than throwing) when the lengths differ — this is
 * the standard approach for compare-then-equal primitives, but callers
 * handling secrets of differing lengths should hash first to avoid leaking
 * length information.
 */
function constantTimeEqual(a, b) {
    if (a.length !== b.length)
        return false;
    return crypto.timingSafeEqual(a, b);
}
/**
 * Generate a random hex-encoded token of `bytes` entropy.
 * @param bytes - Number of random bytes (defaults to 32).
 * @returns 2*`bytes`-character hex string.
 */
function randomToken(bytes = 32) {
    return secureRandom(bytes).toString('hex');
}
/**
 * Generate a UUID v4 using `crypto.randomUUID`.
 * @returns RFC-4122 v4 UUID string.
 */
function uuid() {
    try {
        return crypto.randomUUID();
    }
    catch (err) {
        throw new errors_js_1.AttestError('uuid failed: ' + err.message, 'UUID_ERROR', err);
    }
}
//# sourceMappingURL=hashing.js.map