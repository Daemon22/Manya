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
import { randomUUID } from 'crypto';
import {
  HardwareKeyError,
  KeyGenerationError,
} from '../errors.js';
import {
  generateKeyPair,
  exportKeyPem,
  algorithmFor,
} from '../crypto/keys.js';
import { sign, verify } from '../crypto/signatures.js';
import type {
  KeyAlgorithm,
  SignatureAlgorithm,
} from '../types.js';
import type { GeneratedHardwareKey, HardwareKeyProvider } from './provider.js';

interface StoredKey {
  publicKey: crypto.KeyObject;
  privateKey: crypto.KeyObject;
  algorithm: SignatureAlgorithm;
}

/**
 * Software implementation of {@link HardwareKeyProvider}. Keys live in
 * process memory; they are never persisted to disk.
 */
export class SoftwareKeyProvider implements HardwareKeyProvider {
  private readonly keys = new Map<string, StoredKey>();

  /** @inheritdoc */
  public isAvailable(): boolean {
    return true;
  }

  /** @inheritdoc */
  public async generateKeyPair(
    algo: KeyAlgorithm,
    keyIdHint?: string
  ): Promise<GeneratedHardwareKey> {
    const { publicKey, privateKey, algorithm } = generateKeyPair(algo);
    const keyId = keyIdHint ?? 'sw-' + randomUUID();
    if (this.keys.has(keyId)) {
      throw new KeyGenerationError(
        `SoftwareKeyProvider.generateKeyPair: keyId '${keyId}' already exists`
      );
    }
    this.keys.set(keyId, { publicKey, privateKey, algorithm });
    return {
      keyId,
      publicKeyPem: exportKeyPem(publicKey, 'public'),
      algorithm,
    };
  }

  /** @inheritdoc */
  public async sign(keyId: string, data: Buffer): Promise<Buffer> {
    const entry = this.keys.get(keyId);
    if (!entry) {
      throw new HardwareKeyError(`SoftwareKeyProvider.sign: unknown keyId '${keyId}'`);
    }
    const hex = sign(entry.privateKey, data, entry.algorithm);
    return Buffer.from(hex, 'hex');
  }

  /** @inheritdoc */
  public async verify(
    keyId: string,
    data: Buffer,
    signature: Buffer
  ): Promise<boolean> {
    const entry = this.keys.get(keyId);
    if (!entry) {
      throw new HardwareKeyError(`SoftwareKeyProvider.verify: unknown keyId '${keyId}'`);
    }
    return verify(entry.publicKey, data, signature, entry.algorithm);
  }

  /** @inheritdoc */
  public async deleteKey(keyId: string): Promise<void> {
    this.keys.delete(keyId);
  }

  /** @inheritdoc */
  public async hasKey(keyId: string): Promise<boolean> {
    return this.keys.has(keyId);
  }

  // ----- software-specific helpers (used internally by the wallet) -----

  /**
   * Replace the private key stored under `keyId` with the given key. Also
   * derives the matching public key from the new private key so that
   * subsequent `verify` calls use the correct public key. Used by the wallet
   * to register an externally-generated keypair with the provider.
   * @internal
   */
  public replaceKey(keyId: string, privateKey: crypto.KeyObject): void {
    const entry = this.keys.get(keyId);
    if (!entry) {
      throw new HardwareKeyError(`SoftwareKeyProvider.replaceKey: unknown keyId '${keyId}'`);
    }
    const publicKey = crypto.createPublicKey(privateKey);
    this.keys.set(keyId, { ...entry, privateKey, publicKey });
  }

  /**
   * Get the underlying private KeyObject for `keyId`. Only available on the
   * software provider — hardware providers never expose this.
   * @internal
   */
  public getPrivateKey(keyId: string): crypto.KeyObject | undefined {
    return this.keys.get(keyId)?.privateKey;
  }

  /**
   * Get the underlying public KeyObject for `keyId`.
   * @internal
   */
  public getPublicKey(keyId: string): crypto.KeyObject | undefined {
    return this.keys.get(keyId)?.publicKey;
  }

  /**
   * Get the algorithm for `keyId`.
   * @internal
   */
  public getAlgorithm(keyId: string): SignatureAlgorithm | undefined {
    return this.keys.get(keyId)?.algorithm;
  }

  /** Number of keys currently held. */
  public get size(): number {
    return this.keys.size;
  }

  /** Wipe all keys from memory. */
  public clear(): void {
    this.keys.clear();
  }

  /**
   * Directly import an existing keypair under a chosen keyId. Returns the
   * keyId.
   */
  public importExistingKey(
    publicKey: crypto.KeyObject,
    privateKey: crypto.KeyObject,
    algorithm: SignatureAlgorithm,
    keyIdHint?: string
  ): string {
    const keyId = keyIdHint ?? 'sw-' + randomUUID();
    if (this.keys.has(keyId)) {
      throw new KeyGenerationError(
        `SoftwareKeyProvider.importExistingKey: keyId '${keyId}' already exists`
      );
    }
    this.keys.set(keyId, { publicKey, privateKey, algorithm });
    return keyId;
  }
}

/**
 * Map a {@link KeyAlgorithm} to its concrete {@link SignatureAlgorithm}.
 * Re-exported here for parity with crypto/keys.
 */
export { algorithmFor };
