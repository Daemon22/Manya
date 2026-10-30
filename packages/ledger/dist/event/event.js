"use strict";
/**
 * @manya-os/ledger — ledger events.
 *
 * A {@link LedgerEvent} is the atomic unit of the audit ledger. Each event's
 * `hash` is the SHA-256 of the canonical serialization of its signing fields
 * (`{ id, seq, type, actor, payload, timestamp, prevHash }`). Optional
 * metadata and the signature itself are deliberately excluded so the hash is
 * stable regardless of when (or whether) the event is signed.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Conceived, directed, and owned by Uviwe Menyiwe (Azura Daemon), founder
 * of the Manya Hael Foundation.
 *
 * Licensed under the Apache License, Version 2.0.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GENESIS_PREV_HASH = void 0;
exports.computeEventHash = computeEventHash;
exports.createEvent = createEvent;
exports.signEvent = signEvent;
exports.verifyEventSignature = verifyEventSignature;
exports.eventKeyId = eventKeyId;
const errors_js_1 = require("../errors.js");
const codec_js_1 = require("./codec.js");
const hashing_js_1 = require("../crypto/hashing.js");
const keys_js_1 = require("../crypto/keys.js");
/**
 * All-zero 64-character hex string. Used as the `prevHash` of the genesis
 * event (the first event in a fresh chain).
 */
exports.GENESIS_PREV_HASH = '0'.repeat(64);
/**
 * Compute the SHA-256 hash of a ledger event's signing fields.
 *
 * The signed fields are exactly `{ id, seq, type, actor, payload, timestamp,
 * prevHash }`. `metadata`, `hash`, `signature`, and `signatureAlgorithm` are
 * NEVER included.
 *
 * @param fields - Signing fields.
 * @returns 64-character lowercase hex SHA-256.
 */
function computeEventHash(fields) {
    return (0, hashing_js_1.sha256)((0, codec_js_1.canonicalSerialize)({
        id: fields.id,
        seq: fields.seq,
        type: fields.type,
        actor: fields.actor,
        payload: fields.payload,
        timestamp: fields.timestamp,
        prevHash: fields.prevHash,
    })).toString('hex');
}
/**
 * Create a new (unsigned) ledger event.
 *
 * The event's `hash` is computed from the canonical serialization of its
 * signing fields. The event is returned WITHOUT a signature — call
 * {@link signEvent} to attach one.
 *
 * @param opts - Creation options.
 * @returns A new {@link LedgerEvent} (without a signature).
 * @throws {@link EventError} on validation failure.
 */
function createEvent(opts) {
    if (!opts || typeof opts !== 'object') {
        throw new errors_js_1.EventError('createEvent: options are required');
    }
    if (typeof opts.type !== 'string' || opts.type.length === 0) {
        throw new errors_js_1.EventError('createEvent: type must be a non-empty string');
    }
    if (typeof opts.actor !== 'string' || opts.actor.length === 0) {
        throw new errors_js_1.EventError('createEvent: actor must be a non-empty string');
    }
    if (opts.payload === null || typeof opts.payload !== 'object') {
        throw new errors_js_1.EventError('createEvent: payload must be a JSON object');
    }
    if (Array.isArray(opts.payload)) {
        throw new errors_js_1.EventError('createEvent: payload must be an object, not an array');
    }
    const id = opts.id ?? (0, hashing_js_1.uuid)();
    if (typeof id !== 'string' || id.length === 0) {
        throw new errors_js_1.EventError('createEvent: id must be a non-empty string');
    }
    const seq = opts.seq ?? 1;
    if (!Number.isInteger(seq) || seq < 1) {
        throw new errors_js_1.EventError('createEvent: seq must be a positive integer');
    }
    const timestamp = opts.timestamp ?? new Date().toISOString();
    if (typeof timestamp !== 'string' || timestamp.length === 0) {
        throw new errors_js_1.EventError('createEvent: timestamp must be a non-empty string');
    }
    const prevHash = opts.prevHash ?? exports.GENESIS_PREV_HASH;
    if (typeof prevHash !== 'string' || !/^[0-9a-fA-F]*$/.test(prevHash)) {
        throw new errors_js_1.EventError('createEvent: prevHash must be a hex string');
    }
    const metadata = opts.metadata === undefined ? undefined : { ...opts.metadata };
    // Validate that payload + metadata round-trip through canonical serialization.
    // This catches non-serializable values (functions, symbols, cycles) early.
    try {
        (0, codec_js_1.canonicalSerialize)({
            id,
            seq,
            type: opts.type,
            actor: opts.actor,
            payload: opts.payload,
            timestamp,
            prevHash,
        });
        if (metadata !== undefined)
            (0, codec_js_1.canonicalSerialize)(metadata);
    }
    catch (err) {
        throw new errors_js_1.EventError('createEvent: payload / metadata are not canonical-serializable: ' +
            err.message, err);
    }
    const hash = computeEventHash({
        id,
        seq,
        type: opts.type,
        actor: opts.actor,
        payload: opts.payload,
        timestamp,
        prevHash,
    });
    return {
        id,
        seq,
        type: opts.type,
        actor: opts.actor,
        payload: opts.payload,
        timestamp,
        prevHash,
        hash,
        ...(metadata !== undefined ? { metadata } : {}),
    };
}
/**
 * Sign a ledger event in place (returns a new event with `signature` and
 * `signatureAlgorithm` populated).
 *
 * The signature is computed over the event's `hash` (32 raw bytes, decoded
 * from the hex string). Verification therefore reduces to verifying the
 * signature against `Buffer.from(event.hash, 'hex')`.
 *
 * @param event - The event to sign (must already have a `hash`).
 * @param privateKey - Private KeyObject or PEM string.
 * @param algo - Optional signature algorithm. Inferred from the key if omitted.
 * @returns A new event with `signature` and `signatureAlgorithm` set.
 * @throws {@link EventError} on failure.
 */
