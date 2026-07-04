/**
 * @manya/nervous-system — event model.
 *
 * Defines the universal `NervousEvent` shape plus a factory, JSON serializer,
 * and deserializer. Events are the smallest unit of work in the fabric.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Conceived, directed, and owned by Uviwe Menyiwe (Azura Daemon),
 * founder of the Manya Hael Foundation.
 *
 * Licensed under the Apache License, Version 2.0.
 */
import type { NervousEvent, Severity } from '../types.js';
/** Options accepted by {@link createEvent}. */
export interface CreateEventOptions {
    /** Override the auto-generated event id. */
    id?: string;
    /** Override the auto-stamped timestamp (epoch ms). */
    timestamp?: number;
    /** Severity. Defaults to 'info'. */
    severity?: Severity;
    /** Optional taxonomy tags. */
    tags?: string[];
    /** Optional structured metadata. */
    metadata?: Record<string, unknown>;
}
/**
 * Generate a stable event id. Uses `crypto.randomUUID()` when available,
 * falling back to a high-entropy timestamp+random string.
 */
export declare function generateEventId(): string;
/** Returns true if `s` is a valid {@link Severity} value. */
export declare function isSeverity(s: unknown): s is Severity;
/**
 * Create a {@link NervousEvent} with sane defaults.
 *
 * @param topic   Event topic, e.g. `'fs.change'` or `'os.metrics'`.
 * @param source  Provenance string identifying the producer.
 * @param payload Arbitrary structured payload.
 * @param opts    Optional overrides (id, timestamp, severity, tags, metadata).
 */
export declare function createEvent(topic: string, source: string, payload: unknown, opts?: CreateEventOptions): NervousEvent;
/**
 * Serialize a {@link NervousEvent} to a JSON string.
 *
 * @param event The event to serialize.
 * @param pretty If true, indent with 2 spaces.
 */
export declare function serialize(event: NervousEvent, pretty?: boolean): string;
/**
 * Deserialize a JSON string into a {@link NervousEvent}.
 *
 * Performs structural validation: requires `id`, `topic`, `source`,
 * `timestamp`, and `severity`. Payload, tags, and metadata are passed through.
 */
export declare function deserialize(json: string): NervousEvent;
/** Deep structural equality for two events (used by tests / recorders). */
export declare function eventsEqual(a: NervousEvent, b: NervousEvent): boolean;
//# sourceMappingURL=event.d.ts.map