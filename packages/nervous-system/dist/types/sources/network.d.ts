/**
 * @manya/nervous-system — network statistics source.
 *
 * Periodically samples network interface counters. On Linux, parses
 * `/proc/net/dev` for per-interface byte counters; on other platforms,
 * falls back to `os.networkInterfaces()` and reports only the interface
 * list with `rx_bytes`/`tx_bytes` set to 0 (and emits a one-time warning).
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Conceived, directed, and owned by Uviwe Menyiwe (Azura Daemon),
 * founder of the Manya Hael Foundation.
 *
 * Licensed under the Apache License, Version 2.0.
 */
import type { EventSink, Severity } from '../types.js';
/** Options for {@link NetworkSource}. */
export interface NetworkSourceOptions {
    /** Source id (default 'network'). */
    id?: string;
    /** Sampling interval in ms (default 5000). */
    intervalMs?: number;
    /** Severity for emitted events. Default 'info'. */
    severity?: Severity;
    /** Tags applied to every emitted event. */
    tags?: string[];
}
/** Default sampling interval. */
export declare const DEFAULT_NETWORK_INTERVAL_MS = 5000;
interface NetInterface {
    name: string;
    rxBytes: number;
    txBytes: number;
}
/**
 * Periodically emits `net.stats` events with payload shape:
 * ```ts
 * {
 *   interfaces: Array<{ name, rxBytes, txBytes }>,
 *   rx_bytes: number,    // sum across all interfaces
 *   tx_bytes: number,    // sum across all interfaces
 * }
 * ```
 *
 * Defensive: if `/proc/net/dev` is unavailable (non-Linux), emits a single
 * `net.warning` event and falls back to `os.networkInterfaces()` (with byte
 * counters zeroed).
 */
export declare class NetworkSource {
    readonly id: string;
    private readonly intervalMs;
    private readonly severity;
    private readonly tags;
    private timer;
    private sink;
    private warned;
    constructor(opts?: NetworkSourceOptions);
    /** Begin emitting network stats on the configured interval. */
    start(sink: EventSink): void;
    /** Stop emitting. */
    stop(): void;
    /** Emit a single sample. Public for testing. */
    sample(): void;
    private emitStats;
    private emit;
}
/**
 * Parse `/proc/net/dev`. Returns `null` if unavailable.
 * Format (Linux):
 *   Inter-|   Receive                                                |  Transmit
 *     face |bytes packets errs drop fifo frame compressed multicast|bytes packets ...
 *       lo: 1234 56 0 0 0 0 0 0  4321 87 0 0 0 0 0 0
 *     eth0: 99 12 0 0 0 0 0 0  77 11 0 0 0 0 0 0
 */
export declare function readLinuxNetDev(): NetInterface[] | null;
export {};
//# sourceMappingURL=network.d.ts.map