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
import type { KeyAlgorithm, SignatureAlgorithm, GeneratedKeyPair } from '../types.js';
/** RSA modulus length used by default (>= 3072 bits per NIST SP 800-57). */
export declare const DEFAULT_RSA_MODULUS = 3072;
/** RSA public exponent. */
export declare const DEFAULT_RSA_EXPONENT = 65537;
/** EC named curve used for ECDSA. */
export declare const DEFAULT_EC_CURVE = "prime256v1";
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
export declare function algorithmFor(algo: KeyAlgorithm): SignatureAlgorithm;
/**
 * Map a `crypto.KeyObject`'s `asymmetricKeyType` to a {@link SignatureAlgorithm}.
 * Throws if the key type is not RSA or EC (P-256).
 */
export declare function algorithmForKey(key: crypto.KeyObject): SignatureAlgorithm;
/**
 * Generate a key pair.
 *
 * @param algo - `'rsa'` for RSA-PSS or `'ecdsa'` for ECDSA P-256.
 * @param opts - Optional parameters.
 * @returns Key pair + resolved signature algorithm.
 * @throws {@link AttestError} on any failure.
 */
export declare function generateKeyPair(algo: KeyAlgorithm, opts?: GenerateKeyPairOptions): GeneratedKeyPair;
/**
 * Import a public or private key from PEM.
 *
 * @param pem - PEM-encoded key.
 * @param type - `'public'` or `'private'`.
 */
export declare function importKeyPem(pem: string, type: 'public' | 'private'): crypto.KeyObject;
/**
 * Export a key as PEM (SPKI for public, PKCS#8 for private).
 *
 * @param key - KeyObject to export.
 * @param type - `'public'` or `'private'`.
 * @returns PEM string.
 */
export declare function exportKeyPem(key: crypto.KeyObject, type: 'public' | 'private'): string;
/**
 * Compute a hex-encoded SHA-256 fingerprint of a public key's SPKI DER encoding.
 *
 * Accepts either a KeyObject or a PEM string for convenience.
 *
 * @param publicKey - Public key (KeyObject or PEM string).
 * @returns 64-character hex string.
 */
export declare function getKeyFingerprint(publicKey: crypto.KeyObject | string): string;
//# sourceMappingURL=keys.d.ts.map