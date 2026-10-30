"use strict";
/**
 * @manya-os/nervous-system — application source.
 *
 * Wraps an application surface (HTTP request handler, RPC server, etc.)
 * and emits `app.request` events. The default implementation uses an
 * internal {@link EventEmitter} so the source is testable without binding
 * a real network socket.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Conceived, directed, and owned by Uviwe Menyiwe (Azura Daemon),
 * founder of the Manya Hael Foundation.
 *
 * Licensed under the Apache License, Version 2.0.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApplicationSource = void 0;
const node_events_1 = require("node:events");
const event_js_1 = require("../event/event.js");
/**
 * Wraps an application surface and emits `app.request` events for every
 * request-like interaction. By default, listens on an internal
 * {@link EventEmitter} so callers can simulate requests via `recordRequest`.
 *
 * To integrate a real HTTP server, supply an `emitter` that emits
 * `request` events with `{ method, url, headers?, body? }` payloads.
 */
class ApplicationSource {
    id;
    severity;
    tags;
    emitter;
    ownsEmitter;
    sink = null;
    listener = null;
    constructor(opts) {
        const o = opts ?? {};
        this.id = o.id ?? 'application';
        this.severity = o.severity ?? 'info';
        this.tags = o.tags;
        if (o.emitter) {
            this.emitter = o.emitter;
            this.ownsEmitter = false;
        }
        else {
            this.emitter = new node_events_1.EventEmitter();
            this.emitter.setMaxListeners(0);
            this.ownsEmitter = true;
        }
    }
    /** Start listening for request events on the emitter. */
    start(sink) {
        if (this.listener)
            return;
        this.sink = sink;
        this.listener = (req) => {
            if (!this.sink)
                return;
            const payload = normalizeRequest(req);
            const ev = (0, event_js_1.createEvent)('app.request', this.id, payload, {
                severity: this.severity,
                tags: this.tags,
            });
            try {
                this.sink(ev);
            }
            catch { /* swallow */ }
        };
        this.emitter.on('request', this.listener);
    }
    /** Stop listening. */
    stop() {
        if (this.listener) {
            this.emitter.off('request', this.listener);
            this.listener = null;
        }
        this.sink = null;
    }
    /** Simulate a request (only meaningful when no external emitter was supplied). */
    recordRequest(req) {
        this.emitter.emit('request', req);
    }
    /** The internal emitter (useful for `app.response` etc. extensions). */
    getEmitter() { return this.emitter; }
}
exports.ApplicationSource = ApplicationSource;
function normalizeRequest(req) {
    if (!req || typeof req !== 'object') {
        return { method: 'UNKNOWN', url: '' };
    }
    const r = req;
    return {
        method: typeof r.method === 'string' ? r.method : 'UNKNOWN',
        url: typeof r.url === 'string' ? r.url : '',
        ...(r.headers ? { headers: r.headers } : {}),
        ...(r.body !== undefined ? { body: r.body } : {}),
    };
}
//# sourceMappingURL=application.js.map