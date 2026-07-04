/**
 * @manya/nervous-system — application source.
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
import { EventEmitter } from 'node:events';
import type { EventSink, Severity } from '../types.js';
/** Options for {@link ApplicationSource}. */
export interface ApplicationSourceOptions {
    /** Source id (default 'application'). */
    id?: string;
    /** Severity for emitted events. Default 'info'. */
    severity?: Severity;
    /** Tags applied to every emitted event. */
    tags?: string[];
    /** External emitter to listen on (default: internal). */
    emitter?: EventEmitter;
}
/**
 * Wraps an application surface and emits `app.request` events for every
 * request-like interaction. By default, listens on an internal
 * {@link EventEmitter} so callers can simulate requests via `recordRequest`.
 *
 * To integrate a real HTTP server, supply an `emitter` that emits
 * `request` events with `{ method, url, headers?, body? }` payloads.
 */
export declare class ApplicationSource {
    readonly id: string;
    private readonly severity;
    private readonly tags;
    private readonly emitter;
    private readonly ownsEmitter;
    private sink;
    private listener;
    constructor(opts?: ApplicationSourceOptions);
    /** Start listening for request events on the emitter. */
    start(sink: EventSink): void;
    /** Stop listening. */
    stop(): void;
    /** Simulate a request (only meaningful when no external emitter was supplied). */
    recordRequest(req: {
        method?: string;
        url?: string;
        headers?: Record<string, string>;
        body?: unknown;
    }): void;
    /** The internal emitter (useful for `app.response` etc. extensions). */
    getEmitter(): EventEmitter;
}
//# sourceMappingURL=application.d.ts.map