/**
 * @manya-os/attest — attestation quote format + (de)serialization.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import type { AttestationQuote } from '../types.js';
import { AttestationError } from '../errors.js';

/** Current attestation quote format version. */
export const ATTESTATION_QUOTE_VERSION = 1;

/**
 * Validate the shape of an {@link AttestationQuote}. Throws {@link AttestationError}
 * on any structural problem; returns silently on success.
 *
 * @param quote - The quote to validate.
 */
export function validateQuote(quote: unknown): asserts quote is AttestationQuote {
  if (!quote || typeof quote !== 'object') {
    throw new AttestationError('validateQuote: quote must be an object');
  }
  const q = quote as Record<string, unknown>;
  if (typeof q.version !== 'number' || q.version !== ATTESTATION_QUOTE_VERSION) {
    throw new AttestationError(
      `validateQuote: unsupported version ${String(q.version)} (expected ${ATTESTATION_QUOTE_VERSION})`
    );
  }
  if (typeof q.deviceFingerprint !== 'string' || q.deviceFingerprint.length === 0) {
    throw new AttestationError('validateQuote: deviceFingerprint must be a non-empty string');
  }
  if (!q.measurements || typeof q.measurements !== 'object') {
    throw new AttestationError('validateQuote: measurements must be an object');
  }
  if (typeof q.timestamp !== 'string' || q.timestamp.length === 0) {
    throw new AttestationError('validateQuote: timestamp must be a non-empty string');
  }
  if (typeof q.nonce !== 'string' || q.nonce.length === 0) {
    throw new AttestationError('validateQuote: nonce must be a non-empty string');
  }
  if (typeof q.signature !== 'string' || q.signature.length === 0) {
    throw new AttestationError('validateQuote: signature must be a non-empty string');
  }
  if (q.algorithm !== 'rsa-pss' && q.algorithm !== 'ecdsa-p256') {
    throw new AttestationError(
      `validateQuote: algorithm must be 'rsa-pss' or 'ecdsa-p256', got: ${String(q.algorithm)}`
    );
  }
  if (q.hardware !== undefined && (typeof q.hardware !== 'object' || q.hardware === null)) {
    throw new AttestationError('validateQuote: hardware must be an object if present');
  }
}

/**
 * Serialize an {@link AttestationQuote} to a UTF-8 buffer of stable JSON.
 *
 * Stable JSON means: object keys sorted lexicographically, no insignificant
 * whitespace. This makes the serialized form canonical and reproducible.
 *
 * @param quote - The quote to serialize.
 * @returns UTF-8 buffer of stable JSON.
 */
export function serializeQuote(quote: AttestationQuote): Buffer {
  validateQuote(quote);
  try {
    return Buffer.from(stableStringify(quote), 'utf8');
  } catch (err) {
    throw new AttestationError(
      'serializeQuote failed: ' + (err as Error).message,
      err
    );
  }
}

/**
 * Deserialize an {@link AttestationQuote} from a UTF-8 buffer of stable JSON.
 *
 * @param buf - UTF-8 buffer (e.g. produced by {@link serializeQuote}).
 * @returns The parsed quote.
 */
export function deserializeQuote(buf: Buffer | string): AttestationQuote {
  let text: string;
  if (typeof buf === 'string') {
    text = buf;
  } else if (Buffer.isBuffer(buf)) {
    text = buf.toString('utf8');
  } else {
    throw new AttestationError('deserializeQuote: expected Buffer or string');
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    throw new AttestationError(
      'deserializeQuote: invalid JSON: ' + (err as Error).message,
      err
    );
  }
  validateQuote(parsed);
  return parsed;
}

/**
 * Stable JSON stringify with sorted keys. Identical to the canonicalization
 * used by the signature path — quotes serialize the same way they sign.
 *
 * @internal
 */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return '[' + value.map(stableStringify).join(',') + ']';
  }
  if (Buffer.isBuffer(value)) {
    return JSON.stringify(value.toString('hex'));
  }
  const keys = Object.keys(value as Record<string, unknown>).sort();
  return '{' + keys
    .map((k) => JSON.stringify(k) + ':' + stableStringify((value as Record<string, unknown>)[k]))
    .join(',') + '}';
}
