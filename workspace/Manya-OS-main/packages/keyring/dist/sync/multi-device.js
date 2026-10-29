"use strict";
/**
 * @manya-os/keyring — multi-device sync.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MultiDeviceSync = void 0;
exports.buildBundleFromParts = buildBundleFromParts;
const errors_js_1 = require("../errors.js");
const signatures_js_1 = require("../crypto/signatures.js");
const hashing_js_1 = require("../crypto/hashing.js");
/** Sync bundle format version. */
const SYNC_BUNDLE_VERSION = 1;
/**
 * Produce a canonical byte representation of a sync bundle (with `proof`
 * stripped) for signing / verification.
 */
function canonicalBundleBytes(bundle) {
    const stable = stableSort(bundle);
    return Buffer.from(JSON.stringify(stable), 'utf8');
}
/**
 * Recursively sort object keys.
 * @internal
 */
function stableSort(value) {
    if (Array.isArray(value))
        return value.map((v) => stableSort(v));
    if (value && typeof value === 'object' && !Buffer.isBuffer(value)) {
        const out = {};
        for (const key of Object.keys(value).sort()) {
            out[key] = stableSort(value[key]);
        }
        return out;
    }
    return value;
}
/**
 * Multi-device sync coordinator.
 *
 * Produces signed sync bundles containing the source wallet's public
 * identity + credentials + timestamp + sequence number. Applies incoming
 * bundles to a target wallet, validating the signature and detecting
 * conflicts.
 *
 * Conflict policy:
 * - If a credential exists locally with a different `proofValue` for the
 *   same `id`, it's flagged as a conflict and skipped.
 * - If a credential exists locally with the same `proofValue`, it's skipped
 *   (no change).
 * - Otherwise the credential is added.
 */
