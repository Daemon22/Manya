/**
 * @manya-os/keyring — multi-device sync.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
import * as crypto from 'crypto';
import type { KeyringWallet } from '../wallet/wallet.js';
import type { SyncBundle, SyncApplyResult, VerifiableCredential, SignatureAlgorithm } from '../types.js';
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
export declare class MultiDeviceSync {
    /**
     * Create a signed sync bundle from the source wallet.
     *
     * @param wallet - Source wallet.
     * @param signerIdentityId - Optional identity to sign with. Defaults to the
     *   wallet's primary identity.
     * @returns Signed sync bundle.
     */
    createSyncBundle(wallet: KeyringWallet, signerIdentityId?: string): SyncBundle;
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
    applySyncBundle(wallet: KeyringWallet, bundle: SyncBundle, sourcePublicKey: crypto.KeyObject | string): Promise<SyncApplyResult>;
    /**
     * Validate a bundle's signature without applying it. Returns `true` iff
     * the signature is valid.
     */
    validateBundle(bundle: SyncBundle, sourcePublicKey: crypto.KeyObject | string): boolean;
}
/**
 * Build a sync bundle manually from raw parts. Useful for tests and for
 * constructing bundles from external state.
 *
 * @internal — exported for testing.
 */
export declare function buildBundleFromParts(parts: {
    sourceDid: string;
    timestamp: string;
    sequence: number;
    identity: import('../types.js').SerializedIdentity;
    credentials: VerifiableCredential[];
}, privateKey: crypto.KeyObject, algorithm: SignatureAlgorithm): SyncBundle;
//# sourceMappingURL=multi-device.d.ts.map