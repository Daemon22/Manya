/**
 * @manya-os/keyring — software key provider (default fallback).
 *
 * Stores private keys in process memory. Suitable for development, tests,
 * and trusted environments where hardware-backed storage is unavailable.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
import * as crypto from 'crypto';
import { algorithmFor } from '../crypto/keys.js';
import type { KeyAlgorithm, SignatureAlgorithm } from '../types.js';
import type { GeneratedHardwareKey, HardwareKeyProvider } from './provider.js';
/**
 * Software implementation of {@link HardwareKeyProvider}. Keys live in
 * process memory; they are never persisted to disk.
 */
export declare class SoftwareKeyProvider implements HardwareKeyProvider {
    private readonly keys;
    /** @inheritdoc */
    isAvailable(): boolean;
    /** @inheritdoc */
    generateKeyPair(algo: KeyAlgorithm, keyIdHint?: string): Promise<GeneratedHardwareKey>;
    /** @inheritdoc */
    sign(keyId: string, data: Buffer): Promise<Buffer>;
    /** @inheritdoc */
    verify(keyId: string, data: Buffer, signature: Buffer): Promise<boolean>;
    /** @inheritdoc */
    deleteKey(keyId: string): Promise<void>;
    /** @inheritdoc */
    hasKey(keyId: string): Promise<boolean>;
    /**
     * Replace the private key stored under `keyId` with the given key. Also
     * derives the matching public key from the new private key so that
     * subsequent `verify` calls use the correct public key. Used by the wallet
     * to register an externally-generated keypair with the provider.
     * @internal
     */
    replaceKey(keyId: string, privateKey: crypto.KeyObject): void;
    /**
     * Get the underlying private KeyObject for `keyId`. Only available on the
     * software provider — hardware providers never expose this.
     * @internal
     */
    getPrivateKey(keyId: string): crypto.KeyObject | undefined;
    /**
     * Get the underlying public KeyObject for `keyId`.
     * @internal
     */
    getPublicKey(keyId: string): crypto.KeyObject | undefined;
    /**
     * Get the algorithm for `keyId`.
     * @internal
     */
    getAlgorithm(keyId: string): SignatureAlgorithm | undefined;
    /** Number of keys currently held. */
    get size(): number;
    /** Wipe all keys from memory. */
    clear(): void;
    /**
     * Directly import an existing keypair under a chosen keyId. Returns the
     * keyId.
     */
    importExistingKey(publicKey: crypto.KeyObject, privateKey: crypto.KeyObject, algorithm: SignatureAlgorithm, keyIdHint?: string): string;
}
/**
 * Map a {@link KeyAlgorithm} to its concrete {@link SignatureAlgorithm}.
 * Re-exported here for parity with crypto/keys.
 */
export { algorithmFor };
//# sourceMappingURL=software-fallback.d.ts.map