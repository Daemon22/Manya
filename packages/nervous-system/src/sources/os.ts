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

import * as os from 'node:os';
import type { EventSink, NervousEvent, Severity } from '../types.js';
import { createEvent } from '../event/event.js';

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
export const DEFAULT_OS_INTERVAL_MS = 5_000;

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
export class OSSource {
  public readonly id: string;
  private readonly intervalMs: number;
  private readonly severity: Severity;
  private readonly tags: string[] | undefined;
  private timer: NodeJS.Timeout | null = null;
  private sink: EventSink | null = null;

  constructor(opts?: OSSourceOptions) {
    const o = opts ?? {};
    this.id = o.id ?? 'os';
    this.intervalMs = o.intervalMs ?? DEFAULT_OS_INTERVAL_MS;
    this.severity = o.severity ?? 'info';
    this.tags = o.tags;
    if (!Number.isFinite(this.intervalMs) || this.intervalMs <= 0) {
      throw new RangeError('OSSource: intervalMs must be a positive number');
    }
  }

  /** Begin emitting metrics on the configured interval. */
  start(sink: EventSink): void {
    if (this.timer) return;
    this.sink = sink;
    // Emit one immediately so consumers don't wait a full interval.
    this.sample();
    this.timer = setInterval(() => this.sample(), this.intervalMs);
    if (typeof this.timer.unref === 'function') this.timer.unref();
  }

  /** Stop emitting. */
  stop(): void {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    this.sink = null;
  }

  /** Emit a single sample. */
  sample(): void {
    if (!this.sink) return;
    const cpus = os.cpus();
    const loadavg = os.loadavg();
    const total = os.totalmem();
    const free = os.freemem();
    const used = total - free;
    const usedPct = total > 0 ? used / total : 0;
    const payload = {
      cpus,
      loadavg: [loadavg[0] ?? 0, loadavg[1] ?? 0, loadavg[2] ?? 0],
      memory: { total, free, used, usedPct },
      uptime: os.uptime(),
    };
    const ev: NervousEvent = createEvent('os.metrics', this.id, payload, {
      severity: this.severity,
      tags: this.tags,
    });
    try { this.sink(ev); } catch { /* swallow */ }
  }
}
