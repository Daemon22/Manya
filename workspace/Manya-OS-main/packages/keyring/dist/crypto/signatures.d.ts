/**
 * @manya-os/keyring — digital signatures (RSA-PSS, ECDSA P-256).
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
import * as crypto from 'crypto';
import type { SignatureAlgorithm } from '../types.js';
/**
 * Sign `data` with `privateKey` using `algo`.
 *
 * @param privateKey - Private KeyObject or PEM string.
 * @param data - Bytes to sign.
 * @param algo - Signature algorithm.
 * @returns Hex-encoded signature.
 * @throws {@link SignatureError} on any failure.
 */
export declare function sign(privateKey: crypto.KeyObject | string, data: Buffer, algo: SignatureAlgorithm): string;
/**
 * Verify a `signature` over `data` against `publicKey` using `algo`.
 *
 * Uses `crypto.timingSafeEqual` internally to avoid early-exit timing leaks.
 * Returns `false` for any malformed input or signature mismatch — callers
 * that need to distinguish bad signatures from bad inputs should catch
 * {@link VerificationError}.
 *
 * @param publicKey - Public KeyObject or PEM string.
 * @param data - Original bytes.
 * @param signature - Hex-encoded signature.
 * @param algo - Signature algorithm.
 * @returns `true` iff the signature is valid.
 * @throws {@link VerificationError} only for malformed inputs that cannot be
 *   safely coerced to `false` (e.g. invalid hex signature).
 */
export declare function verify(publicKey: crypto.KeyObject | string, data: Buffer, signature: Buffer | string, algo: SignatureAlgorithm): boolean;
/**
 * Convenience: convert an algorithm enum to a proof type string.
 */
export declare function proofTypeFor(algo: SignatureAlgorithm): string;
//# sourceMappingURL=signatures.d.ts.map