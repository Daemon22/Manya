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

import { watch, type FSWatcher } from 'node:fs';
import type { EventSink, NervousEvent, Severity } from '../types.js';
import { SourceError } from '../errors.js';
import { createEvent } from '../event/event.js';

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
export class FilesystemSource {
  public readonly id: string;
  private readonly path: string;
  private readonly recursive: boolean;
  private readonly severity: Severity;
  private readonly tags: string[] | undefined;
  private watcher: FSWatcher | null = null;
  private sink: EventSink | null = null;

  constructor(opts: FilesystemSourceOptions) {
    if (!opts || typeof opts.path !== 'string' || !opts.path) {
      throw new SourceError('FilesystemSource: path is required');
    }
    this.id = opts.id ?? 'filesystem';
    this.path = opts.path;
    this.recursive = !!opts.recursive;
    this.severity = opts.severity ?? 'info';
    this.tags = opts.tags;
  }

  /** Returns true if a watcher is currently active. */
  isAvailable(): boolean { return this.watcher !== null; }

  /** Begin watching the directory. */
  start(sink: EventSink): void {
    if (this.watcher) return;
    this.sink = sink;
    try {
      this.watcher = watch(this.path, { recursive: this.recursive }, (event, filename) => {
        if (!this.sink) return;
        const payload = {
          path: filename ? String(filename) : '',
          event,
        };
        const ev: NervousEvent = createEvent('fs.change', this.id, payload, {
          severity: this.severity,
          tags: this.tags,
          metadata: { directory: this.path },
        });
        try { this.sink(ev); } catch { /* swallow — never throw from watcher */ }
      });
      this.watcher.on('error', (err) => {
        // Surface the error as an event so consumers can react.
        const ev: NervousEvent = createEvent('fs.error', this.id, {
          error: err instanceof Error ? err.message : String(err),
          directory: this.path,
        }, { severity: 'error' });
        try { this.sink?.(ev); } catch { /* swallow */ }
      });
    } catch (e) {
      this.watcher = null;
      throw new SourceError(`FilesystemSource: cannot watch '${this.path}'`, e);
    }
  }

  /** Stop watching. */
  stop(): void {
    if (this.watcher) {
      try { this.watcher.close(); } catch { /* ignore */ }
      this.watcher = null;
    }
    this.sink = null;
  }
}
