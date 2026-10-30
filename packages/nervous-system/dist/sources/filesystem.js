"use strict";
/**
 * @manya-os/nervous-system — filesystem event source.
 *
 * Watches a directory using `fs.watch` and emits `fs.change` events with
 * `{ path, event }` payloads.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Conceived, directed, and owned by Uviwe Menyiwe (Azura Daemon),
 * founder of the Manya Hael Foundation.
 *
 * Licensed under the Apache License, Version 2.0.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FilesystemSource = void 0;
const node_fs_1 = require("node:fs");
const errors_js_1 = require("../errors.js");
const event_js_1 = require("../event/event.js");
/**
 * Watches a directory using `fs.watch` and publishes an `fs.change` event
 * for every change detected. The payload shape is `{ path, event }` where
 * `event` is the raw `fs.watch` event type ('rename' | 'change' or platform
 * variant).
 *
 * On platforms where `fs.watch` is unavailable or the path cannot be
 * watched, `start()` logs a warning and continues as a no-op (no events
 * will be emitted). Use `isAvailable()` to probe.
 */
class FilesystemSource {
    id;
    path;
    recursive;
    severity;
    tags;
    watcher = null;
    sink = null;
    constructor(opts) {
        if (!opts || typeof opts.path !== 'string' || !opts.path) {
            throw new errors_js_1.SourceError('FilesystemSource: path is required');
        }
        this.id = opts.id ?? 'filesystem';
        this.path = opts.path;
        this.recursive = !!opts.recursive;
        this.severity = opts.severity ?? 'info';
        this.tags = opts.tags;
    }
    /** Returns true if a watcher is currently active. */
    isAvailable() { return this.watcher !== null; }
    /** Begin watching the directory. */
    start(sink) {
        if (this.watcher)
            return;
        this.sink = sink;
        try {
            this.watcher = (0, node_fs_1.watch)(this.path, { recursive: this.recursive }, (event, filename) => {
                if (!this.sink)
                    return;
                const payload = {
                    path: filename ? String(filename) : '',
                    event,
                };
                const ev = (0, event_js_1.createEvent)('fs.change', this.id, payload, {
                    severity: this.severity,
                    tags: this.tags,
                    metadata: { directory: this.path },
                });
                try {
                    this.sink(ev);
                }
                catch { /* swallow — never throw from watcher */ }
            });
            this.watcher.on('error', (err) => {
                // Surface the error as an event so consumers can react.
                const ev = (0, event_js_1.createEvent)('fs.error', this.id, {
                    error: err instanceof Error ? err.message : String(err),
                    directory: this.path,
                }, { severity: 'error' });
                try {
                    this.sink?.(ev);
                }
                catch { /* swallow */ }
            });
        }
        catch (e) {
            this.watcher = null;
            throw new errors_js_1.SourceError(`FilesystemSource: cannot watch '${this.path}'`, e);
        }
    }
    /** Stop watching. */
    stop() {
        if (this.watcher) {
            try {
                this.watcher.close();
            }
            catch { /* ignore */ }
            this.watcher = null;
        }
        this.sink = null;
    }
}
exports.FilesystemSource = FilesystemSource;
//# sourceMappingURL=filesystem.js.map