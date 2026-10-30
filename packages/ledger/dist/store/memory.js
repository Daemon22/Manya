"use strict";
/**
 * @manya-os/ledger — in-memory ledger store (array-backed).
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Conceived, directed, and owned by Uviwe Menyiwe (Azura Daemon), founder
 * of the Manya Hael Foundation.
 *
 * Licensed under the Apache License, Version 2.0.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryLedgerStore = void 0;
exports.cloneEvent = cloneEvent;
const errors_js_1 = require("../errors.js");
/**
 * An in-memory {@link LedgerStore} backed by a plain array.
 *
 * Events are stored as deep clones (via JSON round-trip) so callers cannot
 * mutate the store's internal state by holding references to appended events.
 */
class InMemoryLedgerStore {
    events = [];
    byId = new Map();
    /** @inheritdoc */
    append(event) {
        if (!event || typeof event !== 'object') {
            throw new errors_js_1.StoreError('append: event must be a LedgerEvent object');
        }
        if (typeof event.seq !== 'number' || typeof event.id !== 'string') {
            throw new errors_js_1.StoreError('append: event is malformed');
        }
        if (event.seq !== this.events.length + 1) {
            throw new errors_js_1.StoreError(`append: expected seq=${this.events.length + 1}, got seq=${event.seq}`);
        }
        if (this.byId.has(event.id)) {
            throw new errors_js_1.StoreError(`append: duplicate event id ${event.id}`);
        }
        const clone = cloneEvent(event);
        this.events.push(clone);
        this.byId.set(clone.id, clone);
    }
    /** @inheritdoc */
    get(seq) {
        if (!Number.isInteger(seq) || seq < 1 || seq > this.events.length)
            return undefined;
        return cloneEvent(this.events[seq - 1]);
    }
    /** @inheritdoc */
    getById(id) {
        const ev = this.byId.get(id);
        return ev ? cloneEvent(ev) : undefined;
    }
    /** @inheritdoc */
    length() {
        return this.events.length;
    }
    /** @inheritdoc */
    all() {
        return this.events.map(cloneEvent);
    }
    /** @inheritdoc */
    snapshot() {
        return this.events.map(cloneEvent);
    }
    /** @inheritdoc */
    restore(events) {
        if (!Array.isArray(events)) {
            throw new errors_js_1.StoreError('restore: events must be an array');
        }
        this.events.length = 0;
        this.byId.clear();
        for (let i = 0; i < events.length; i++) {
            const ev = events[i];
            if (!ev || typeof ev !== 'object') {
                throw new errors_js_1.StoreError(`restore: event ${i} is malformed`);
            }
            if (ev.seq !== i + 1) {
                throw new errors_js_1.StoreError(`restore: event ${i} has seq=${ev.seq}, expected ${i + 1}`);
            }
            if (this.byId.has(ev.id)) {
                throw new errors_js_1.StoreError(`restore: duplicate event id ${ev.id}`);
            }
            const clone = cloneEvent(ev);
            this.events.push(clone);
            this.byId.set(clone.id, clone);
        }
    }
}
exports.InMemoryLedgerStore = InMemoryLedgerStore;
/**
 * Deep-clone a ledger event via JSON round-trip.
 *
 * The payload / metadata must be JSON-serializable (this is enforced by
 * {@link createEvent}); JSON clone is therefore sufficient and avoids the
 * complexity of a structured-clone polyfill.
 *
 * @internal
 */
function cloneEvent(event) {
    try {
        return JSON.parse(JSON.stringify(event));
    }
    catch (err) {
        throw new errors_js_1.StoreError('cloneEvent: event is not JSON-serializable: ' + err.message, err);
    }
}
//# sourceMappingURL=memory.js.map