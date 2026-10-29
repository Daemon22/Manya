/**
 * @manya-os/attest — digital signatures (RSA-PSS, ECDSA P-256).
 *
 * Self-contained: implements locally the signature primitives needed by
 * @manya-os/attest. The verification path uses `crypto.timingSafeEqual` as a
 * defense-in-depth constant-time guard.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
import * as crypto from 'crypto';
import type { SignatureAlgorithm } from '../types.js';
/**
 * Sign `data` with `privateKey`.
 *
 * If `algo` is omitted, it is inferred from the key type: RSA keys produce
 * `rsa-pss` signatures, EC (P-256) keys produce `ecdsa-p256` signatures.
 *
 * @param privateKey - Private KeyObject or PEM string.
 * @param data - Bytes to sign.
 * @param algo - Optional signature algorithm. Inferred from the key if omitted.
 * @returns Hex-encoded signature.
 * @throws {@link AttestError} on any failure.
 */
export declare function sign(privateKey: crypto.KeyObject | string, data: Buffer, algo?: SignatureAlgorithm): string;
/**
 * Verify a `signature` over `data` against `publicKey`.
 *
 * Uses `crypto.timingSafeEqual` internally to avoid early-exit timing leaks.
 * Returns `false` for any malformed input or signature mismatch — callers
 * that need to distinguish bad signatures from bad inputs should catch
 * {@link AttestError}.
 *
 * If `algo` is omitted, it is inferred from the public key type.
 *
 * @param publicKey - Public KeyObject or PEM string.
 * @param data - Original bytes.
 * @param signature - Hex-encoded signature (or Buffer).
 * @param algo - Optional signature algorithm. Inferred from the key if omitted.
 * @returns `true` iff the signature is valid.
 */
export declare function verify(publicKey: crypto.KeyObject | string, data: Buffer, signature: Buffer | string, algo?: SignatureAlgorithm): boolean;
/**
 * Sign `data` with `privateKey` and throw a {@link ChallengeError} on failure.
 *
 * Convenience wrapper around {@link sign} for use in challenge-response paths
 * where a challenge-specific error type is more informative.
 */
export declare function signForChallenge(privateKey: crypto.KeyObject | string, data: Buffer, algo?: SignatureAlgorithm): string;
/**
 * Sign `data` with `privateKey` and throw an {@link AttestationError} on failure.
 *
 * Convenience wrapper around {@link sign} for use in remote-attestation paths.
 */
export declare function signForAttestation(privateKey: crypto.KeyObject | string, data: Buffer, algo?: SignatureAlgorithm): string;
/**
 * Convenience: convert an algorithm enum to a proof type string.
 */
export declare function proofTypeFor(algo: SignatureAlgorithm): string;
//# sourceMappingURL=signatures.d.ts.map