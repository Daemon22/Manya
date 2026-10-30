"use strict";
/**
 * @manya-os/attest — hardware attestation provider interface + software fallback.
 *
 * A `HardwareAttestationProvider` produces a signed attestation quote using
 * hardware-rooted keys (TPM, Secure Enclave, HSM). The
 * `SoftwareAttestationProvider` is a fallback that signs with a local
 * software key — it provides NO hardware guarantees and is suitable only
 * for development, testing, and low-assurance deployments.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports._internal = exports.SoftwareAttestationProvider = void 0;
exports.canonicalQuoteBytes = canonicalQuoteBytes;
const errors_js_1 = require("../errors.js");
const signatures_js_1 = require("../crypto/signatures.js");
const keys_js_1 = require("../crypto/keys.js");
const hashing_js_1 = require("../crypto/hashing.js");
const validator_js_1 = require("./validator.js");
/**
 * Software-based attestation provider.
 *
 * Signs attestation quotes with a local (in-process) RSA-PSS or ECDSA P-256
 * key pair. This provides NO hardware guarantees — it exists for development,
 * testing, and low-assurance deployments where no TPM / Secure Enclave / TEE
 * is available.
 *
 * The signing key is generated lazily on first use, or can be supplied via
 * the constructor (useful for restoring a previously-persisted identity).
 */
class SoftwareAttestationProvider {
    name = 'software';
    publicKey;
    privateKey;
    algorithm;
    hardware;
    cachedProbe = null;
    /**
     * @param opts - Optional configuration.
     * @param opts.algorithm - Key algorithm to generate. Defaults to `ecdsa`.
     * @param opts.privateKey - Pre-existing private key (PEM or KeyObject). If
     *   supplied, `opts.publicKey` must also be supplied.
     * @param opts.publicKey - Pre-existing public key (PEM or KeyObject).
     * @param opts.hardware - HardwareValidator instance (defaults to a new one).
     */
    constructor(opts = {}) {
        this.hardware = opts.hardware ?? new validator_js_1.HardwareValidator();
        if (opts.privateKey && opts.publicKey) {
            // Import supplied keys via the typed importKeyPem helper.
            const pubKeyObj = typeof opts.publicKey === 'string'
                ? (0, keys_js_1.importKeyPem)(opts.publicKey, 'public')
                : opts.publicKey;
            const privKeyObj = typeof opts.privateKey === 'string'
                ? (0, keys_js_1.importKeyPem)(opts.privateKey, 'private')
                : opts.privateKey;
            this.publicKey = pubKeyObj;
            this.privateKey = privKeyObj;
            this.algorithm = (0, keys_js_1.algorithmForKey)(privKeyObj);
        }
        else {
            const algo = opts.algorithm ?? 'ecdsa';
            const kp = (0, keys_js_1.generateKeyPair)(algo);
            this.publicKey = kp.publicKey;
            this.privateKey = kp.privateKey;
            this.algorithm = kp.algorithm;
        }
    }
    /** @inheritdoc */
    isAvailable() {
        // The software provider is always available — that's the point.
        return true;
    }
    /**
     * Return the provider's public key (PEM). Useful for transmitting the
     * attestation key to a verifier out of band.
     */
    getPublicKeyPem() {
        return this.publicKey.export({ type: 'spki', format: 'pem' }).toString('utf8');
    }
    /**
     * Return the SHA-256 fingerprint of the provider's public key.
     */
    getPublicKeyFingerprint() {
        return (0, keys_js_1.getKeyFingerprint)(this.publicKey);
    }
    /**
     * Return the signature algorithm used by this provider.
     */
    getAlgorithm() {
        return this.algorithm;
    }
    /** @inheritdoc */
    async attest(data, nonce) {
        if (!Buffer.isBuffer(data)) {
            throw new errors_js_1.HardwareValidationError('attest: data must be a Buffer');
        }
        if (typeof nonce !== 'string' || nonce.length === 0) {
            throw new errors_js_1.HardwareValidationError('attest: nonce must be a non-empty string');
        }
        // Probe hardware once and cache. Even though we sign with a software key,
        // we include the probe in the quote so the verifier can see that no
        // hardware root was available.
        if (!this.cachedProbe) {
            this.cachedProbe = this.hardware.probe();
        }
        const measurements = {
            // SHA-256 of the data being attested.
            dataHash: (0, hashing_js_1.sha256)(data).toString('hex'),
            // Provider name (so the verifier knows this is software-signed).
            provider: 'software',
            // Public key fingerprint (binding).
            publicKeyFingerprint: this.getPublicKeyFingerprint(),
        };
        const timestamp = new Date().toISOString();
        // Build the canonical quote bytes (without the signature field) and sign.
        const quoteWithoutSig = {
            version: 1,
            deviceFingerprint: data.toString('utf8'),
            measurements,
            timestamp,
            nonce,
            algorithm: this.algorithm,
            hardware: this.cachedProbe,
        };
        const canonical = canonicalQuoteBytes(quoteWithoutSig);
        const signature = (0, signatures_js_1.sign)(this.privateKey, canonical, this.algorithm);
        const quote = {
            ...quoteWithoutSig,
            signature,
        };
        return quote;
    }
    /** @inheritdoc */
    async verifyQuote(quote, publicKey) {
        if (!quote || typeof quote !== 'object')
            return false;
        // Use the supplied public key (or fall back to our own — useful for
        // verifying our own quotes in tests).
        const pubKey = publicKey ?? this.publicKey;
        if (!quote.signature || !quote.algorithm)
            return false;
        const { signature, ...rest } = quote;
        const canonical = canonicalQuoteBytes(rest);
        try {
            return (0, signatures_js_1.verify)(pubKey, canonical, signature, quote.algorithm);
        }
        catch {
            return false;
        }
    }
}
exports.SoftwareAttestationProvider = SoftwareAttestationProvider;
/**
 * Compute the canonical signed bytes for an attestation quote (everything
 * except the `signature` field). The order MUST be stable across
 * implementations and Node versions.
 *
 * @internal
 */
function canonicalQuoteBytes(quote) {
    // Stable JSON: sorted keys, no whitespace.
    const stable = stableStringify(quote);
    return Buffer.from(stable, 'utf8');
}
/**
 * Stable JSON stringify with sorted keys.
 * @internal
 */
function stableStringify(value) {
    if (value === null || typeof value !== 'object') {
        return JSON.stringify(value);
    }
    if (Array.isArray(value)) {
        return '[' + value.map(stableStringify).join(',') + ']';
    }
    if (Buffer.isBuffer(value)) {
        return JSON.stringify(value.toString('hex'));
    }
    const keys = Object.keys(value).sort();
    return '{' + keys
        .map((k) => JSON.stringify(k) + ':' + stableStringify(value[k]))
        .join(',') + '}';
}
// Internal helpers re-exported for tests.
exports._internal = {
    canonicalQuoteBytes,
    stableStringify,
    sha256: hashing_js_1.sha256,
};
//# sourceMappingURL=provider.js.map