class MultiDeviceSync {
    /**
     * Create a signed sync bundle from the source wallet.
     *
     * @param wallet - Source wallet.
     * @param signerIdentityId - Optional identity to sign with. Defaults to the
     *   wallet's primary identity.
     * @returns Signed sync bundle.
     */
    createSyncBundle(wallet, signerIdentityId) {
        const primary = signerIdentityId
            ? wallet.getIdentity(signerIdentityId)
            : wallet.getPrimaryIdentity();
        if (!primary) {
            throw new errors_js_1.SyncError('createSyncBundle: wallet has no primary identity');
        }
        const credentials = wallet.listCredentials();
        const sequence = wallet.getSequence() + 1;
        const timestamp = new Date().toISOString();
        // The signing happens via the wallet's software-provider hook.
        // For hardware-backed wallets, callers should extend this class.
        const unsigned = {
            version: SYNC_BUNDLE_VERSION,
            sourceDid: primary.did,
            timestamp,
            sequence,
            identity: primary.serialize(),
            credentials,
        };
        const bytes = canonicalBundleBytes(unsigned);
        // We need the private key. The wallet exposes sign() which delegates to
        // the hardware provider. We use that path so this works for both
        // software and hardware providers.
        let signatureHex;
        let algorithm;
        // Use the synchronous wallet.sign path when available. Since
        // wallet.sign returns a promise, we cannot call it synchronously. To
        // keep the bundle-creation API synchronous (callers usually expect
        // this), we use a synchronous software-key path via the wallet's
        // hardware provider if it is the software fallback.
        const provider = wallet.hardwareProvider;
        const isSoftware = provider &&
            typeof provider.getPrivateKey === 'function';
        const record = wallet;
        let resolved;
        try {
            resolved = record.resolveIdentity(signerIdentityId);
        }
        catch (err) {
            throw new errors_js_1.SyncError('createSyncBundle: could not resolve signer identity: ' +
                err.message, err);
        }
        algorithm = resolved.algorithm;
        if (isSoftware) {
            const sk = provider.getPrivateKey(resolved.keyId);
            if (!sk) {
                throw new errors_js_1.SyncError('createSyncBundle: signer private key not available');
            }
            signatureHex = (0, signatures_js_1.sign)(sk, bytes, algorithm);
        }
        else {
            // Hardware path: callers should override createSyncBundle or pre-sign.
            throw new errors_js_1.SyncError('createSyncBundle: hardware-backed wallets must override createSyncBundle (sync signing requires a private key)');
        }
        return {
            ...unsigned,
            proof: {
                type: 'manya:sync-bundle:2024',
                algorithm,
                value: signatureHex,
            },
        };
    }
    /**
     * Apply a sync bundle to a target wallet.
     *
     * @param wallet - Target wallet.
     * @param bundle - Incoming bundle.
     * @param sourcePublicKey - Public KeyObject or PEM string of the source
     *   identity. Used to verify the bundle's signature.
     * @returns Result indicating which credentials were applied, conflicted,
     *   or skipped.
     */
    async applySyncBundle(wallet, bundle, sourcePublicKey) {
        if (!bundle || bundle.version !== SYNC_BUNDLE_VERSION) {
            throw new errors_js_1.SyncError(`applySyncBundle: unsupported bundle version ${bundle?.version}`);
        }
        if (!bundle.proof || !bundle.proof.value) {
            throw new errors_js_1.SyncError('applySyncBundle: bundle missing proof');
        }
        if (!bundle.identity) {
            throw new errors_js_1.SyncError('applySyncBundle: bundle missing identity');
        }
        // Verify signature over canonical bytes.
        const { proof, ...unsigned } = bundle;
        void proof;
        const bytes = canonicalBundleBytes(unsigned);
        let ok;
        try {
            ok = (0, signatures_js_1.verify)(sourcePublicKey, bytes, bundle.proof.value, bundle.proof.algorithm);
        }
        catch (err) {
            throw new errors_js_1.SyncError('applySyncBundle: signature verification threw: ' +
                err.message, err);
        }
        if (!ok) {
            throw new errors_js_1.VerificationError('applySyncBundle: invalid bundle signature');
        }
        const applied = [];
        const conflicts = [];
        const skipped = [];
        for (const cred of bundle.credentials ?? []) {
            if (!cred || !cred.id) {
                conflicts.push('<missing-id>');
                continue;
            }
            const local = wallet.getCredential(cred.id);
            if (local) {
                if ((0, hashing_js_1.constantTimeEqual)(Buffer.from(local.proof.proofValue, 'hex'), Buffer.from(cred.proof.proofValue, 'hex'))) {
                    skipped.push(cred.id);
                }
                else {
                    conflicts.push(cred.id);
                }
            }
            else {
                try {
                    await wallet.addCredential(cred);
                    applied.push(cred.id);
                }
                catch (err) {
                    throw new errors_js_1.CredentialError(`applySyncBundle: failed to add credential ${cred.id}: ` +
                        err.message, err);
                }
            }
        }
        // Bump sequence if the bundle's sequence is ahead of ours.
        if (bundle.sequence > wallet.getSequence()) {
            // Use the wallet's internal bumpSequence via reflection-safe path.
            for (let i = wallet.getSequence(); i < bundle.sequence; i++) {
                wallet.bumpSequence();
            }
        }
        return { applied, conflicts, skipped };
    }
    /**
     * Validate a bundle's signature without applying it. Returns `true` iff
     * the signature is valid.
     */
    validateBundle(bundle, sourcePublicKey) {
        if (!bundle || !bundle.proof)
            return false;
        const { proof, ...unsigned } = bundle;
        void proof;
        const bytes = canonicalBundleBytes(unsigned);
        try {
            return (0, signatures_js_1.verify)(sourcePublicKey, bytes, bundle.proof.value, bundle.proof.algorithm);
        }
        catch {
            return false;
        }
    }
}
exports.MultiDeviceSync = MultiDeviceSync;
/**
 * Build a sync bundle manually from raw parts. Useful for tests and for
 * constructing bundles from external state.
 *
 * @internal — exported for testing.
 */
function buildBundleFromParts(parts, privateKey, algorithm) {
    const unsigned = {
        version: SYNC_BUNDLE_VERSION,
        sourceDid: parts.sourceDid,
        timestamp: parts.timestamp,
        sequence: parts.sequence,
        identity: parts.identity,
        credentials: parts.credentials,
    };
    const bytes = canonicalBundleBytes(unsigned);
    const signatureHex = (0, signatures_js_1.sign)(privateKey, bytes, algorithm);
    return {
        ...unsigned,
        proof: {
            type: 'manya:sync-bundle:2024',
            algorithm,
            value: signatureHex,
        },
    };
}
//# sourceMappingURL=multi-device.js.map