"use strict";
/**
 * @manya-os/attest — challenge generation, signed challenge-response, expiry.
 *
 * A challenge is a fresh random byte string issued by a verifier. The prover
 * signs the canonical challenge bytes with their private key and returns a
 * {@link SignedChallengeResponse}. The verifier checks:
 *
 *   1. The nonce matches the one they issued (and is still valid).
 *   2. The signature verifies against the prover's public key.
 *   3. The signing timestamp is within the challenge's validity window.
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
exports.DEFAULT_CHALLENGE_BYTES = exports.DEFAULT_CHALLENGE_TTL_MS = void 0;
exports.generateChallenge = generateChallenge;
exports.decodeChallenge = decodeChallenge;
exports.signChallenge = signChallenge;
exports.verifyResponse = verifyResponse;
exports.isChallengeExpired = isChallengeExpired;
const crypto = __importStar(require("crypto"));
const errors_js_1 = require("../errors.js");
const hashing_js_1 = require("../crypto/hashing.js");
const keys_js_1 = require("../crypto/keys.js");
const signatures_js_1 = require("../crypto/signatures.js");
/** Default challenge TTL: 60 seconds. */
exports.DEFAULT_CHALLENGE_TTL_MS = 60 * 1000;
/** Default challenge byte length: 32 (256 bits). */
exports.DEFAULT_CHALLENGE_BYTES = 32;
/**
 * Generate a fresh challenge.
 *
 * @param opts - Optional parameters.
 * @returns A {@link Challenge} ready to send to the prover.
 */
function generateChallenge(opts = {}) {
    const ttlMs = opts.ttlMs ?? exports.DEFAULT_CHALLENGE_TTL_MS;
    const bytes = opts.bytes ?? exports.DEFAULT_CHALLENGE_BYTES;
    if (!Number.isInteger(ttlMs) || ttlMs <= 0) {
        throw new errors_js_1.ChallengeError('generateChallenge: ttlMs must be a positive integer');
    }
    if (!Number.isInteger(bytes) || bytes <= 0 || bytes > 256) {
        throw new errors_js_1.ChallengeError('generateChallenge: bytes must be an integer in [1, 256]');
    }
    const now = Date.now();
    const issuedAt = new Date(now).toISOString();
    const expiresAt = new Date(now + ttlMs).toISOString();
    const challengeBytes = (0, hashing_js_1.secureRandom)(bytes);
    const challenge = challengeBytes.toString('base64');
    const nonce = (0, hashing_js_1.uuid)().replace(/-/g, '') + (0, hashing_js_1.secureRandom)(16).toString('hex');
    return { nonce, challenge, issuedAt, expiresAt };
}
/**
 * Decode a base64-encoded challenge into raw bytes.
 * @param challenge - Base64-encoded challenge.
 */
function decodeChallenge(challenge) {
    if (typeof challenge !== 'string' || challenge.length === 0) {
        throw new errors_js_1.ChallengeError('decodeChallenge: challenge must be a non-empty string');
    }
    try {
        return Buffer.from(challenge, 'base64');
    }
    catch (err) {
        throw new errors_js_1.ChallengeError('decodeChallenge: invalid base64: ' + err.message, err);
    }
}
/**
 * Sign a challenge with a private key, producing a {@link SignedChallengeResponse}.
 *
 * The signature is computed over the raw challenge bytes (the decoded base64
 * payload), so the verifier must use the original `challenge` string when
 * verifying.
 *
 * @param privateKey - The prover's private key.
 * @param challenge - The {@link Challenge} issued by the verifier.
 * @param algo - Optional signature algorithm (inferred from the key if omitted).
 * @returns The signed response to return to the verifier.
 */
