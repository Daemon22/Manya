/**
 * @manya-os/keyring — verifiable credentials (issue / verify).
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import * as crypto from 'crypto';
import { randomUUID } from 'crypto';
import { CredentialError } from '../errors.js';
import { sign, verify, proofTypeFor } from '../crypto/signatures.js';
import type { VerifiableCredential, SignatureAlgorithm } from '../types.js';

/**
 * Input parameters for {@link issueCredential}. The issuer's private key is
 * used to sign the credential.
 */
export interface IssueCredentialParams {
  /** Issuer DID. Must match the did:key of the signing key. */
  issuer: string;
  /** Issuer's private key (KeyObject or PEM). */
  issuerPrivateKey: crypto.KeyObject | string;
  /** Signature algorithm of the issuer key. */
  algorithm: SignatureAlgorithm;
  /** Subject DID. */
  subject: string;
  /** Claims asserted about the subject. */
  claims: Record<string, unknown>;
  /** Optional credential id. Auto-generated if omitted. */
  id?: string;
  /** Optional ISO-8601 issuance timestamp. Defaults to now. */
  issuedAt?: string;
  /** Optional ISO-8601 expiry timestamp. */
  expiresAt?: string;
}

/**
 * Canonicalize a credential for signing: JSON with stable key ordering, with
 * the `proof` field stripped. We use this both at issuance and verification
 * time so that signatures are reproducible.
 */
export function canonicalCredentialBytes(
  credential: VerifiableCredential
): Buffer {
  // Deep-clone, then remove `proof`.
  const clone: Omit<VerifiableCredential, 'proof'> = {
    id: credential.id,
    issuer: credential.issuer,
    subject: credential.subject,
    claims: credential.claims,
    issuedAt: credential.issuedAt,
    ...(credential.expiresAt !== undefined
      ? { expiresAt: credential.expiresAt }
      : {}),
  };
  return Buffer.from(JSON.stringify(stableSort(clone)), 'utf8');
}

/**
 * Recursively sort object keys for stable JSON output.
 * @internal
 */
export function stableSort(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((v) => stableSort(v));
  }
  if (value && typeof value === 'object' && !Buffer.isBuffer(value)) {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      out[key] = stableSort((value as Record<string, unknown>)[key]);
    }
    return out;
  }
  return value;
}

/**
 * Issue a verifiable credential by signing its canonical bytes with the
 * issuer's private key.
 *
 * @returns The credential with a populated `proof` field.
 * @throws {@link CredentialError} for invalid input.
 */
export function issueCredential(
  params: IssueCredentialParams
): VerifiableCredential {
  if (!params || typeof params !== 'object') {
    throw new CredentialError('issueCredential: params required');
  }
  if (typeof params.issuer !== 'string' || params.issuer.length === 0) {
    throw new CredentialError('issueCredential: issuer DID required');
  }
  if (typeof params.subject !== 'string' || params.subject.length === 0) {
    throw new CredentialError('issueCredential: subject DID required');
  }
  if (!params.claims || typeof params.claims !== 'object') {
    throw new CredentialError('issueCredential: claims object required');
  }
  if (
    params.algorithm !== 'rsa-pss' &&
    params.algorithm !== 'ecdsa-p256'
  ) {
    throw new CredentialError(
      `issueCredential: unsupported algorithm '${params.algorithm as string}'`
    );
  }

  const id = params.id ?? 'cred-' + randomUUID();
  const issuedAt = params.issuedAt ?? new Date().toISOString();
  const credential: VerifiableCredential = {
    id,
    issuer: params.issuer,
    subject: params.subject,
    claims: params.claims,
    issuedAt,
    ...(params.expiresAt !== undefined ? { expiresAt: params.expiresAt } : {}),
    // proof is filled after signing
    proof: {
      type: proofTypeFor(params.algorithm),
      created: issuedAt,
      verificationMethod: params.issuer,
      proofValue: '',
      algorithm: params.algorithm,
    },
  };

  const bytes = canonicalCredentialBytes(credential);
  let proofValue: string;
  try {
    proofValue = sign(params.issuerPrivateKey, bytes, params.algorithm);
  } catch (err) {
    if (err instanceof CredentialError) throw err;
    throw new CredentialError(
      'issueCredential: signing failed: ' + (err as Error).message,
      err
    );
  }
  credential.proof.proofValue = proofValue;
  return credential;
}

/**
 * Verify a credential's signature against the supplied issuer public key.
 *
 * Does NOT check expiry or schema validity — use {@link validateCredential}
 * for those concerns. Returns `false` for any signature mismatch or malformed
 * proof (rather than throwing) so callers can implement graceful failure.
 *
 * @param credential - Credential to verify.
 * @param issuerPublicKey - Issuer's public KeyObject or PEM string.
 * @returns `true` iff the proof is valid.
 */
export function verifyCredential(
  credential: VerifiableCredential,
  issuerPublicKey: crypto.KeyObject | string
): boolean {
  if (!credential || !credential.proof) {
    return false;
  }
  const algo = credential.proof.algorithm;
  if (algo !== 'rsa-pss' && algo !== 'ecdsa-p256') return false;
  if (!credential.proof.proofValue || credential.proof.proofValue.length === 0) {
    return false;
  }
  const bytes = canonicalCredentialBytes(credential);
  try {
    return verify(
      issuerPublicKey,
      bytes,
      credential.proof.proofValue,
      algo
    );
  } catch {
    return false;
  }
}

/**
 * Validate non-cryptographic aspects of a credential: required fields,
 * expiry. Returns `true` iff the credential is well-formed and not expired.
 *
 * @param credential - Credential to validate.
 * @param now - Optional reference time (ISO string or Date).
 */
export function validateCredential(
  credential: VerifiableCredential,
  now: Date | string = new Date()
): boolean {
  if (!credential || typeof credential !== 'object') return false;
  const required = ['id', 'issuer', 'subject', 'claims', 'issuedAt', 'proof'];
  for (const field of required) {
    if (!(field in credential)) return false;
  }
  if (typeof credential.id !== 'string' || credential.id.length === 0) return false;
  if (typeof credential.issuer !== 'string' || credential.issuer.length === 0) return false;
  if (typeof credential.subject !== 'string' || credential.subject.length === 0) return false;
  if (!credential.claims || typeof credential.claims !== 'object') return false;
  if (typeof credential.issuedAt !== 'string') return false;
  // Validate issuedAt is parseable.
  const issued = Date.parse(credential.issuedAt);
  if (Number.isNaN(issued)) return false;
  if (credential.expiresAt !== undefined) {
    const expires = Date.parse(credential.expiresAt);
    if (Number.isNaN(expires)) return false;
    const nowMs = typeof now === 'string' ? Date.parse(now) : now.getTime();
    if (expires < nowMs) return false;
  }
  return true;
}
