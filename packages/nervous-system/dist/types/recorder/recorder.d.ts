/**
 * @manya/nervous-system — ring-buffer event recorder.
 *
 * The recorder stores events in a fixed-capacity ring buffer. When the
 * buffer is full, the oldest event is overwritten. Export helpers support
 * both array and JSON-string output, optionally filtered.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Conceived, directed, and owned by Uviwe Menyiwe (Azura Daemon),
 * founder of the Manya Hael Foundation.
 *
 * Licensed under the Apache License, Version 2.0.
 */
import type { EventFilter, NervousEvent } from '../types.js';
/** Default maximum buffer size. */
export declare const DEFAULT_RECORDER_MAX_SIZE = 10000;
/**
 * Fixed-capacity ring buffer of `NervousEvent`s.
 *
 * - `record(event)` is O(1).
 * - `getEvents(filter?)` is O(N) without filter, O(N + k) with a compiled filter.
 * - `clear()` is O(1).
 */
export declare class EventRecorder {
    private readonly buffer;
    private readonly capacity;
    private head;
    private filled;
    private recording;
    constructor(maxSize?: number);
    /** Begin recording. Idempotent. */
    start(maxSize?: number): void;
    /** Stop recording. Idempotent. Buffer contents are preserved. */
    stop(): void;
    /** Whether the recorder is currently recording. */
    isRecording(): boolean;
    /** Maximum capacity of the buffer. */
    getCapacity(): number;
    /** Number of events currently stored. */
    size(): number;
    /** Record an event. Returns true if recorded, false if not recording. */
    record(event: NervousEvent): boolean;
    /**
     * Return all stored events (optionally filtered) in chronological order.
     * Returns a fresh array; mutating it does not affect the recorder.
     */
    getEvents(filter?: EventFilter): NervousEvent[];
    /** Clear all stored events. Recording state is unaffected. */
    clear(): void;
    /** Export events as an array (alias of {@link getEvents}). */
    export(filter?: EventFilter): NervousEvent[];
    /** Export events as a JSON string. */
    exportJSON(filter?: EventFilter, pretty?: boolean): string;
}
//# sourceMappingURL=recorder.d.ts.map