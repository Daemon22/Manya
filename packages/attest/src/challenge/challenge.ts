/**
 * @manya-os/attest — challenge generation, signed challenge-response, expiry.
 *
 * A challenge is a fresh random byte string issued by a verifier. The prover
 * signs the canonical challenge bytes with their private key and returns a
 * {@link SignedChallengeResponse}. The verifier checks:
 *
 *   1. The nonce matches the one they issued (and is still valid).
 *   2. The signature verifies against the prover's public key.
 *   3. The signing timestamp is within the challenge's validity window.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import * as crypto from 'crypto';
import type {
  Challenge,
  GenerateChallengeOptions,
  SignedChallengeResponse,
  SignatureAlgorithm,
} from '../types.js';
import { ChallengeError } from '../errors.js';
import { secureRandom, uuid } from '../crypto/hashing.js';
import { getKeyFingerprint } from '../crypto/keys.js';
import { sign, verify } from '../crypto/signatures.js';

/** Default challenge TTL: 60 seconds. */
export const DEFAULT_CHALLENGE_TTL_MS = 60 * 1000;
/** Default challenge byte length: 32 (256 bits). */
export const DEFAULT_CHALLENGE_BYTES = 32;

/**
 * Generate a fresh challenge.
 *
 * @param opts - Optional parameters.
 * @returns A {@link Challenge} ready to send to the prover.
 */
export function generateChallenge(opts: GenerateChallengeOptions = {}): Challenge {
  const ttlMs = opts.ttlMs ?? DEFAULT_CHALLENGE_TTL_MS;
  const bytes = opts.bytes ?? DEFAULT_CHALLENGE_BYTES;
  if (!Number.isInteger(ttlMs) || ttlMs <= 0) {
    throw new ChallengeError('generateChallenge: ttlMs must be a positive integer');
  }
  if (!Number.isInteger(bytes) || bytes <= 0 || bytes > 256) {
    throw new ChallengeError('generateChallenge: bytes must be an integer in [1, 256]');
  }
  const now = Date.now();
  const issuedAt = new Date(now).toISOString();
  const expiresAt = new Date(now + ttlMs).toISOString();
  const challengeBytes = secureRandom(bytes);
  const challenge = challengeBytes.toString('base64');
  const nonce = uuid().replace(/-/g, '') + secureRandom(16).toString('hex');
  return { nonce, challenge, issuedAt, expiresAt };
}

/**
 * Decode a base64-encoded challenge into raw bytes.
 * @param challenge - Base64-encoded challenge.
 */
export function decodeChallenge(challenge: string): Buffer {
  if (typeof challenge !== 'string' || challenge.length === 0) {
    throw new ChallengeError('decodeChallenge: challenge must be a non-empty string');
  }
  try {
    return Buffer.from(challenge, 'base64');
  } catch (err) {
    throw new ChallengeError(
      'decodeChallenge: invalid base64: ' + (err as Error).message,
      err
    );
  }
}

/**
 * Sign a challenge with a private key, producing a {@link SignedChallengeResponse}.
 *
 * The signature is computed over the raw challenge bytes (the decoded base64
 * payload), so the verifier must use the original `challenge` string when
 * verifying.
 *
 * @param privateKey - The prover's private key.
 * @param challenge - The {@link Challenge} issued by the verifier.
 * @param algo - Optional signature algorithm (inferred from the key if omitted).
 * @returns The signed response to return to the verifier.
 */
export function signChallenge(
  privateKey: crypto.KeyObject | string,
  challenge: Challenge,
  algo?: SignatureAlgorithm
): SignedChallengeResponse {
  if (!challenge || typeof challenge !== 'object') {
    throw new ChallengeError('signChallenge: challenge must be a Challenge object');
  }
  const challengeBytes = decodeChallenge(challenge.challenge);
  const signature = sign(privateKey, challengeBytes, algo);
  // Compute the public key fingerprint for transparency. The caller can
  // cross-check this against a known-identity store.
  let publicKeyFingerprint: string;
  try {
    // Derive the public key from the private key, then fingerprint it.
    const privKey =
      typeof privateKey === 'string' ? crypto.createPrivateKey(privateKey) : privateKey;
    const pubKey = privKey.asymmetricKeyType
      ? crypto.createPublicKey(privKey)
      : crypto.createPublicKey(privKey.export({ type: 'pkcs8', format: 'pem' }));
    publicKeyFingerprint = getKeyFingerprint(pubKey);
  } catch (err) {
    throw new ChallengeError(
      'signChallenge: cannot derive public key fingerprint: ' + (err as Error).message,
      err
    );
  }
  // Resolve the algorithm label for the response.
  let resolvedAlgo: SignatureAlgorithm;
  if (algo) {
    resolvedAlgo = algo;
  } else {
    // Infer from the private key type.
    const privKey =
      typeof privateKey === 'string' ? crypto.createPrivateKey(privateKey) : privateKey;
    const keyType = privKey.asymmetricKeyType;
    if (keyType === 'rsa') resolvedAlgo = 'rsa-pss';
    else if (keyType === 'ec') resolvedAlgo = 'ecdsa-p256';
    else throw new ChallengeError(`signChallenge: unsupported key type: ${keyType ?? 'unknown'}`);
  }
  return {
    nonce: challenge.nonce,
    signature,
    algorithm: resolvedAlgo,
    signedAt: new Date().toISOString(),
    publicKeyFingerprint,
  };
}

/**
 * Verify a signed challenge response.
 *
 * Checks:
 *   1. The response nonce matches `expectedNonce` (constant-time).
 *   2. The signature verifies against `publicKey` over the raw challenge bytes.
 *
 * Note: the caller is responsible for checking the challenge's expiry and
 * for consuming the nonce via a {@link import('./nonce.js').NonceStore}.
 *
 * @param publicKey - The prover's public key (KeyObject or PEM).
 * @param challenge - The original {@link Challenge} issued.
 * @param response - The {@link SignedChallengeResponse} from the prover.
 * @param expectedNonce - The nonce the verifier expects to see echoed.
 * @returns `true` iff the nonce matches AND the signature is valid.
 */
export function verifyResponse(
  publicKey: crypto.KeyObject | string,
  challenge: Challenge,
  response: SignedChallengeResponse,
  expectedNonce: string
): boolean {
  if (!response || typeof response !== 'object') return false;
  if (typeof expectedNonce !== 'string' || expectedNonce.length === 0) {
    throw new ChallengeError('verifyResponse: expectedNonce must be a non-empty string');
  }
  // Constant-time nonce comparison.
  const a = Buffer.from(response.nonce, 'utf8');
  const b = Buffer.from(expectedNonce, 'utf8');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return false;
  }
  let challengeBytes: Buffer;
  try {
    challengeBytes = decodeChallenge(challenge.challenge);
  } catch {
    return false;
  }
  try {
    return verify(publicKey, challengeBytes, response.signature, response.algorithm);
  } catch (err) {
    // verify() throws only on malformed input — treat as not verified.
    throw new ChallengeError(
      'verifyResponse: signature verification error: ' + (err as Error).message,
      err
    );
  }
}

/**
 * Check whether a challenge is currently within its validity window.
 * @param challenge - The challenge to inspect.
 * @param now - Optional current time (defaults to `Date.now()`).
 */
export function isChallengeExpired(challenge: Challenge, now: number = Date.now()): boolean {
  try {
    const expiresAt = Date.parse(challenge.expiresAt);
    if (!Number.isFinite(expiresAt)) return true;
    return now >= expiresAt;
  } catch {
    return true;
  }
}
