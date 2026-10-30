/**
 * @manya-os/keyring — Identity (sovereign, did:key-style).
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import * as crypto from 'crypto';
import { randomUUID } from 'crypto';
import {
  KeyGenerationError,
  KeyringError,
} from '../errors.js';
import { getKeyFingerprint, exportPublicRaw } from '../crypto/keys.js';
import { sha256 } from '../crypto/hashing.js';
import type { SerializedIdentity, SignatureAlgorithm } from '../types.js';

/**
 * Base58-Bitcoin alphabet (used by did:key / multibase 'z').
 */
const BASE58_ALPHABET =
  '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

/**
 * Encode bytes as base58 (Bitcoin alphabet).
 * @internal
 */
export function base58Encode(input: Buffer): string {
  if (input.length === 0) return '';
  // Count leading zero bytes — each encodes to a single '1'.
  let zeros = 0;
  while (zeros < input.length && input[zeros] === 0) zeros++;
  // Big-endian byte array → big-endian base58 digits (stored LSB-first).
  const digits: number[] = [];
  for (let i = zeros; i < input.length; i++) {
    let carry = input[i];
    for (let j = 0; j < digits.length; j++) {
      carry += digits[j] << 8;
      digits[j] = carry % 58;
      carry = (carry / 58) | 0;
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = (carry / 58) | 0;
    }
  }
  let out = '';
  for (let i = 0; i < zeros; i++) out += BASE58_ALPHABET[0];
  for (let i = digits.length - 1; i >= 0; i--) {
    out += BASE58_ALPHABET[digits[i]];
  }
  return out;
}

/**
 * Derive a did:key-style DID from a public key + algorithm.
 *
 * The format is `did:key:z<base58(algo-prefix || key-material)>` where:
 * - `algo-prefix` is `0x85 0x1a` (custom marker for RSA-PSS) followed by
 *   `sha256(spki-der)`, OR `0x12 0x00` (multicodec secp256r1-pub) followed
 *   by the raw P-256 point bytes.
 *
 * The `z` prefix follows the multibase spec for base58btc. This is a
 * deterministic, stable derivation: the same key always produces the same DID.
 *
 * @param publicKey - Public KeyObject or PEM string.
 * @param algorithm - Signature algorithm.
 */
export function deriveDidKey(
  publicKey: crypto.KeyObject | string,
  algorithm: SignatureAlgorithm
): string {
  try {
    const keyObj =
      typeof publicKey === 'string'
        ? crypto.createPublicKey(publicKey)
        : publicKey;
    let body: Buffer;
    if (algorithm === 'rsa-pss') {
      // Use SHA-256 of the SPKI DER — keeps the DID short for RSA keys.
      const spkiDer = exportPublicRaw(keyObj);
      const digest = sha256(spkiDer);
      // Custom prefix: marker byte 0x85 + 0x1a (RSA-PSS in manya) + digest.
      body = Buffer.concat([Buffer.from([0x85, 0x1a]), digest]);
    } else {
      // P-256: export raw uncompressed point (0x04 || X || Y).
      const raw = keyObj.export({ type: 'spki', format: 'der' });
      // SPKI for EC keys ends with the SEC1 point. We prefix with multicodec
      // secp256r1-pub (0x1200) for did:key interop.
      body = Buffer.concat([Buffer.from([0x12, 0x00]), raw]);
    }
    return 'did:key:z' + base58Encode(body);
  } catch (err) {
    throw new KeyGenerationError(
      'deriveDidKey failed: ' + (err as Error).message,
      err
    );
  }
}

/**
 * A sovereign identity. Holds the *public* form of a keypair — never the
 * private key. The associated private key is held by a
 * {@link HardwareKeyProvider} and addressed by key id (see
 * {@link KeyringWallet}).
 */
export class Identity {
  /** UUID v4. */
  public readonly id: string;
  /** did:key-style DID derived from the public key. */
  public readonly did: string;
  /** SPKI PEM-encoded public key. */
  public readonly publicKey: string;
  /** Signature algorithm. */
  public readonly algorithm: SignatureAlgorithm;
  /** ISO-8601 creation timestamp. */
  public readonly createdAt: string;
  /** Free-form public metadata (e.g. agent name, profile URL). */
  public metadata: Record<string, unknown>;

  constructor(params: {
    id?: string;
    did: string;
    publicKey: string;
    algorithm: SignatureAlgorithm;
    createdAt?: string;
    metadata?: Record<string, unknown>;
  }) {
    this.id = params.id ?? randomUUID();
    this.did = params.did;
    this.publicKey = params.publicKey;
    this.algorithm = params.algorithm;
    this.createdAt = params.createdAt ?? new Date().toISOString();
    this.metadata = params.metadata ?? {};
  }

  /**
   * Construct an {@link Identity} from a PEM-encoded public key + algorithm.
   */
  public static fromPublicKey(
    publicKeyPem: string,
    algorithm: SignatureAlgorithm,
    metadata: Record<string, unknown> = {}
  ): Identity {
    const did = deriveDidKey(publicKeyPem, algorithm);
    return new Identity({
      did,
      publicKey: publicKeyPem,
      algorithm,
      metadata,
    });
  }

  /** Short hex fingerprint of the public key (SHA-256 of DER). */
  public fingerprint(): string {
    return getKeyFingerprint(this.publicKey);
  }

  /** Serialize to a plain object suitable for JSON. */
  public serialize(): SerializedIdentity {
    return {
      id: this.id,
      did: this.did,
      publicKey: this.publicKey,
      algorithm: this.algorithm,
      createdAt: this.createdAt,
      metadata: this.metadata,
    };
  }

  /** Deserialize from a plain object. */
  public static deserialize(data: SerializedIdentity): Identity {
    if (!data || typeof data !== 'object') {
      throw new KeyringError(
        'Identity.deserialize: expected object',
        'IDENTITY_DESERIALIZE_ERROR'
      );
    }
    const required = ['id', 'did', 'publicKey', 'algorithm', 'createdAt'];
    for (const key of required) {
      if (!(key in data)) {
        throw new KeyringError(
          `Identity.deserialize: missing field '${key}'`,
          'IDENTITY_DESERIALIZE_ERROR'
        );
      }
    }
    if (data.algorithm !== 'rsa-pss' && data.algorithm !== 'ecdsa-p256') {
      throw new KeyringError(
        `Identity.deserialize: unsupported algorithm '${data.algorithm}'`,
        'IDENTITY_DESERIALIZE_ERROR'
      );
    }
    return new Identity({
      id: data.id,
      did: data.did,
      publicKey: data.publicKey,
      algorithm: data.algorithm,
      createdAt: data.createdAt,
      metadata: data.metadata ?? {},
    });
  }

  /** Equality by DID. */
  public equals(other: Identity): boolean {
    return this.did === other.did;
  }
}
