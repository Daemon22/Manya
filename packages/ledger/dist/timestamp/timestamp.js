"use strict";
/**
 * @manya-os/ledger — tamper-evident timestamping (commit-then-reveal).
 *
 * Implements a self-contained, RFC 3161-inspired commit-then-reveal pattern:
 *
 *   1. `commit(value)` — produces a 32-byte `commitment = SHA-256(value || nonce)`
 *      together with the random 32-byte `nonce`. The commitment can be
 *      published (e.g. anchored into the ledger) without revealing `value`.
 *   2. `reveal(value, nonce, commitment)` — recomputes `SHA-256(value || nonce)`
 *      and constant-time-compares to the published `commitment`.
 *   3. `issueTimestamp(commitment, authorityKey)` — has a
 *      {@link TimestampAuthority} sign the commitment, producing a
 *      {@link TimestampToken} that binds the commitment to an issuance time.
 *   4. `verifyTimestamp(token, authorityPublicKey)` — verifies the token's
 *      signature against the authority's public key.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Conceived, directed, and owned by Uviwe Menyiwe (Azura Daemon), founder
 * of the Manya Hael Foundation.
 *
 * Licensed under the Apache License, Version 2.0.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.COMMITMENT_BYTES = exports.COMMITMENT_NONCE_BYTES = void 0;
exports.commit = commit;
exports.reveal = reveal;
exports.issueTimestamp = issueTimestamp;
exports.verifyTimestamp = verifyTimestamp;
const errors_js_1 = require("../errors.js");
const hashing_js_1 = require("../crypto/hashing.js");
const keys_js_1 = require("../crypto/keys.js");
const authority_js_1 = require("./authority.js");
/** Size (in bytes) of the commitment nonce. */
exports.COMMITMENT_NONCE_BYTES = 32;
/** Size (in bytes) of a SHA-256 commitment. */
exports.COMMITMENT_BYTES = 32;
/**
 * Produce a commitment to `value` using a fresh random nonce.
 *
 * `commitment = SHA-256(value || nonce)` — both `value` and `nonce` MUST be
 * 32 bytes long after this concatenation? No: `value` can be any length, but
 * for unambiguous reveals it MUST be exactly the bytes that will be re-supplied
 * to {@link reveal}. The nonce is always 32 bytes.
 *
 * @param value - The bytes to commit to.
 * @returns The commitment and the reveal nonce.
 */
function commit(value) {
    if (!Buffer.isBuffer(value) || value.length === 0) {
        throw new errors_js_1.TimestampError('commit: value must be a non-empty Buffer');
    }
    const nonce = (0, hashing_js_1.secureRandom)(exports.COMMITMENT_NONCE_BYTES);
    const commitment = (0, hashing_js_1.sha256)(Buffer.concat([value, nonce]));
    return { commitment, nonce };
}
/**
 * Reveal `value` against a previously published `commitment`.
 *
 * Recomputes `SHA-256(value || nonce)` and constant-time-compares to
 * `commitment`.
 *
 * @param value - The original bytes.
 * @param nonce - The nonce returned by {@link commit}.
 * @param commitment - The published commitment.
 * @returns `true` iff the commitment matches.
 */
function reveal(value, nonce, commitment) {
    if (!Buffer.isBuffer(value) || !Buffer.isBuffer(nonce) || !Buffer.isBuffer(commitment)) {
        return false;
    }
    if (nonce.length !== exports.COMMITMENT_NONCE_BYTES)
        return false;
    if (commitment.length !== exports.COMMITMENT_BYTES)
        return false;
    const recomputed = (0, hashing_js_1.sha256)(Buffer.concat([value, nonce]));
    return (0, hashing_js_1.constantTimeEqual)(recomputed, commitment);
}
/**
 * Issue a signed timestamp token over a commitment using a
 * {@link TimestampAuthority}.
 *
 * @param commitment - The commitment to timestamp (Buffer or hex string).
 * @param authority - The signing authority.
 * @returns A signed {@link TimestampToken}.
 */
function issueTimestamp(commitment, authority) {
    if (!authority || typeof authority.issue !== 'function') {
        throw new errors_js_1.TimestampError('issueTimestamp: authority must have an issue() method');
    }
    return authority.issue(commitment);
}
/**
 * Verify a {@link TimestampToken}'s signature against an authority's
 * public key.
 *
 * The token is verified as follows:
 *   1. The token's `version` MUST equal {@link TIMESTAMP_TOKEN_VERSION}.
 *   2. The token's `authorityKeyId` is informational (callers should
 *      verify it matches the supplied public key's key id separately if
 *      they care about pinning).
 *   3. The signature is verified over `canonicalTimestampBytes(token)`.
 *
 * @param token - The token to verify.
 * @param authorityPublicKey - Public KeyObject or PEM string.
 * @returns `true` iff the signature is valid.
 */
function verifyTimestamp(token, authorityPublicKey) {
    if (!token || typeof token !== 'object')
        return false;
    if (token.version !== authority_js_1.TIMESTAMP_TOKEN_VERSION)
        return false;
    if (typeof token.commitment !== 'string' || token.commitment.length === 0)
        return false;
    if (typeof token.issuedAt !== 'string' || token.issuedAt.length === 0)
        return false;
    if (typeof token.signature !== 'string' || token.signature.length === 0)
        return false;
    if (typeof token.authorityKeyId !== 'string' || token.authorityKeyId.length === 0) {
        return false;
    }
    let sigBytes;
    try {
        sigBytes = Buffer.from(token.signature, 'hex');
    }
    catch {
        return false;
    }
    const canonical = (0, authority_js_1.canonicalTimestampBytes)(token);
    try {
        return (0, keys_js_1.verify)(authorityPublicKey, canonical, sigBytes, token.algorithm);
    }
    catch {
        return false;
    }
}
//# sourceMappingURL=timestamp.js.map