function signChallenge(privateKey, challenge, algo) {
    if (!challenge || typeof challenge !== 'object') {
        throw new errors_js_1.ChallengeError('signChallenge: challenge must be a Challenge object');
    }
    const challengeBytes = decodeChallenge(challenge.challenge);
    const signature = (0, signatures_js_1.sign)(privateKey, challengeBytes, algo);
    // Compute the public key fingerprint for transparency. The caller can
    // cross-check this against a known-identity store.
    let publicKeyFingerprint;
    try {
        // Derive the public key from the private key, then fingerprint it.
        const privKey = typeof privateKey === 'string' ? crypto.createPrivateKey(privateKey) : privateKey;
        const pubKey = privKey.asymmetricKeyType
            ? crypto.createPublicKey(privKey)
            : crypto.createPublicKey(privKey.export({ type: 'pkcs8', format: 'pem' }));
        publicKeyFingerprint = (0, keys_js_1.getKeyFingerprint)(pubKey);
    }
    catch (err) {
        throw new errors_js_1.ChallengeError('signChallenge: cannot derive public key fingerprint: ' + err.message, err);
    }
    // Resolve the algorithm label for the response.
    let resolvedAlgo;
    if (algo) {
        resolvedAlgo = algo;
    }
    else {
        // Infer from the private key type.
        const privKey = typeof privateKey === 'string' ? crypto.createPrivateKey(privateKey) : privateKey;
        const keyType = privKey.asymmetricKeyType;
        if (keyType === 'rsa')
            resolvedAlgo = 'rsa-pss';
        else if (keyType === 'ec')
            resolvedAlgo = 'ecdsa-p256';
        else
            throw new errors_js_1.ChallengeError(`signChallenge: unsupported key type: ${keyType ?? 'unknown'}`);
    }
    return {
        nonce: challenge.nonce,
        signature,
        algorithm: resolvedAlgo,
        signedAt: new Date().toISOString(),
        publicKeyFingerprint,
    };
}
/**
 * Verify a signed challenge response.
 *
 * Checks:
 *   1. The response nonce matches `expectedNonce` (constant-time).
 *   2. The signature verifies against `publicKey` over the raw challenge bytes.
 *
 * Note: the caller is responsible for checking the challenge's expiry and
 * for consuming the nonce via a {@link import('./nonce.js').NonceStore}.
 *
 * @param publicKey - The prover's public key (KeyObject or PEM).
 * @param challenge - The original {@link Challenge} issued.
 * @param response - The {@link SignedChallengeResponse} from the prover.
 * @param expectedNonce - The nonce the verifier expects to see echoed.
 * @returns `true` iff the nonce matches AND the signature is valid.
 */
function verifyResponse(publicKey, challenge, response, expectedNonce) {
    if (!response || typeof response !== 'object')
        return false;
    if (typeof expectedNonce !== 'string' || expectedNonce.length === 0) {
        throw new errors_js_1.ChallengeError('verifyResponse: expectedNonce must be a non-empty string');
    }
    // Constant-time nonce comparison.
    const a = Buffer.from(response.nonce, 'utf8');
    const b = Buffer.from(expectedNonce, 'utf8');
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
        return false;
    }
    let challengeBytes;
    try {
        challengeBytes = decodeChallenge(challenge.challenge);
    }
    catch {
        return false;
    }
    try {
        return (0, signatures_js_1.verify)(publicKey, challengeBytes, response.signature, response.algorithm);
    }
    catch (err) {
        // verify() throws only on malformed input — treat as not verified.
        throw new errors_js_1.ChallengeError('verifyResponse: signature verification error: ' + err.message, err);
    }
}
/**
 * Check whether a challenge is currently within its validity window.
 * @param challenge - The challenge to inspect.
 * @param now - Optional current time (defaults to `Date.now()`).
 */
function isChallengeExpired(challenge, now = Date.now()) {
    try {
        const expiresAt = Date.parse(challenge.expiresAt);
        if (!Number.isFinite(expiresAt))
            return true;
        return now >= expiresAt;
    }
    catch {
        return true;
    }
}
//# sourceMappingURL=challenge.js.map