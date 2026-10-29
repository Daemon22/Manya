"use strict";
/**
 * @manya-os/nervous-system — ring-buffer event recorder.
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventRecorder = exports.DEFAULT_RECORDER_MAX_SIZE = void 0;
const errors_js_1 = require("../errors.js");
const filter_js_1 = require("../filter/filter.js");
/** Default maximum buffer size. */
exports.DEFAULT_RECORDER_MAX_SIZE = 10_000;
/**
 * Fixed-capacity ring buffer of `NervousEvent`s.
 *
 * - `record(event)` is O(1).
 * - `getEvents(filter?)` is O(N) without filter, O(N + k) with a compiled filter.
 * - `clear()` is O(1).
 */
class EventRecorder {
    buffer;
    capacity;
    head = 0;
    filled = 0;
    recording = false;
    constructor(maxSize = exports.DEFAULT_RECORDER_MAX_SIZE) {
        if (!Number.isInteger(maxSize) || maxSize <= 0) {
            throw new errors_js_1.RecorderError('maxSize must be a positive integer');
        }
        this.capacity = maxSize;
        this.buffer = new Array(maxSize);
    }
    /** Begin recording. Idempotent. */
    start(maxSize) {
        if (maxSize !== undefined) {
            // Specifying a different maxSize after construction is an error;
            // the capacity is fixed at construction time.
            if (maxSize !== this.capacity) {
                throw new errors_js_1.RecorderError(`start(maxSize=${maxSize}) does not match constructor capacity ${this.capacity}; construct a new recorder instead`);
            }
        }
        this.recording = true;
    }
    /** Stop recording. Idempotent. Buffer contents are preserved. */
    stop() { this.recording = false; }
    /** Whether the recorder is currently recording. */
    isRecording() { return this.recording; }
    /** Maximum capacity of the buffer. */
    getCapacity() { return this.capacity; }
    /** Number of events currently stored. */
    size() { return this.filled; }
    /** Record an event. Returns true if recorded, false if not recording. */
    record(event) {
        if (!this.recording)
            return false;
        if (!event || typeof event !== 'object')
            throw new errors_js_1.RecorderError('record(): event must be an object');
        this.buffer[this.head] = event;
        this.head = (this.head + 1) % this.capacity;
        if (this.filled < this.capacity)
            this.filled++;
        return true;
    }
    /**
     * Return all stored events (optionally filtered) in chronological order.
     * Returns a fresh array; mutating it does not affect the recorder.
     */
    getEvents(filter) {
        const compiled = filter ? (0, filter_js_1.compileFilter)(filter) : null;
        const out = [];
        if (this.filled === 0)
            return out;
        if (this.filled < this.capacity) {
            // Not yet wrapped — buffer[0..filled-1] are in chronological order.
            for (let i = 0; i < this.filled; i++) {
                const e = this.buffer[i];
                if (!compiled || compiled(e))
                    out.push(e);
            }
        }
        else {
            // Wrapped — oldest is at `head`, newest is at `head - 1`.
            for (let i = 0; i < this.capacity; i++) {
                const idx = (this.head + i) % this.capacity;
                const e = this.buffer[idx];
                if (!compiled || compiled(e))
                    out.push(e);
            }
        }
        return out;
    }
    /** Clear all stored events. Recording state is unaffected. */
    clear() {
        this.head = 0;
        this.filled = 0;
        this.buffer.fill(undefined);
    }
    /** Export events as an array (alias of {@link getEvents}). */
    export(filter) { return this.getEvents(filter); }
    /** Export events as a JSON string. */
    exportJSON(filter, pretty) {
        try {
            return JSON.stringify(this.getEvents(filter), null, pretty ? 2 : 0);
        }
        catch (e) {
            throw new errors_js_1.RecorderError('exportJSON(): serialization failed', e);
        }
    }
}
exports.EventRecorder = EventRecorder;
//# sourceMappingURL=recorder.js.map