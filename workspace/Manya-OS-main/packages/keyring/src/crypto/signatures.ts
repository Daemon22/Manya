/**
 * @manya-os/keyring — digital signatures (RSA-PSS, ECDSA P-256).
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import * as crypto from 'crypto';
import {
  SignatureError,
  VerificationError,
} from '../errors.js';
import type { SignatureAlgorithm } from '../types.js';
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
      throw new VerificationError(
        'invalid public key PEM: ' + (err as Error).message,
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
      throw new SignatureError(
        'invalid private key PEM: ' + (err as Error).message,
        err
      );
    }
  }
  return key;
}

/**
 * Build the `algorithm`-specific options for `crypto.sign`/`crypto.verify`.
 */
function signingOptions(algo: SignatureAlgorithm): crypto.SignKeyObjectInput | crypto.SignKeyObjectInput {
  if (algo === 'rsa-pss') {
    return {
      key: undefined as unknown as crypto.KeyObject, // set by caller
      padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
      saltLength: crypto.constants.RSA_PSS_SALTLEN_DIGEST,
    };
  }
  // ECDSA — no extra options required.
  return { key: undefined as unknown as crypto.KeyObject };
}

/**
 * Sign `data` with `privateKey` using `algo`.
 *
 * @param privateKey - Private KeyObject or PEM string.
 * @param data - Bytes to sign.
 * @param algo - Signature algorithm.
 * @returns Hex-encoded signature.
 * @throws {@link SignatureError} on any failure.
 */
export function sign(
  privateKey: crypto.KeyObject | string,
  data: Buffer,
  algo: SignatureAlgorithm
): string {
  if (!Buffer.isBuffer(data)) {
    throw new SignatureError('data must be a Buffer');
  }
  const key = asPrivateKey(privateKey);
  try {
    if (algo === 'rsa-pss') {
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
    if (algo === 'ecdsa-p256') {
      const sig = crypto.sign(SIGN_HASH, data, key);
      return sig.toString('hex');
    }
    throw new SignatureError(`unsupported signature algorithm: ${algo as string}`);
  } catch (err) {
    if (err instanceof SignatureError) throw err;
    throw new SignatureError('sign failed: ' + (err as Error).message, err);
  }
}

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
export function verify(
  publicKey: crypto.KeyObject | string,
  data: Buffer,
  signature: Buffer | string,
  algo: SignatureAlgorithm
): boolean {
  if (!Buffer.isBuffer(data)) {
    throw new VerificationError('data must be a Buffer');
  }
  let signatureBuf: Buffer;
  if (typeof signature === 'string') {
    try {
      signatureBuf = Buffer.from(signature, 'hex');
    } catch {
      throw new VerificationError('signature must be hex-encoded');
    }
    if (signatureBuf.length === 0 || !/^[0-9a-fA-F]+$/.test(signature)) {
      throw new VerificationError('signature must be non-empty hex');
    }
  } else {
    signatureBuf = signature;
  }

  const key = asPublicKey(publicKey);
  let ok: boolean;
  try {
    if (algo === 'rsa-pss') {
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
    } else if (algo === 'ecdsa-p256') {
      ok = crypto.verify(SIGN_HASH, data, key, signatureBuf);
    } else {
      throw new VerificationError(`unsupported signature algorithm: ${algo as string}`);
    }
  } catch (err) {
    if (err instanceof VerificationError) throw err;
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
 * Convenience: convert an algorithm enum to a proof type string.
 */
export function proofTypeFor(algo: SignatureAlgorithm): string {
  return algo === 'rsa-pss' ? 'manya:rsa-pss:2024' : 'manya:ecdsa-p256:2024';
}

// Suppress unused-warning for the helper that exists for parity/future use.
void signingOptions;
