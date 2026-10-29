/**
 * @manya/nervous-system — process list source.
 *
 * Polls the host's process list using `child_process.exec` to run `ps`
 * (POSIX) or `tasklist` (Windows). Emits `process.spawn` events for newly
 * seen PIDs and `process.exit` events for PIDs that have disappeared since
 * the previous poll. Defensive: if the command is unavailable, emits a
 * single warning event and continues as a no-op.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Conceived, directed, and owned by Uviwe Menyiwe (Azura Daemon),
 * founder of the Manya Hael Foundation.
 *
 * Licensed under the Apache License, Version 2.0.
 */
import type { EventSink, Severity } from '../types.js';
/** Options for {@link ProcessSource}. */
export interface ProcessSourceOptions {
    /** Source id (default 'process'). */
    id?: string;
    /** Polling interval in ms (default 5000). */
    intervalMs?: number;
    /** Severity for emitted events. Default 'info'. */
    severity?: Severity;
    /** Tags applied to every emitted event. */
    tags?: string[];
}
/** Default polling interval. */
export declare const DEFAULT_PROCESS_INTERVAL_MS = 5000;
/**
 * Polls the process list and emits `process.spawn` / `process.exit` events.
 * Designed to be defensive: never throws from `start()` if `ps`/`tasklist`
 * is unavailable — instead emits a single `process.warning` event.
 */
export declare class ProcessSource {
    readonly id: string;
    private readonly intervalMs;
    private readonly severity;
    private readonly tags;
    private timer;
    private sink;
    private seen;
    private warnedUnavailable;
    private polling;
    constructor(opts?: ProcessSourceOptions);
    /** Begin polling. */
    start(sink: EventSink): void;
    /** Stop polling. */
    stop(): void;
    /** Whether `ps`/`tasklist` is available. Probed on the first poll. */
    isAvailable(): boolean;
    /** Run a single poll. Public for testing. */
    poll(): Promise<void>;
    private emit;
    private snapshot;
}
//# sourceMappingURL=process.d.ts.map