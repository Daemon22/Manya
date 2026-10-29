"use strict";
/**
 * @manya-os/ledger — event replayer + projections.
 *
 * Replays a sequence of ledger events through a filter, optionally folding
 * them through a reducer to build a projection.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Conceived, directed, and owned by Uviwe Menyiwe (Azura Daemon), founder
 * of the Manya Hael Foundation.
 *
 * Licensed under the Apache License, Version 2.0.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventReplayer = void 0;
const errors_js_1 = require("../errors.js");
/**
 * Replay events from a chain (or any array of events) through a filter.
 *
 * Supports range filters (by `seq` and by `timestamp`), equality filters
 * (by `type` and `actor`), and projections (via {@link project}).
 */
class EventReplayer {
    events;
    /**
     * @param events - The events to replay. The replayer does NOT take ownership
     *                 of the array (it iterates lazily) — pass a snapshot if
     *                 the underlying store may mutate during replay.
     */
    constructor(events) {
        this.events = events;
        if (events === null || events === undefined) {
            throw new errors_js_1.ReplayError('EventReplayer: events are required');
        }
    }
    /**
     * Iterate over events matching `filter`. Returns an iterable suitable for
     * `for...of` loops or spread into an array.
     *
     * @param filter - Optional filter.
     * @returns An iterable of matching events.
     */
    *replay(filter = {}) {
        const fromSeq = filter.fromSeq ?? 1;
        const toSeq = filter.toSeq ?? Number.MAX_SAFE_INTEGER;
        if (!Number.isInteger(fromSeq) || fromSeq < 1) {
            throw new errors_js_1.ReplayError(`replay: fromSeq must be a positive integer, got ${fromSeq}`);
        }
        if (!Number.isInteger(toSeq) || toSeq < fromSeq) {
            throw new errors_js_1.ReplayError(`replay: toSeq must be >= fromSeq (${fromSeq}), got ${toSeq}`);
        }
        const fromTimeMs = filter.fromTime !== undefined ? parseTime(filter.fromTime) : -Infinity;
        const toTimeMs = filter.toTime !== undefined ? parseTime(filter.toTime) : Infinity;
        if (Number.isNaN(fromTimeMs)) {
            throw new errors_js_1.ReplayError('replay: fromTime is not a valid timestamp');
        }
        if (Number.isNaN(toTimeMs)) {
            throw new errors_js_1.ReplayError('replay: toTime is not a valid timestamp');
        }
        for (const ev of this.events) {
            if (ev.seq < fromSeq || ev.seq > toSeq)
                continue;
            if (filter.type !== undefined && ev.type !== filter.type)
                continue;
            if (filter.actor !== undefined && ev.actor !== filter.actor)
                continue;
            const tsMs = Date.parse(ev.timestamp);
            if (Number.isNaN(tsMs))
                continue;
            if (tsMs < fromTimeMs || tsMs > toTimeMs)
                continue;
            yield ev;
        }
    }
    /**
     * Fold matching events through `reducer` to build a projection.
     *
     * @param reducer - Folding function `(state, event) => newState`.
     * @param initialState - Initial state passed to the first reducer call.
     * @param filter - Optional filter applied before folding.
     * @returns The final state.
     */
    project(reducer, initialState, filter = {}) {
        if (typeof reducer !== 'function') {
            throw new errors_js_1.ReplayError('project: reducer must be a function');
        }
        let state = initialState;
        for (const ev of this.replay(filter)) {
            try {
                state = reducer(state, ev);
            }
            catch (err) {
                throw new errors_js_1.ReplayError('project: reducer threw at seq=' + ev.seq + ': ' + err.message, err);
            }
        }
        return state;
    }
}
exports.EventReplayer = EventReplayer;
/**
 * Parse an ISO-8601 string or epoch-millis number into epoch-millis.
 * @internal
 */
function parseTime(t) {
    if (typeof t === 'number')
        return t;
    return Date.parse(t);
}
//# sourceMappingURL=replay.js.map