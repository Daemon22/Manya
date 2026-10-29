/**
 * @manya-os/ledger — ledger events.
 *
 * A {@link LedgerEvent} is the atomic unit of the audit ledger. Each event's
 * `hash` is the SHA-256 of the canonical serialization of its signing fields
 * (`{ id, seq, type, actor, payload, timestamp, prevHash }`). Optional
 * metadata and the signature itself are deliberately excluded so the hash is
 * stable regardless of when (or whether) the event is signed.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Conceived, directed, and owned by Uviwe Menyiwe (Azura Daemon), founder
 * of the Manya Hael Foundation.
 *
 * Licensed under the Apache License, Version 2.0.
 */
import type * as crypto from 'crypto';
import type { CreateEventOptions, EventPayload, LedgerEvent, SignatureAlgorithm } from '../types.js';
/**
 * All-zero 64-character hex string. Used as the `prevHash` of the genesis
 * event (the first event in a fresh chain).
 */
export declare const GENESIS_PREV_HASH: string;
/**
 * Compute the SHA-256 hash of a ledger event's signing fields.
 *
 * The signed fields are exactly `{ id, seq, type, actor, payload, timestamp,
 * prevHash }`. `metadata`, `hash`, `signature`, and `signatureAlgorithm` are
 * NEVER included.
 *
 * @param fields - Signing fields.
 * @returns 64-character lowercase hex SHA-256.
 */
export declare function computeEventHash(fields: {
    id: string;
    seq: number;
    type: string;
    actor: string;
    payload: EventPayload;
    timestamp: string;
    prevHash: string;
}): string;
/**
 * Create a new (unsigned) ledger event.
 *
 * The event's `hash` is computed from the canonical serialization of its
 * signing fields. The event is returned WITHOUT a signature — call
 * {@link signEvent} to attach one.
 *
 * @param opts - Creation options.
 * @returns A new {@link LedgerEvent} (without a signature).
 * @throws {@link EventError} on validation failure.
 */
export declare function createEvent(opts: CreateEventOptions): LedgerEvent;
/**
 * Sign a ledger event in place (returns a new event with `signature` and
 * `signatureAlgorithm` populated).
 *
 * The signature is computed over the event's `hash` (32 raw bytes, decoded
 * from the hex string). Verification therefore reduces to verifying the
 * signature against `Buffer.from(event.hash, 'hex')`.
 *
 * @param event - The event to sign (must already have a `hash`).
 * @param privateKey - Private KeyObject or PEM string.
 * @param algo - Optional signature algorithm. Inferred from the key if omitted.
 * @returns A new event with `signature` and `signatureAlgorithm` set.
 * @throws {@link EventError} on failure.
 */
export declare function signEvent(event: LedgerEvent, privateKey: crypto.KeyObject | string, algo?: SignatureAlgorithm): LedgerEvent;
/**
 * Verify the signature on a signed ledger event.
 *
 * @param event - Signed event.
 * @param publicKey - Public KeyObject or PEM string.
 * @returns `true` iff the signature is valid (or the event is unsigned and
 *          `allowUnsigned` is `true`).
 * @throws {@link EventError} if the event hash is malformed.
 */
export declare function verifyEventSignature(event: LedgerEvent, publicKey: crypto.KeyObject | string, allowUnsigned?: boolean): boolean;
/**
 * Compute the key id (hex SHA-256 of the SPKI DER) of a public key.
 *
 * Convenience wrapper around `getKeyId`. Useful for attaching to events or
 * sync bundles as the signing key identifier.
 */
export declare function eventKeyId(publicKey: crypto.KeyObject | string): string;
//# sourceMappingURL=event.d.ts.map