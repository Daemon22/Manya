/**
 * @manya-os/keyring — key generation, derivation, import/export, fingerprints.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import * as crypto from 'crypto';
import {
  KeyGenerationError,
  KeyringError,
} from '../errors.js';
import type { KeyAlgorithm, SignatureAlgorithm } from '../types.js';
import { hkdf, sha256 } from './hashing.js';

/** RSA modulus length used by default (>= 3072 bits per NIST SP 800-57). */
export const DEFAULT_RSA_MODULUS = 3072;
/** RSA public exponent. */
export const DEFAULT_RSA_EXPONENT = 65537;
/** EC named curve used for ECDSA. */
export const DEFAULT_EC_CURVE = 'prime256v1';

export interface GenerateKeyPairOptions {
  /**
   * RSA modulus length in bits. Ignored for ECDSA. Defaults to
   * {@link DEFAULT_RSA_MODULUS}.
   */
  rsaModulusBits?: number;
  /** RSA public exponent. Defaults to {@link DEFAULT_RSA_EXPONENT}. */
  rsaPublicExponent?: number;
  /**
   * EC curve. Currently only `prime256v1` (NIST P-256) is supported.
   * Defaults to {@link DEFAULT_EC_CURVE}.
   */
  ecCurve?: 'prime256v1';
}

export interface GeneratedKeyPair {
  publicKey: crypto.KeyObject;
  privateKey: crypto.KeyObject;
  /** Resolved signature algorithm. */
  algorithm: SignatureAlgorithm;
}

/**
 * Map a {@link KeyAlgorithm} to its concrete {@link SignatureAlgorithm}.
 */
export function algorithmFor(algo: KeyAlgorithm): SignatureAlgorithm {
  switch (algo) {
    case 'rsa':
      return 'rsa-pss';
    case 'ecdsa':
      return 'ecdsa-p256';
    default:
      throw new KeyGenerationError(`unknown key algorithm: ${algo as string}`);
  }
}

/**
 * Generate a key pair.
 *
 * @param algo - `'rsa'` for RSA-PSS or `'ecdsa'` for ECDSA P-256.
 * @param opts - Optional parameters.
 * @returns Key pair + resolved signature algorithm.
 * @throws {@link KeyGenerationError} on any failure.
 */
export function generateKeyPair(
  algo: KeyAlgorithm,
  opts: GenerateKeyPairOptions = {}
): GeneratedKeyPair {
  try {
    let publicKey: crypto.KeyObject;
    let privateKey: crypto.KeyObject;
    if (algo === 'rsa') {
      ({ publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: opts.rsaModulusBits ?? DEFAULT_RSA_MODULUS,
        publicExponent: opts.rsaPublicExponent ?? DEFAULT_RSA_EXPONENT,
      }));
    } else if (algo === 'ecdsa') {
      const curve = opts.ecCurve ?? DEFAULT_EC_CURVE;
      if (curve !== 'prime256v1') {
        throw new KeyGenerationError(
          `unsupported EC curve: ${curve}. Only 'prime256v1' (NIST P-256) is supported.`
        );
      }
      ({ publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
        namedCurve: curve,
      }));
    } else {
      throw new KeyGenerationError(`unknown key algorithm: ${algo as string}`);
    }
    return { publicKey, privateKey, algorithm: algorithmFor(algo) };
  } catch (err) {
    if (err instanceof KeyGenerationError) throw err;
    throw new KeyGenerationError(
      'key generation failed: ' + (err as Error).message,
      err
    );
  }
}

/**
 * Derive a subkey from a master key using HKDF-SHA256.
 *
 * @param master - Input keying material (any length).
 * @param info - Contextual info (e.g. `keyring:sync:v1`).
 * @param length - Output length in bytes (≤ 255 × 32).
 * @returns Derived key material.
 */
export function deriveKey(master: Buffer, info: Buffer | string, length: number): Buffer {
  const infoBuf = typeof info === 'string' ? Buffer.from(info, 'utf8') : info;
  // Empty salt is permitted by RFC 5869; we use a zeroed salt to be explicit.
  const salt = Buffer.alloc(32, 0);
  return hkdf(master, salt, infoBuf, length);
}

/**
 * Import a public or private key from PEM.
 *
 * @param pem - PEM-encoded key.
 * @param type - `'public'` or `'private'`.
 */
export function importKeyPem(
  pem: string,
  type: 'public' | 'private'
): crypto.KeyObject {
  try {
    if (type === 'public') {
      return crypto.createPublicKey(pem);
    }
    return crypto.createPrivateKey(pem);
  } catch (err) {
    throw new KeyGenerationError(
      `failed to import ${type} key from PEM: ${(err as Error).message}`,
      err
    );
  }
}

/**
 * Export a key as PEM (SPKI for public, PKCS#8 for private).
 *
 * @param key - KeyObject to export.
 * @param type - `'public'` or `'private'`.
 * @returns PEM string.
 */
export function exportKeyPem(
  key: crypto.KeyObject,
  type: 'public' | 'private'
): string {
  try {
    if (type === 'public') {
      return key.export({ type: 'spki', format: 'pem' }).toString('utf8');
    }
    return key
      .export({ type: 'pkcs8', format: 'pem' })
      .toString('utf8');
  } catch (err) {
    throw new KeyGenerationError(
      `failed to export ${type} key to PEM: ${(err as Error).message}`,
      err
    );
  }
}

/**
 * Compute a hex-encoded SHA-256 fingerprint of a public key's DER encoding.
 *
 * @param publicKey - Public key (KeyObject or PEM string).
 * @returns 64-character hex string.
 */
export function getKeyFingerprint(publicKey: crypto.KeyObject | string): string {
  try {
    const keyObj =
      typeof publicKey === 'string'
        ? crypto.createPublicKey(publicKey)
        : publicKey;
    const der = keyObj.export({ type: 'spki', format: 'der' });
    return sha256(der).toString('hex');
  } catch (err) {
    throw new KeyGenerationError(
      'getKeyFingerprint failed: ' + (err as Error).message,
      err
    );
  }
}

/**
 * Export a public key's raw bytes (uncompressed point for EC, DER for RSA).
 * Used internally for did:key derivation.
 *
 * @internal
 */
export function exportPublicRaw(key: crypto.KeyObject): Buffer {
  try {
    return key.export({ type: 'spki', format: 'der' });
  } catch (err) {
    throw new KeyringError(
      'exportPublicRaw failed: ' + (err as Error).message,
      'KEY_EXPORT_ERROR',
      err
    );
  }
}
