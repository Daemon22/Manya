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
/** Default attestation freshness window: 5 minutes. */
export declare const DEFAULT_ATTESTATION_FRESHNESS_MS: number;
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
export declare function produceAttestation(privateKey: crypto.KeyObject | string, deviceFingerprint: string, measurements: Record<string, string>, nonce: string, opts?: {
    algorithm?: SignatureAlgorithm;
    timestamp?: string;
    hardware?: AttestationQuote['hardware'];
}): AttestationQuote;
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
export declare function verifyAttestation(publicKey: crypto.KeyObject | string, quote: AttestationQuote, expectedNonce: string, opts?: {
    expectedFingerprint?: string;
    freshnessMs?: number;
    now?: number;
}): boolean;
/**
 * Convenience: produce a quote and immediately serialize it to a Buffer.
 */
export declare function produceAndSerializeAttestation(privateKey: crypto.KeyObject | string, deviceFingerprint: string, measurements: Record<string, string>, nonce: string, opts?: Parameters<typeof produceAttestation>[4]): Buffer;
/**
 * Convenience: deserialize a Buffer and verify it.
 */
export declare function deserializeAndVerifyAttestation(publicKey: crypto.KeyObject | string, buf: Buffer | string, expectedNonce: string, opts?: Parameters<typeof verifyAttestation>[3]): boolean;
//# sourceMappingURL=attestation.d.ts.map