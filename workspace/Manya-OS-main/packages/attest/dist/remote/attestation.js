"use strict";
/**
 * @manya-os/attest — remote attestation: produce + verify signed attestation reports.
 *
 * A prover produces an {@link AttestationQuote} signed over its device
 * fingerprint, measurements, timestamp, and nonce. The verifier checks:
 *   1. The signature verifies against the prover's public key.
 *   2. The quote's timestamp is within an allowed freshness window (default 5 min).
 *   3. The quote's device fingerprint matches the expected one.
 *   4. The quote's nonce matches the verifier-issued nonce.
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
exports.DEFAULT_ATTESTATION_FRESHNESS_MS = void 0;
exports.produceAttestation = produceAttestation;
exports.verifyAttestation = verifyAttestation;
exports.produceAndSerializeAttestation = produceAndSerializeAttestation;
exports.deserializeAndVerifyAttestation = deserializeAndVerifyAttestation;
const crypto = __importStar(require("crypto"));
const errors_js_1 = require("../errors.js");
const signatures_js_1 = require("../crypto/signatures.js");
const keys_js_1 = require("../crypto/keys.js");
const quote_js_1 = require("./quote.js");
/** Default attestation freshness window: 5 minutes. */
exports.DEFAULT_ATTESTATION_FRESHNESS_MS = 5 * 60 * 1000;
/**
 * Produce a signed attestation quote.
 *
 * @param privateKey - The prover's private key.
 * @param deviceFingerprint - The prover's device fingerprint string.
 * @param measurements - Stable map of measurement name → hex value.
 * @param nonce - Verifier-issued nonce for freshness binding.
 * @param opts - Optional parameters.
 * @param opts.algorithm - Signature algorithm (inferred from the key if omitted).
 * @param opts.timestamp - ISO-8601 timestamp (defaults to now).
 * @param opts.hardware - Optional hardware probe to include in the quote.
 * @returns The signed {@link AttestationQuote}.
 */
function produceAttestation(privateKey, deviceFingerprint, measurements, nonce, opts = {}) {
    if (typeof deviceFingerprint !== 'string' || deviceFingerprint.length === 0) {
        throw new errors_js_1.AttestationError('produceAttestation: deviceFingerprint must be a non-empty string');
    }
    if (!measurements || typeof measurements !== 'object') {
        throw new errors_js_1.AttestationError('produceAttestation: measurements must be an object');
    }
    if (typeof nonce !== 'string' || nonce.length === 0) {
        throw new errors_js_1.AttestationError('produceAttestation: nonce must be a non-empty string');
    }
    // Resolve algorithm.
    let algorithm;
    if (opts.algorithm) {
        algorithm = opts.algorithm;
    }
    else {
        const keyObj = typeof privateKey === 'string' ? crypto.createPrivateKey(privateKey) : privateKey;
        algorithm = (0, keys_js_1.algorithmForKey)(keyObj);
    }
    const timestamp = opts.timestamp ?? new Date().toISOString();
    // Build the unsigned quote, sign the canonical bytes, then attach signature.
    const quoteWithoutSig = {
        version: quote_js_1.ATTESTATION_QUOTE_VERSION,
        deviceFingerprint,
        measurements,
        timestamp,
        nonce,
        algorithm,
        ...(opts.hardware ? { hardware: opts.hardware } : {}),
    };
    const canonical = Buffer.from((0, quote_js_1.stableStringify)(quoteWithoutSig), 'utf8');
    const signature = (0, signatures_js_1.sign)(privateKey, canonical, algorithm);
    return {
        ...quoteWithoutSig,
        signature,
    };
}
/**
 * Verify a signed attestation quote.
 *
 * Checks:
 *   1. Signature verification against `publicKey`.
 *   2. Freshness: quote timestamp is within `freshnessMs` of `now` (default 5 min).
 *   3. Nonce match: quote nonce equals `expectedNonce` (constant-time).
 *   4. Fingerprint match: quote deviceFingerprint equals `expectedFingerprint`
 *      (constant-time). Skipped if `expectedFingerprint` is omitted.
 *
 * @param publicKey - The prover's public key (KeyObject or PEM).
 * @param quote - The quote to verify.
 * @param expectedNonce - The nonce the verifier issued.
 * @param opts - Optional parameters.
 * @param opts.expectedFingerprint - Expected device fingerprint string.
 * @param opts.freshnessMs - Allowed freshness window. Defaults to 5 minutes.
 * @param opts.now - Optional reference time (defaults to `Date.now()`).
 * @returns `true` iff all checks pass.
 */
function verifyAttestation(publicKey, quote, expectedNonce, opts = {}) {
    if (!quote || typeof quote !== 'object')
        return false;
    if (typeof expectedNonce !== 'string' || expectedNonce.length === 0) {
        throw new errors_js_1.AttestationError('verifyAttestation: expectedNonce must be a non-empty string');
    }
    const freshnessMs = opts.freshnessMs ?? exports.DEFAULT_ATTESTATION_FRESHNESS_MS;
    if (!Number.isInteger(freshnessMs) || freshnessMs <= 0) {
        throw new errors_js_1.AttestationError('verifyAttestation: freshnessMs must be a positive integer');
    }
    const now = opts.now ?? Date.now();
    // 1. Freshness check.
    const ts = Date.parse(quote.timestamp);
    if (!Number.isFinite(ts))
        return false;
    const ageMs = Math.abs(now - ts);
    if (ageMs > freshnessMs)
        return false;
    // 2. Nonce match (constant-time).
    const nonceBuf = Buffer.from(quote.nonce, 'utf8');
    const expectedBuf = Buffer.from(expectedNonce, 'utf8');
    if (nonceBuf.length !== expectedBuf.length)
        return false;
    if (!crypto.timingSafeEqual(nonceBuf, expectedBuf))
        return false;
    // 3. Fingerprint match (constant-time) — optional.
    if (opts.expectedFingerprint !== undefined) {
        const fpBuf = Buffer.from(quote.deviceFingerprint, 'utf8');
        const expFpBuf = Buffer.from(opts.expectedFingerprint, 'utf8');
        if (fpBuf.length !== expFpBuf.length)
            return false;
        if (!crypto.timingSafeEqual(fpBuf, expFpBuf))
            return false;
    }
    // 4. Signature verification.
    const { signature, ...rest } = quote;
    const canonical = Buffer.from((0, quote_js_1.stableStringify)(rest), 'utf8');
    try {
        return (0, signatures_js_1.verify)(publicKey, canonical, signature, quote.algorithm);
    }
    catch (err) {
        throw new errors_js_1.AttestationError('verifyAttestation: signature verification error: ' + err.message, err);
    }
}
/**
 * Convenience: produce a quote and immediately serialize it to a Buffer.
 */
function produceAndSerializeAttestation(privateKey, deviceFingerprint, measurements, nonce, opts = {}) {
    const quote = produceAttestation(privateKey, deviceFingerprint, measurements, nonce, opts);
    return (0, quote_js_1.serializeQuote)(quote);
}
/**
 * Convenience: deserialize a Buffer and verify it.
 */
function deserializeAndVerifyAttestation(publicKey, buf, expectedNonce, opts = {}) {
    const quote = (0, quote_js_1.deserializeQuote)(buf);
    return verifyAttestation(publicKey, quote, expectedNonce, opts);
}
//# sourceMappingURL=attestation.js.map