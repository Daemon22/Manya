/**
 * @manya-os/keyring — key generation, derivation, import/export, fingerprints.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
import * as crypto from 'crypto';
import type { KeyAlgorithm, SignatureAlgorithm } from '../types.js';
/** RSA modulus length used by default (>= 3072 bits per NIST SP 800-57). */
export declare const DEFAULT_RSA_MODULUS = 3072;
/** RSA public exponent. */
export declare const DEFAULT_RSA_EXPONENT = 65537;
/** EC named curve used for ECDSA. */
export declare const DEFAULT_EC_CURVE = "prime256v1";
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
export declare function algorithmFor(algo: KeyAlgorithm): SignatureAlgorithm;
/**
 * Generate a key pair.
 *
 * @param algo - `'rsa'` for RSA-PSS or `'ecdsa'` for ECDSA P-256.
 * @param opts - Optional parameters.
 * @returns Key pair + resolved signature algorithm.
 * @throws {@link KeyGenerationError} on any failure.
 */
export declare function generateKeyPair(algo: KeyAlgorithm, opts?: GenerateKeyPairOptions): GeneratedKeyPair;
/**
 * Derive a subkey from a master key using HKDF-SHA256.
 *
 * @param master - Input keying material (any length).
 * @param info - Contextual info (e.g. `keyring:sync:v1`).
 * @param length - Output length in bytes (≤ 255 × 32).
 * @returns Derived key material.
 */
export declare function deriveKey(master: Buffer, info: Buffer | string, length: number): Buffer;
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
 * Compute a hex-encoded SHA-256 fingerprint of a public key's DER encoding.
 *
 * @param publicKey - Public key (KeyObject or PEM string).
 * @returns 64-character hex string.
 */
export declare function getKeyFingerprint(publicKey: crypto.KeyObject | string): string;
/**
 * Export a public key's raw bytes (uncompressed point for EC, DER for RSA).
 * Used internally for did:key derivation.
 *
 * @internal
 */
export declare function exportPublicRaw(key: crypto.KeyObject): Buffer;
//# sourceMappingURL=keys.d.ts.map