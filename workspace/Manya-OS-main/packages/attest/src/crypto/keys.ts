/**
 * @manya-os/attest — key generation, import/export, fingerprints.
 *
 * Self-contained: implements locally the subset of @manya-os/keyring's key
 * utilities needed by @manya-os/attest (RSA-PSS 3072, ECDSA P-256).
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import * as crypto from 'crypto';
import { AttestError, FingerprintError } from '../errors.js';
import type { KeyAlgorithm, SignatureAlgorithm, GeneratedKeyPair } from '../types.js';
import { sha256 } from './hashing.js';

/** RSA modulus length used by default (>= 3072 bits per NIST SP 800-57). */
export const DEFAULT_RSA_MODULUS = 3072;
/** RSA public exponent. */
export const DEFAULT_RSA_EXPONENT = 65537;
/** EC named curve used for ECDSA. */
export const DEFAULT_EC_CURVE = 'prime256v1';

/** Optional parameters for {@link generateKeyPair}. */
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
      throw new AttestError(`unknown key algorithm: ${algo as string}`);
  }
}

/**
 * Map a `crypto.KeyObject`'s `asymmetricKeyType` to a {@link SignatureAlgorithm}.
 * Throws if the key type is not RSA or EC (P-256).
 */
export function algorithmForKey(key: crypto.KeyObject): SignatureAlgorithm {
  let type: crypto.KeyType | undefined;
  try {
    type = key.asymmetricKeyType;
  } catch (err) {
    throw new AttestError(
      'algorithmForKey: cannot read key type: ' + (err as Error).message,
      'KEY_TYPE_ERROR',
      err
    );
  }
  if (type === 'rsa') return 'rsa-pss';
  if (type === 'ec') {
    // Verify the curve is P-256.
    let details: crypto.AsymmetricKeyDetails | undefined;
    try {
      details = key.asymmetricKeyDetails;
    } catch {
      // Fall through to default.
    }
    if (details && (details as { namedCurve?: string }).namedCurve) {
      const curve = (details as { namedCurve?: string }).namedCurve;
      if (curve !== 'P-256' && curve !== 'prime256v1' && curve !== 'secp256r1') {
        throw new AttestError(
          `algorithmForKey: only NIST P-256 is supported, got ${curve}`
        );
      }
    }
    return 'ecdsa-p256';
  }
  throw new AttestError(
    `algorithmForKey: unsupported key type: ${type ?? 'unknown'} (only rsa and ec are supported)`
  );
}

/**
 * Generate a key pair.
 *
 * @param algo - `'rsa'` for RSA-PSS or `'ecdsa'` for ECDSA P-256.
 * @param opts - Optional parameters.
 * @returns Key pair + resolved signature algorithm.
 * @throws {@link AttestError} on any failure.
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
        throw new AttestError(
          `unsupported EC curve: ${curve}. Only 'prime256v1' (NIST P-256) is supported.`
        );
      }
      ({ publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
        namedCurve: curve,
      }));
    } else {
      throw new AttestError(`unknown key algorithm: ${algo as string}`);
    }
    return { publicKey, privateKey, algorithm: algorithmFor(algo) };
  } catch (err) {
    if (err instanceof AttestError) throw err;
    throw new AttestError('key generation failed: ' + (err as Error).message, 'KEY_GENERATION_ERROR', err);
  }
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
    throw new AttestError(
      `failed to import ${type} key from PEM: ${(err as Error).message}`,
      'KEY_IMPORT_ERROR',
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
    return key.export({ type: 'pkcs8', format: 'pem' }).toString('utf8');
  } catch (err) {
    throw new AttestError(
      `failed to export ${type} key to PEM: ${(err as Error).message}`,
      'KEY_EXPORT_ERROR',
      err
    );
  }
}

/**
 * Compute a hex-encoded SHA-256 fingerprint of a public key's SPKI DER encoding.
 *
 * Accepts either a KeyObject or a PEM string for convenience.
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
    throw new FingerprintError(
      'getKeyFingerprint failed: ' + (err as Error).message,
      err
    );
  }
}
