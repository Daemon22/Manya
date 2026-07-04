/**
 * @manya/nervous-system — operating-system metrics source.
 *
 * Periodically samples `os.cpus()`, `os.loadavg()`, `os.totalmem()`,
 * `os.freemem()`, and `os.uptime()` and emits `os.metrics` events.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Conceived, directed, and owned by Uviwe Menyiwe (Azura Daemon),
 * founder of the Manya Hael Foundation.
 *
 * Licensed under the Apache License, Version 2.0.
 */
import type { EventSink, Severity } from '../types.js';
/** Options for {@link OSSource}. */
export interface OSSourceOptions {
    /** Source id (default 'os'). */
    id?: string;
    /** Sampling interval in ms (default 5000). */
    intervalMs?: number;
    /** Severity for emitted events. Default 'info'. */
    severity?: Severity;
    /** Tags applied to every emitted event. */
    tags?: string[];
}
/** Default sampling interval (5s). */
export declare const DEFAULT_OS_INTERVAL_MS = 5000;
/**
 * Periodically emits `os.metrics` events with payload shape:
 * ```ts
 * {
 *   cpus: os.CpuInfo[],
 *   loadavg: [number, number, number],
 *   memory: { total: number, free: number, used: number, usedPct: number },
 *   uptime: number,
 * }
 * ```
 */
export declare class OSSource {
    readonly id: string;
    private readonly intervalMs;
    private readonly severity;
    private readonly tags;
    private timer;
    private sink;
    constructor(opts?: OSSourceOptions);
    /** Begin emitting metrics on the configured interval. */
    start(sink: EventSink): void;
    /** Stop emitting. */
    stop(): void;
    /** Emit a single sample. */
    sample(): void;
}
//# sourceMappingURL=os.d.ts.map