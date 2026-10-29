/**
 * @manya-os/attest — remote attestation: produce + verify signed attestation reports.
 *
 * A prover produces an {@link AttestationQuote} signed over its device
 * fingerprint, measurements, timestamp, and nonce. The verifier checks:
 *   1. The signature verifies against the prover's public key.
 *   2. The quote's timestamp is within an allowed freshness window (default 5 min).
 *   3. The quote's device fingerprint matches the expected one.
 *   4. The quote's nonce matches the verifier-issued nonce.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import * as crypto from 'crypto';
import type { AttestationQuote, SignatureAlgorithm } from '../types.js';
import { AttestationError } from '../errors.js';
import { sign, verify } from '../crypto/signatures.js';
import { algorithmForKey } from '../crypto/keys.js';
import {
  ATTESTATION_QUOTE_VERSION,
  serializeQuote,
  deserializeQuote,
  stableStringify,
} from './quote.js';

/** Default attestation freshness window: 5 minutes. */
export const DEFAULT_ATTESTATION_FRESHNESS_MS = 5 * 60 * 1000;

/**
 * Produce a signed attestation quote.
 *
 * @param privateKey - The prover's private key.
 * @param deviceFingerprint - The prover's device fingerprint string.
 * @param measurements - Stable map of measurement name → hex value.
 * @param nonce - Verifier-issued nonce for freshness binding.
 * @param opts - Optional parameters.
 * @param opts.algorithm - Signature algorithm (inferred from the key if omitted).
 * @param opts.timestamp - ISO-8601 timestamp (defaults to now).
 * @param opts.hardware - Optional hardware probe to include in the quote.
 * @returns The signed {@link AttestationQuote}.
 */
export function produceAttestation(
  privateKey: crypto.KeyObject | string,
  deviceFingerprint: string,
  measurements: Record<string, string>,
  nonce: string,
  opts: {
    algorithm?: SignatureAlgorithm;
    timestamp?: string;
    hardware?: AttestationQuote['hardware'];
  } = {}
): AttestationQuote {
  if (typeof deviceFingerprint !== 'string' || deviceFingerprint.length === 0) {
    throw new AttestationError('produceAttestation: deviceFingerprint must be a non-empty string');
  }
  if (!measurements || typeof measurements !== 'object') {
    throw new AttestationError('produceAttestation: measurements must be an object');
  }
  if (typeof nonce !== 'string' || nonce.length === 0) {
    throw new AttestationError('produceAttestation: nonce must be a non-empty string');
  }
  // Resolve algorithm.
  let algorithm: SignatureAlgorithm;
  if (opts.algorithm) {
    algorithm = opts.algorithm;
  } else {
    const keyObj =
      typeof privateKey === 'string' ? crypto.createPrivateKey(privateKey) : privateKey;
    algorithm = algorithmForKey(keyObj);
  }
  const timestamp = opts.timestamp ?? new Date().toISOString();
  // Build the unsigned quote, sign the canonical bytes, then attach signature.
  const quoteWithoutSig: Omit<AttestationQuote, 'signature'> = {
    version: ATTESTATION_QUOTE_VERSION,
    deviceFingerprint,
    measurements,
    timestamp,
    nonce,
    algorithm,
    ...(opts.hardware ? { hardware: opts.hardware } : {}),
  };
  const canonical = Buffer.from(stableStringify(quoteWithoutSig), 'utf8');
  const signature = sign(privateKey, canonical, algorithm);
  return {
    ...quoteWithoutSig,
    signature,
  };
}

/**
 * Verify a signed attestation quote.
 *
 * Checks:
 *   1. Signature verification against `publicKey`.
 *   2. Freshness: quote timestamp is within `freshnessMs` of `now` (default 5 min).
 *   3. Nonce match: quote nonce equals `expectedNonce` (constant-time).
 *   4. Fingerprint match: quote deviceFingerprint equals `expectedFingerprint`
 *      (constant-time). Skipped if `expectedFingerprint` is omitted.
 *
 * @param publicKey - The prover's public key (KeyObject or PEM).
 * @param quote - The quote to verify.
 * @param expectedNonce - The nonce the verifier issued.
 * @param opts - Optional parameters.
 * @param opts.expectedFingerprint - Expected device fingerprint string.
 * @param opts.freshnessMs - Allowed freshness window. Defaults to 5 minutes.
 * @param opts.now - Optional reference time (defaults to `Date.now()`).
 * @returns `true` iff all checks pass.
 */
export function verifyAttestation(
  publicKey: crypto.KeyObject | string,
  quote: AttestationQuote,
  expectedNonce: string,
  opts: {
    expectedFingerprint?: string;
    freshnessMs?: number;
    now?: number;
  } = {}
): boolean {
  if (!quote || typeof quote !== 'object') return false;
  if (typeof expectedNonce !== 'string' || expectedNonce.length === 0) {
    throw new AttestationError('verifyAttestation: expectedNonce must be a non-empty string');
  }
  const freshnessMs = opts.freshnessMs ?? DEFAULT_ATTESTATION_FRESHNESS_MS;
  if (!Number.isInteger(freshnessMs) || freshnessMs <= 0) {
    throw new AttestationError('verifyAttestation: freshnessMs must be a positive integer');
  }
  const now = opts.now ?? Date.now();

  // 1. Freshness check.
  const ts = Date.parse(quote.timestamp);
  if (!Number.isFinite(ts)) return false;
  const ageMs = Math.abs(now - ts);
  if (ageMs > freshnessMs) return false;

  // 2. Nonce match (constant-time).
  const nonceBuf = Buffer.from(quote.nonce, 'utf8');
  const expectedBuf = Buffer.from(expectedNonce, 'utf8');
  if (nonceBuf.length !== expectedBuf.length) return false;
  if (!crypto.timingSafeEqual(nonceBuf, expectedBuf)) return false;

  // 3. Fingerprint match (constant-time) — optional.
  if (opts.expectedFingerprint !== undefined) {
    const fpBuf = Buffer.from(quote.deviceFingerprint, 'utf8');
    const expFpBuf = Buffer.from(opts.expectedFingerprint, 'utf8');
    if (fpBuf.length !== expFpBuf.length) return false;
    if (!crypto.timingSafeEqual(fpBuf, expFpBuf)) return false;
  }

  // 4. Signature verification.
  const { signature, ...rest } = quote;
  const canonical = Buffer.from(stableStringify(rest), 'utf8');
  try {
    return verify(publicKey, canonical, signature, quote.algorithm);
  } catch (err) {
    throw new AttestationError(
      'verifyAttestation: signature verification error: ' + (err as Error).message,
      err
    );
  }
}

/**
 * Convenience: produce a quote and immediately serialize it to a Buffer.
 */
export function produceAndSerializeAttestation(
  privateKey: crypto.KeyObject | string,
  deviceFingerprint: string,
  measurements: Record<string, string>,
  nonce: string,
  opts: Parameters<typeof produceAttestation>[4] = {}
): Buffer {
  const quote = produceAttestation(privateKey, deviceFingerprint, measurements, nonce, opts);
  return serializeQuote(quote);
}

/**
 * Convenience: deserialize a Buffer and verify it.
 */
export function deserializeAndVerifyAttestation(
  publicKey: crypto.KeyObject | string,
  buf: Buffer | string,
  expectedNonce: string,
  opts: Parameters<typeof verifyAttestation>[3] = {}
): boolean {
  const quote = deserializeQuote(buf);
  return verifyAttestation(publicKey, quote, expectedNonce, opts);
}
