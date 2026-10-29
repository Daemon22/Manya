/**
 * @manya/nervous-system — filesystem event source.
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
import type { EventSink, Severity } from '../types.js';
/** Options for {@link FilesystemSource}. */
export interface FilesystemSourceOptions {
    /** Directory to watch. Required. */
    path: string;
    /** Source id (default 'filesystem'). */
    id?: string;
    /** Whether to recurse (best-effort — not all platforms support recursive watch). */
    recursive?: boolean;
    /** Severity for emitted events. Default 'info'. */
    severity?: Severity;
    /** Tags applied to every emitted event. */
    tags?: string[];
}
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
export declare class FilesystemSource {
    readonly id: string;
    private readonly path;
    private readonly recursive;
    private readonly severity;
    private readonly tags;
    private watcher;
    private sink;
    constructor(opts: FilesystemSourceOptions);
    /** Returns true if a watcher is currently active. */
    isAvailable(): boolean;
    /** Begin watching the directory. */
    start(sink: EventSink): void;
    /** Stop watching. */
    stop(): void;
}
//# sourceMappingURL=filesystem.d.ts.map