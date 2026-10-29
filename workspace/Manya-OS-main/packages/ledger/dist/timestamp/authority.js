"use strict";
/**
 * @manya-os/ledger — timestamp authority interface + local implementation.
 *
 * A {@link TimestampAuthority} signs {@link TimestampToken}s over arbitrary
 * commitments. {@link LocalTimestampAuthority} uses a locally-generated
 * ECDSA P-256 (or RSA-PSS) keypair.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Conceived, directed, and owned by Uviwe Menyiwe (Azura Daemon), founder
 * of the Manya Hael Foundation.
 *
 * Licensed under the Apache License, Version 2.0.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TIMESTAMP_TOKEN_VERSION = exports.LocalTimestampAuthority = void 0;
exports.canonicalTimestampBytes = canonicalTimestampBytes;
const errors_js_1 = require("../errors.js");
const keys_js_1 = require("../crypto/keys.js");
/**
 * A {@link TimestampAuthority} backed by a local keypair.
 *
 * Suitable for development, single-node deployments, and tests. For
 * production multi-node deployments, implement {@link TimestampAuthority}
 * against a remote TSA (RFC 3161) or an HSM-backed signer.
 */
class LocalTimestampAuthority {
    privateKey;
    publicKey;
    algorithm;
    keyId;
    constructor(opts = {}) {
        if (opts.keypair) {
            this.privateKey = opts.keypair.privateKey;
            this.publicKey = opts.keypair.publicKey;
            this.algorithm = opts.keypair.algorithm;
        }
        else {
            const kp = (0, keys_js_1.generateKeyPair)('ecdsa');
            this.privateKey = kp.privateKey;
            this.publicKey = kp.publicKey;
            this.algorithm = kp.algorithm;
        }
        try {
            this.keyId = (0, keys_js_1.getKeyId)(this.publicKey);
        }
        catch (err) {
            throw new errors_js_1.TimestampError('LocalTimestampAuthority: cannot compute key id: ' + err.message, err);
        }
    }
    /** @inheritdoc */
    issue(commitment) {
        if (Buffer.isBuffer(commitment)) {
            if (commitment.length === 0) {
                throw new errors_js_1.TimestampError('issue: commitment must be non-empty');
            }
        }
        else if (typeof commitment === 'string') {
            if (commitment.length === 0) {
                throw new errors_js_1.TimestampError('issue: commitment must be non-empty');
            }
        }
        else {
            throw new errors_js_1.TimestampError('issue: commitment must be a Buffer or hex string');
        }
        const commitmentHex = Buffer.isBuffer(commitment)
            ? commitment.toString('hex')
            : commitment;
        const issuedAt = new Date().toISOString();
        // Canonical signed bytes: version || commitmentHex || issuedAt || keyId.
        const canonical = Buffer.from(`${exports.TIMESTAMP_TOKEN_VERSION}|${commitmentHex}|${issuedAt}|${this.keyId}`, 'utf8');
        let signature;
        try {
            signature = (0, keys_js_1.sign)(this.privateKey, canonical, this.algorithm);
        }
        catch (err) {
            throw new errors_js_1.TimestampError('issue: signing failed: ' + err.message, err);
        }
        return {
            version: exports.TIMESTAMP_TOKEN_VERSION,
            commitment: commitmentHex,
            issuedAt,
            signature,
            algorithm: this.algorithm,
            authorityKeyId: this.keyId,
        };
    }
    /** @inheritdoc */
    getPublicKey() {
        return this.publicKey;
    }
    /** @inheritdoc */
    getKeyId() {
        return this.keyId;
    }
    /** @inheritdoc */
    getAlgorithm() {
        return this.algorithm;
    }
}
exports.LocalTimestampAuthority = LocalTimestampAuthority;
/** Format version of {@link TimestampToken}s produced by this package. */
exports.TIMESTAMP_TOKEN_VERSION = 1;
/**
 * Canonical bytes for a {@link TimestampToken}. Used by both
 * {@link LocalTimestampAuthority.issue} (signing) and {@link verifyTimestamp}
 * (verifying) to ensure both sides hash exactly the same bytes.
 *
 * @internal exported for tests.
 */
function canonicalTimestampBytes(token) {
    return Buffer.from(`${token.version}|${token.commitment}|${token.issuedAt}|${token.authorityKeyId}`, 'utf8');
}
//# sourceMappingURL=authority.js.map