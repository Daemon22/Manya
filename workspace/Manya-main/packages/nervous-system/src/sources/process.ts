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

import { exec } from 'node:child_process';
import * as os from 'node:os';
import type { EventSink, NervousEvent, Severity } from '../types.js';
import { createEvent } from '../event/event.js';

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
export const DEFAULT_PROCESS_INTERVAL_MS = 5_000;

interface ProcEntry { pid: number; name: string; }

/**
 * Polls the process list and emits `process.spawn` / `process.exit` events.
 * Designed to be defensive: never throws from `start()` if `ps`/`tasklist`
 * is unavailable — instead emits a single `process.warning` event.
 */
export class ProcessSource {
  public readonly id: string;
  private readonly intervalMs: number;
  private readonly severity: Severity;
  private readonly tags: string[] | undefined;
  private timer: NodeJS.Timeout | null = null;
  private sink: EventSink | null = null;
  private seen = new Map<number, ProcEntry>();
  private warnedUnavailable = false;
  private polling = false;

  constructor(opts?: ProcessSourceOptions) {
    const o = opts ?? {};
    this.id = o.id ?? 'process';
    this.intervalMs = o.intervalMs ?? DEFAULT_PROCESS_INTERVAL_MS;
    this.severity = o.severity ?? 'info';
    this.tags = o.tags;
    if (!Number.isFinite(this.intervalMs) || this.intervalMs <= 0) {
      throw new RangeError('ProcessSource: intervalMs must be a positive number');
    }
  }

  /** Begin polling. */
  start(sink: EventSink): void {
    if (this.timer) return;
    this.sink = sink;
    this.timer = setInterval(() => { void this.poll(); }, this.intervalMs);
    if (typeof this.timer.unref === 'function') this.timer.unref();
    // Fire one poll immediately (asynchronously).
    void this.poll();
  }

  /** Stop polling. */
  stop(): void {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    this.sink = null;
    this.seen.clear();
  }

  /** Whether `ps`/`tasklist` is available. Probed on the first poll. */
  isAvailable(): boolean { return !this.warnedUnavailable; }

  /** Run a single poll. Public for testing. */
  async poll(): Promise<void> {
    if (!this.sink || this.polling) return;
    this.polling = true;
    try {
      const entries = await this.snapshot();
      if (entries === null) {
        // Snapshot failed — emit a one-time warning.
        if (!this.warnedUnavailable) {
          this.warnedUnavailable = true;
          const ev: NervousEvent = createEvent('process.warning', this.id, {
            reason: 'process list command unavailable',
          }, { severity: 'warn' });
          this.emit(ev);
        }
        return;
      }
      this.warnedUnavailable = false;
      const currentPids = new Set<number>();
      for (const entry of entries) {
        currentPids.add(entry.pid);
        if (!this.seen.has(entry.pid)) {
          this.seen.set(entry.pid, entry);
          const ev: NervousEvent = createEvent('process.spawn', this.id, {
            pid: entry.pid, name: entry.name,
          }, { severity: this.severity, tags: this.tags });
          this.emit(ev);
        }
      }
      // Detect exits.
      for (const [pid, entry] of this.seen) {
        if (!currentPids.has(pid)) {
          this.seen.delete(pid);
          const ev: NervousEvent = createEvent('process.exit', this.id, {
            pid, name: entry.name,
          }, { severity: this.severity, tags: this.tags });
          this.emit(ev);
        }
      }
    } finally {
      this.polling = false;
    }
  }

  private emit(ev: NervousEvent): void {
    try { this.sink?.(ev); } catch { /* swallow */ }
  }

  private snapshot(): Promise<ProcEntry[] | null> {
    const platform = os.platform();
    const cmd = platform === 'win32'
      ? 'tasklist /FO CSV /NH'
      : 'ps -A -o pid=,comm=';
    return new Promise((resolve) => {
      exec(cmd, { timeout: 5_000 }, (err, stdout) => {
        if (err || !stdout) { resolve(null); return; }
        const out: ProcEntry[] = [];
        const lines = stdout.split(/\r?\n/);
        for (const raw of lines) {
          const line = raw.trim();
          if (!line) continue;
          const entry = platform === 'win32' ? parseTasklistLine(line) : parsePsLine(line);
          if (entry) out.push(entry);
        }
        resolve(out);
      });
    });
  }
}

function parsePsLine(line: string): ProcEntry | null {
  // Output format from `ps -A -o pid=,comm=` is whitespace-stripped, e.g.
  //   1 /sbin/init
  //   123 /usr/bin/node
  const match = line.match(/^\s*(\d+)\s+(.+)$/);
  if (!match) return null;
  const pid = Number(match[1]);
  if (!Number.isInteger(pid) || pid <= 0) return null;
  return { pid, name: match[2].trim() };
}

function parseTasklistLine(line: string): ProcEntry | null {
  // `tasklist /FO CSV /NH` produces lines like:
  //   "System Idle Process","0","Services","0","8 K"
  // Strip surrounding quotes and pull the first two fields.
  const cells = line.split('","').map((s) => s.replace(/^"|"$/g, ''));
  if (cells.length < 2) return null;
  const name = cells[0];
  const pid = Number(cells[1]);
  if (!name || !Number.isInteger(pid) || pid < 0) return null;
  return { pid, name };
}
