/**
 * @manya-os/ledger — in-memory ledger chain.
 *
 * A {@link LedgerChain} holds events in memory in append order and computes
 * the cryptographic linkage between consecutive events (`prevHash` chains each
 * event to the previous one's `hash`).
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Conceived, directed, and owned by Uviwe Menyiwe (Azura Daemon), founder
 * of the Manya Hael Foundation.
 *
 * Licensed under the Apache License, Version 2.0.
 */
import type { EventMetadata, EventPayload, LedgerEvent, SignatureAlgorithm } from '../types.js';
import type * as crypto from 'crypto';
/** Options accepted by {@link LedgerChain.append}. */
export interface AppendOptions {
    /** Explicit event id (defaults to a fresh UUID v4). */
    id?: string;
    /** ISO-8601 timestamp (defaults to `new Date().toISOString()`). */
    timestamp?: string;
    /** Optional metadata (does NOT contribute to `hash`). */
    metadata?: EventMetadata;
    /**
     * Optional private key to sign the event with at append time. If provided,
     * the returned event has `signature` and `signatureAlgorithm` populated.
     */
    privateKey?: crypto.KeyObject | string;
    /** Signature algorithm. Inferred from the key if omitted. */
    signatureAlgorithm?: SignatureAlgorithm;
}
/**
 * In-memory append-only ledger chain.
 *
 * The chain holds events in an array indexed by `seq - 1`. Each event's
 * `prevHash` is set to the `hash` of the previously appended event (or
 * {@link GENESIS_PREV_HASH} for the first event).
 */
export declare class LedgerChain {
    private readonly events;
    /**
     * Append a new event to the chain.
     *
     * @param type - Event type.
     * @param actor - Actor identifier.
     * @param payload - Event payload (JSON-serializable).
     * @param opts - Optional parameters.
     * @returns The newly appended event (with `hash`, `prevHash`, and optional `signature`).
     */
    append(type: string, actor: string, payload: EventPayload, opts?: AppendOptions): LedgerEvent;
    /**
     * Append an already-constructed event (e.g. one received via sync).
     *
     * The event's `seq` MUST be `length() + 1` and its `prevHash` MUST equal
     * the current tail's `hash` (or {@link GENESIS_PREV_HASH} for the genesis).
     *
     * @param event - Pre-built event.
     * @returns The event (unchanged).
     * @throws {@link ChainError} if the event does not chain to the current tail.
     */
    appendEvent(event: LedgerEvent): LedgerEvent;
    /**
     * Get the event at 1-based sequence number `seq`.
     * @returns The event, or `undefined` if out of range.
     */
    get(seq: number): LedgerEvent | undefined;
    /**
     * Get the event with id `id`, if any.
     */
    getById(id: string): LedgerEvent | undefined;
    /** Get all events (a shallow copy of the underlying array). */
    all(): LedgerEvent[];
    /** Number of events in the chain. */
    length(): number;
    /** The first event in the chain, or `undefined` if empty. */
    head(): LedgerEvent | undefined;
    /** The last event in the chain, or `undefined` if empty. */
    tail(): LedgerEvent | undefined;
    /** Replace the chain's contents with `events`. Used by restore paths. */
    replaceAll(events: LedgerEvent[]): void;
}
//# sourceMappingURL=chain.d.ts.map