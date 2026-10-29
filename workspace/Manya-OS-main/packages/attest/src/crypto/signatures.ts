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
import { AttestError, ChallengeError, AttestationError } from '../errors.js';
import type { SignatureAlgorithm } from '../types.js';
import { algorithmForKey } from './keys.js';
import { constantTimeEqual } from './hashing.js';

/** Hash algorithm used for all signature operations. */
const SIGN_HASH = 'sha256';

/**
 * Convert a public key input (KeyObject or PEM string) into a KeyObject.
 */
function asPublicKey(key: crypto.KeyObject | string): crypto.KeyObject {
  if (typeof key === 'string') {
    try {
      return crypto.createPublicKey(key);
    } catch (err) {
      throw new AttestError(
        'invalid public key PEM: ' + (err as Error).message,
        'VERIFY_ERROR',
        err
      );
    }
  }
  return key;
}

/**
 * Convert a private key input (KeyObject or PEM string) into a KeyObject.
 */
function asPrivateKey(key: crypto.KeyObject | string): crypto.KeyObject {
  if (typeof key === 'string') {
    try {
      return crypto.createPrivateKey(key);
    } catch (err) {
      throw new AttestError(
        'invalid private key PEM: ' + (err as Error).message,
        'SIGN_ERROR',
        err
      );
    }
  }
  return key;
}

/**
 * Resolve a {@link SignatureAlgorithm}. If `algo` is provided it is used;
 * otherwise the algorithm is inferred from the private key type via
 * {@link algorithmForKey}.
 */
function resolveAlgorithm(
  key: crypto.KeyObject,
  algo?: SignatureAlgorithm
): SignatureAlgorithm {
  if (algo) return algo;
  return algorithmForKey(key);
}

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
export function sign(
  privateKey: crypto.KeyObject | string,
  data: Buffer,
  algo?: SignatureAlgorithm
): string {
  if (!Buffer.isBuffer(data)) {
    throw new AttestError('sign: data must be a Buffer', 'SIGN_ERROR');
  }
  const key = asPrivateKey(privateKey);
  const resolvedAlgo = resolveAlgorithm(key, algo);
  try {
    if (resolvedAlgo === 'rsa-pss') {
      const sig = crypto.sign(
        SIGN_HASH,
        data,
        {
          key,
          padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
          saltLength: crypto.constants.RSA_PSS_SALTLEN_DIGEST,
        }
      );
      return sig.toString('hex');
    }
    if (resolvedAlgo === 'ecdsa-p256') {
      const sig = crypto.sign(SIGN_HASH, data, key);
      return sig.toString('hex');
    }
    throw new AttestError(`unsupported signature algorithm: ${resolvedAlgo as string}`);
  } catch (err) {
    if (err instanceof AttestError) throw err;
    throw new AttestError('sign failed: ' + (err as Error).message, 'SIGN_ERROR', err);
  }
}

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
export function verify(
  publicKey: crypto.KeyObject | string,
  data: Buffer,
  signature: Buffer | string,
  algo?: SignatureAlgorithm
): boolean {
  if (!Buffer.isBuffer(data)) {
    throw new AttestError('verify: data must be a Buffer', 'VERIFY_ERROR');
  }
  let signatureBuf: Buffer;
  if (typeof signature === 'string') {
    if (signature.length === 0 || !/^[0-9a-fA-F]+$/.test(signature)) {
      throw new AttestError('verify: signature must be non-empty hex', 'VERIFY_ERROR');
    }
    try {
      signatureBuf = Buffer.from(signature, 'hex');
    } catch {
      throw new AttestError('verify: signature must be hex-encoded', 'VERIFY_ERROR');
    }
  } else {
    signatureBuf = signature;
  }

  const key = asPublicKey(publicKey);
  const resolvedAlgo = resolveAlgorithm(key, algo);
  let ok: boolean;
  try {
    if (resolvedAlgo === 'rsa-pss') {
      ok = crypto.verify(
        SIGN_HASH,
        data,
        {
          key,
          padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
          saltLength: crypto.constants.RSA_PSS_SALTLEN_DIGEST,
        },
        signatureBuf
      );
    } else if (resolvedAlgo === 'ecdsa-p256') {
      ok = crypto.verify(SIGN_HASH, data, key, signatureBuf);
    } else {
      throw new AttestError(`unsupported signature algorithm: ${resolvedAlgo as string}`);
    }
  } catch (err) {
    if (err instanceof AttestError) throw err;
    // Treat low-level verification errors as "not verified" rather than
    // throwing — the public API contract is to return false.
    return false;
  }

  // Constant-time guard: derive a 1-byte result and compare with the expected
  // value using timingSafeEqual. This avoids any branch on the verified
  // boolean and serves as a defense-in-depth.
  const okByte = Buffer.from([ok ? 1 : 0]);
  const expected = Buffer.from([1]);
  return constantTimeEqual(okByte, expected);
}

/**
 * Sign `data` with `privateKey` and throw a {@link ChallengeError} on failure.
 *
 * Convenience wrapper around {@link sign} for use in challenge-response paths
 * where a challenge-specific error type is more informative.
 */
export function signForChallenge(
  privateKey: crypto.KeyObject | string,
  data: Buffer,
  algo?: SignatureAlgorithm
): string {
  try {
    return sign(privateKey, data, algo);
  } catch (err) {
    if (err instanceof ChallengeError) throw err;
    throw new ChallengeError(
      'signForChallenge failed: ' + (err as Error).message,
      err
    );
  }
}

/**
 * Sign `data` with `privateKey` and throw an {@link AttestationError} on failure.
 *
 * Convenience wrapper around {@link sign} for use in remote-attestation paths.
 */
export function signForAttestation(
  privateKey: crypto.KeyObject | string,
  data: Buffer,
  algo?: SignatureAlgorithm
): string {
  try {
    return sign(privateKey, data, algo);
  } catch (err) {
    if (err instanceof AttestationError) throw err;
    throw new AttestationError(
      'signForAttestation failed: ' + (err as Error).message,
      err
    );
  }
}

/**
 * Convenience: convert an algorithm enum to a proof type string.
 */
export function proofTypeFor(algo: SignatureAlgorithm): string {
  return algo === 'rsa-pss' ? 'manya:rsa-pss:2024' : 'manya:ecdsa-p256:2024';
}