function signEvent(event, privateKey, algo) {
    if (!event || typeof event.hash !== 'string' || event.hash.length !== 64) {
        throw new errors_js_1.EventError('signEvent: event must have a valid 64-char hex hash');
    }
    let hashBytes;
    try {
        hashBytes = Buffer.from(event.hash, 'hex');
    }
    catch (err) {
        throw new errors_js_1.EventError('signEvent: cannot decode hash: ' + err.message, err);
    }
    if (hashBytes.length !== 32) {
        throw new errors_js_1.EventError('signEvent: hash must decode to 32 bytes');
    }
    let signature;
    let resolvedAlgo;
    try {
        // We need to know the algorithm even if `sign()` infers it from the key,
        // so we attach it to the event for later verification. The simplest way
        // is to ask algorithmForKey via getKeyId/sign wrapper — but the public
        // `sign()` doesn't return the algorithm. We resolve it explicitly:
        resolvedAlgo = algo ?? inferAlgorithmFromKey(privateKey);
        signature = (0, keys_js_1.sign)(privateKey, hashBytes, resolvedAlgo);
    }
    catch (err) {
        if (err instanceof errors_js_1.EventError)
            throw err;
        throw new errors_js_1.EventError('signEvent failed: ' + err.message, err);
    }
    return { ...event, signature, signatureAlgorithm: resolvedAlgo };
}
/**
 * Verify the signature on a signed ledger event.
 *
 * @param event - Signed event.
 * @param publicKey - Public KeyObject or PEM string.
 * @returns `true` iff the signature is valid (or the event is unsigned and
 *          `allowUnsigned` is `true`).
 * @throws {@link EventError} if the event hash is malformed.
 */
function verifyEventSignature(event, publicKey, allowUnsigned = false) {
    if (!event || typeof event.hash !== 'string' || event.hash.length !== 64) {
        throw new errors_js_1.EventError('verifyEventSignature: event must have a valid 64-char hex hash');
    }
    if (!event.signature) {
        return allowUnsigned;
    }
    let hashBytes;
    try {
        hashBytes = Buffer.from(event.hash, 'hex');
    }
    catch (err) {
        throw new errors_js_1.EventError('verifyEventSignature: cannot decode hash: ' + err.message, err);
    }
    if (hashBytes.length !== 32) {
        throw new errors_js_1.EventError('verifyEventSignature: hash must decode to 32 bytes');
    }
    let sigBytes;
    try {
        sigBytes = Buffer.from(event.signature, 'hex');
    }
    catch (err) {
        throw new errors_js_1.EventError('verifyEventSignature: cannot decode signature: ' + err.message, err);
    }
    try {
        return (0, keys_js_1.verify)(publicKey, hashBytes, sigBytes, event.signatureAlgorithm);
    }
    catch (err) {
        if (err instanceof errors_js_1.EventError)
            throw err;
        throw new errors_js_1.EventError('verifyEventSignature failed: ' + err.message, err);
    }
}
/**
 * Compute the key id (hex SHA-256 of the SPKI DER) of a public key.
 *
 * Convenience wrapper around `getKeyId`. Useful for attaching to events or
 * sync bundles as the signing key identifier.
 */
function eventKeyId(publicKey) {
    return (0, keys_js_1.getKeyId)(publicKey);
}
/**
 * Infer the signature algorithm from a private key (KeyObject or PEM string).
 *
 * For PEM strings we cannot introspect the type without parsing — we always
 * try ECDSA first (the default), then fall back to RSA-PSS. This is only used
 * when `algo` is omitted from {@link signEvent}; explicit `algo` is always
 * preferred for PEM-string keys.
 */
function inferAlgorithmFromKey(privateKey) {
    if (typeof privateKey !== 'string') {
        // Defer to algorithmForKey via the keys module — but we don't import it
        // here to avoid a cycle (keys.ts imports from this file's siblings).
        // Instead, ask the private key directly.
        try {
            const type = privateKey.asymmetricKeyType;
            if (type === 'rsa')
                return 'rsa-pss';
            if (type === 'ec')
                return 'ecdsa-p256';
        }
        catch {
            // fall through
        }
        return 'ecdsa-p256';
    }
    // Heuristic: PEM strings starting with "-----BEGIN RSA PRIVATE KEY-----"
    // or "-----BEGIN ENCRYPTED PRIVATE KEY-----" are typically RSA; PKCS#8
    // generic ("-----BEGIN PRIVATE KEY-----") is ambiguous — default to ECDSA
    // (the package default) which will produce a clean error if the key is
    // actually RSA and the caller should pass an explicit `algo`.
    if (/BEGIN RSA PRIVATE KEY/.test(privateKey))
        return 'rsa-pss';
    return 'ecdsa-p256';
}
//# sourceMappingURL=event.js.map