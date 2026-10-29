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

import { readFileSync } from 'node:fs';
import * as os from 'node:os';
import type { EventSink, NervousEvent, Severity } from '../types.js';
import { createEvent } from '../event/event.js';

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
export const DEFAULT_NETWORK_INTERVAL_MS = 5_000;

interface NetInterface { name: string; rxBytes: number; txBytes: number; }

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
export class NetworkSource {
  public readonly id: string;
  private readonly intervalMs: number;
  private readonly severity: Severity;
  private readonly tags: string[] | undefined;
  private timer: NodeJS.Timeout | null = null;
  private sink: EventSink | null = null;
  private warned = false;

  constructor(opts?: NetworkSourceOptions) {
    const o = opts ?? {};
    this.id = o.id ?? 'network';
    this.intervalMs = o.intervalMs ?? DEFAULT_NETWORK_INTERVAL_MS;
    this.severity = o.severity ?? 'info';
    this.tags = o.tags;
    if (!Number.isFinite(this.intervalMs) || this.intervalMs <= 0) {
      throw new RangeError('NetworkSource: intervalMs must be a positive number');
    }
  }

  /** Begin emitting network stats on the configured interval. */
  start(sink: EventSink): void {
    if (this.timer) return;
    this.sink = sink;
    this.sample();
    this.timer = setInterval(() => this.sample(), this.intervalMs);
    if (typeof this.timer.unref === 'function') this.timer.unref();
  }

  /** Stop emitting. */
  stop(): void {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    this.sink = null;
  }

  /** Emit a single sample. Public for testing. */
  sample(): void {
    if (!this.sink) return;
    const interfaces = readLinuxNetDev();
    if (interfaces === null) {
      if (!this.warned) {
        this.warned = true;
        const ev: NervousEvent = createEvent('net.warning', this.id, {
          reason: '/proc/net/dev unavailable on this platform; reporting interface names only',
        }, { severity: 'warn' });
        this.emit(ev);
      }
      // Fallback: enumerate via os.networkInterfaces(), byte counters zeroed.
      const names = Object.keys(os.networkInterfaces() ?? {});
      const fallback = names.map((name) => ({ name, rxBytes: 0, txBytes: 0 }));
      this.emitStats(fallback);
      return;
    }
    this.emitStats(interfaces);
  }

  private emitStats(interfaces: NetInterface[]): void {
    let rx = 0, tx = 0;
    for (const i of interfaces) { rx += i.rxBytes; tx += i.txBytes; }
    const ev: NervousEvent = createEvent('net.stats', this.id, {
      interfaces,
      rx_bytes: rx,
      tx_bytes: tx,
    }, { severity: this.severity, tags: this.tags });
    this.emit(ev);
  }

  private emit(ev: NervousEvent): void {
    try { this.sink?.(ev); } catch { /* swallow */ }
  }
}

/**
 * Parse `/proc/net/dev`. Returns `null` if unavailable.
 * Format (Linux):
 *   Inter-|   Receive                                                |  Transmit
 *     face |bytes packets errs drop fifo frame compressed multicast|bytes packets ...
 *       lo: 1234 56 0 0 0 0 0 0  4321 87 0 0 0 0 0 0
 *     eth0: 99 12 0 0 0 0 0 0  77 11 0 0 0 0 0 0
 */
export function readLinuxNetDev(): NetInterface[] | null {
  let data: string;
  try {
    data = readFileSync('/proc/net/dev', 'utf8');
  } catch {
    return null;
  }
  const lines = data.split('\n');
  // Drop the two header lines.
  const out: NetInterface[] = [];
  for (let i = 2; i < lines.length; i++) {
    const line = lines[i];
    if (!line || !line.trim()) continue;
    const colonIdx = line.indexOf(':');
    if (colonIdx < 0) continue;
    const name = line.slice(0, colonIdx).trim();
    const rest = line.slice(colonIdx + 1).trim().split(/\s+/);
    // [0] = rx bytes, [8] = tx bytes
    const rxBytes = Number(rest[0] ?? 0);
    const txBytes = Number(rest[8] ?? 0);
    if (!Number.isFinite(rxBytes) || !Number.isFinite(txBytes)) continue;
    out.push({ name, rxBytes, txBytes });
  }
  return out;
}
