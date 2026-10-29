/**
 * @manya-os/keyring — verifiable credentials (issue / verify).
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
import * as crypto from 'crypto';
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
export declare function canonicalCredentialBytes(credential: VerifiableCredential): Buffer;
/**
 * Recursively sort object keys for stable JSON output.
 * @internal
 */
export declare function stableSort(value: unknown): unknown;
/**
 * Issue a verifiable credential by signing its canonical bytes with the
 * issuer's private key.
 *
 * @returns The credential with a populated `proof` field.
 * @throws {@link CredentialError} for invalid input.
 */
export declare function issueCredential(params: IssueCredentialParams): VerifiableCredential;
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
export declare function verifyCredential(credential: VerifiableCredential, issuerPublicKey: crypto.KeyObject | string): boolean;
/**
 * Validate non-cryptographic aspects of a credential: required fields,
 * expiry. Returns `true` iff the credential is well-formed and not expired.
 *
 * @param credential - Credential to validate.
 * @param now - Optional reference time (ISO string or Date).
 */
export declare function validateCredential(credential: VerifiableCredential, now?: Date | string): boolean;
//# sourceMappingURL=credentials.d.ts.map