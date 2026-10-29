/**
 * @manya-os/ledger — tamper-evident timestamping (commit-then-reveal).
 *
 * Implements a self-contained, RFC 3161-inspired commit-then-reveal pattern:
 *
 *   1. `commit(value)` — produces a 32-byte `commitment = SHA-256(value || nonce)`
 *      together with the random 32-byte `nonce`. The commitment can be
 *      published (e.g. anchored into the ledger) without revealing `value`.
 *   2. `reveal(value, nonce, commitment)` — recomputes `SHA-256(value || nonce)`
 *      and constant-time-compares to the published `commitment`.
 *   3. `issueTimestamp(commitment, authorityKey)` — has a
 *      {@link TimestampAuthority} sign the commitment, producing a
 *      {@link TimestampToken} that binds the commitment to an issuance time.
 *   4. `verifyTimestamp(token, authorityPublicKey)` — verifies the token's
 *      signature against the authority's public key.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Conceived, directed, and owned by Uviwe Menyiwe (Azura Daemon), founder
 * of the Manya Hael Foundation.
 *
 * Licensed under the Apache License, Version 2.0.
 */
import * as crypto from 'crypto';
import type { Commitment, TimestampToken } from '../types.js';
/** Size (in bytes) of the commitment nonce. */
export declare const COMMITMENT_NONCE_BYTES = 32;
/** Size (in bytes) of a SHA-256 commitment. */
export declare const COMMITMENT_BYTES = 32;
/**
 * Produce a commitment to `value` using a fresh random nonce.
 *
 * `commitment = SHA-256(value || nonce)` — both `value` and `nonce` MUST be
 * 32 bytes long after this concatenation? No: `value` can be any length, but
 * for unambiguous reveals it MUST be exactly the bytes that will be re-supplied
 * to {@link reveal}. The nonce is always 32 bytes.
 *
 * @param value - The bytes to commit to.
 * @returns The commitment and the reveal nonce.
 */
export declare function commit(value: Buffer): Commitment;
/**
 * Reveal `value` against a previously published `commitment`.
 *
 * Recomputes `SHA-256(value || nonce)` and constant-time-compares to
 * `commitment`.
 *
 * @param value - The original bytes.
 * @param nonce - The nonce returned by {@link commit}.
 * @param commitment - The published commitment.
 * @returns `true` iff the commitment matches.
 */
export declare function reveal(value: Buffer, nonce: Buffer, commitment: Buffer): boolean;
/**
 * Issue a signed timestamp token over a commitment using a
 * {@link TimestampAuthority}.
 *
 * @param commitment - The commitment to timestamp (Buffer or hex string).
 * @param authority - The signing authority.
 * @returns A signed {@link TimestampToken}.
 */
export declare function issueTimestamp(commitment: Buffer | string, authority: {
    issue(c: Buffer | string): TimestampToken;
}): TimestampToken;
/**
 * Verify a {@link TimestampToken}'s signature against an authority's
 * public key.
 *
 * The token is verified as follows:
 *   1. The token's `version` MUST equal {@link TIMESTAMP_TOKEN_VERSION}.
 *   2. The token's `authorityKeyId` is informational (callers should
 *      verify it matches the supplied public key's key id separately if
 *      they care about pinning).
 *   3. The signature is verified over `canonicalTimestampBytes(token)`.
 *
 * @param token - The token to verify.
 * @param authorityPublicKey - Public KeyObject or PEM string.
 * @returns `true` iff the signature is valid.
 */
export declare function verifyTimestamp(token: TimestampToken, authorityPublicKey: crypto.KeyObject | string): boolean;
//# sourceMappingURL=timestamp.d.ts.map