"use strict";
/**
 * @manya-os/nervous-system — custom producer source.
 *
 * Accepts a user-supplied producer function `(emit) => void` and calls it
 * on `start()`. Useful for one-off integrations and tests.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Conceived, directed, and owned by Uviwe Menyiwe (Azura Daemon),
 * founder of the Manya Hael Foundation.
 *
 * Licensed under the Apache License, Version 2.0.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomSource = void 0;
const errors_js_1 = require("../errors.js");
const event_js_1 = require("../event/event.js");
/**
 * Wraps a user-supplied producer function. The producer receives an `emit`
 * callback that constructs a {@link NervousEvent} from a topic + payload
 * and forwards it to the fabric sink.
 *
 * Example:
 * ```ts
 * new CustomSource({
 *   id: 'clock',
 *   producer: (emit) => {
 *     const t = setInterval(() => emit({ topic: 'clock.tick', payload: { now: Date.now() } }), 1000);
 *     // To stop, the producer may register cleanup via the source's onStop.
 *   },
 * });
 * ```
 */
class CustomSource {
    id;
    producer;
    severity;
    tags;
    sink = null;
    started = false;
    onStop = null;
    constructor(opts) {
        if (!opts || typeof opts.producer !== 'function') {
            throw new errors_js_1.SourceError('CustomSource: producer function is required');
        }
        this.id = opts.id ?? 'custom';
        this.producer = opts.producer;
        this.severity = opts.severity ?? 'info';
        this.tags = opts.tags;
    }
    /** Begin producing events. The producer is invoked synchronously. */
    start(sink) {
        if (this.started)
            return;
        this.sink = sink;
        this.started = true;
        const emit = (input) => {
            if (!this.sink)
                return;
            let ev;
            if (input && typeof input === 'object' && 'id' in input && typeof input.id === 'string' && 'timestamp' in input) {
                ev = input;
            }
            else {
                const i = input;
                ev = (0, event_js_1.createEvent)(i.topic, this.id, i.payload, {
                    severity: i.severity ?? this.severity,
                    tags: i.tags ?? this.tags,
                    metadata: i.metadata,
                });
            }
            try {
                this.sink(ev);
            }
            catch { /* swallow */ }
        };
        try {
            const ret = this.producer(emit);
            // If the producer returns a cleanup function (typical Promise-or-sync
            // pattern), stash it for `stop()`.
            if (typeof ret === 'function')
                this.onStop = ret;
        }
        catch (e) {
            this.started = false;
            this.sink = null;
            throw new errors_js_1.SourceError('CustomSource: producer threw', e);
        }
    }
    /** Stop the source. Calls the producer's cleanup function if one was returned. */
    stop() {
        if (this.onStop) {
            try {
                this.onStop();
            }
            catch { /* swallow */ }
            this.onStop = null;
        }
        this.started = false;
        this.sink = null;
    }
}
exports.CustomSource = CustomSource;
//# sourceMappingURL=custom.js.map