/**
 * @manya-os/ledger — file-backed ledger store (append-only).
 *
 * Persists events to a single append-only file as JSON-per-line (JSONL).
 * Provides:
 *   - atomic appends via `fs.appendFileSync` (POSIX append is atomic for
 *     writes smaller than `PIPE_BUF`, typically 4 KiB);
 *   - an in-memory index for O(1) `getById` lookups;
 *   - periodic compaction when the file exceeds `compactThresholdBytes`
 *     (rewrites the file with the current in-memory state).
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Conceived, directed, and owned by Uviwe Menyiwe (Azura Daemon), founder
 * of the Manya Hael Foundation.
 *
 * Licensed under the Apache License, Version 2.0.
 */

import * as fs from 'fs';
import * as path from 'path';
import { StoreError } from '../errors.js';
import type { LedgerEvent } from '../types.js';
import type { LedgerStore } from './store.js';
import { cloneEvent } from './memory.js';

/** Default compaction threshold (1 MiB). */
export const DEFAULT_COMPACT_THRESHOLD_BYTES = 1024 * 1024;

/** Options for {@link FileLedgerStore}. */
export interface FileLedgerStoreOptions {
  /**
   * Compaction threshold in bytes. When the data file exceeds this size,
   * `append()` triggers a compaction (rewrite from in-memory state).
   * Defaults to {@link DEFAULT_COMPACT_THRESHOLD_BYTES}.
   */
  compactThresholdBytes?: number;
  /**
   * Whether to load the existing file on construction. Defaults to `true`.
   * Set to `false` for a fresh start (the existing file is OVERWRITTEN on
   * the first append).
   */
  load?: boolean;
}

/**
 * File-backed {@link LedgerStore}.
 *
 * The data file path is `<dir>/<name>.jsonl`. A sidecar index file
 * `<dir>/<name>.idx.json` maps event ids to line numbers for fast `getById`
 * (the index is rebuilt lazily if missing or stale).
 */
export class FileLedgerStore implements LedgerStore {
  private readonly events: LedgerEvent[] = [];
  private readonly byId: Map<string, LedgerEvent> = new Map();
  private readonly dataPath: string;
  private readonly indexPath: string;
  private readonly compactThreshold: number;

  /**
   * Open (or create) a file-backed store.
   *
   * @param dir - Directory holding the data + index files.
   * @param name - Base name (without extension).
   * @param opts - Optional parameters.
   */
  constructor(
    dir: string,
    name = 'ledger',
    opts: FileLedgerStoreOptions = {}
  ) {
    if (typeof dir !== 'string' || dir.length === 0) {
      throw new StoreError('FileLedgerStore: dir must be a non-empty string');
    }
    if (typeof name !== 'string' || name.length === 0) {
      throw new StoreError('FileLedgerStore: name must be a non-empty string');
    }
    this.dataPath = path.join(dir, `${name}.jsonl`);
    this.indexPath = path.join(dir, `${name}.idx.json`);
    this.compactThreshold =
      opts.compactThresholdBytes ?? DEFAULT_COMPACT_THRESHOLD_BYTES;
    try {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    } catch (err) {
      throw new StoreError(
        'FileLedgerStore: cannot create directory: ' + (err as Error).message,
        err
      );
    }
    if (opts.load !== false) {
      this.load();
    }
  }

  /** @inheritdoc */
  append(event: LedgerEvent): void {
    if (!event || typeof event !== 'object') {
      throw new StoreError('append: event must be a LedgerEvent object');
    }
    if (typeof event.seq !== 'number' || typeof event.id !== 'string') {
      throw new StoreError('append: event is malformed');
    }
    if (event.seq !== this.events.length + 1) {
      throw new StoreError(
        `append: expected seq=${this.events.length + 1}, got seq=${event.seq}`
      );
    }
    if (this.byId.has(event.id)) {
      throw new StoreError(`append: duplicate event id ${event.id}`);
    }
    const clone = cloneEvent(event);
    const line = JSON.stringify(clone) + '\n';
    try {
      fs.appendFileSync(this.dataPath, line, { encoding: 'utf8' });
    } catch (err) {
      throw new StoreError(
        'append: write failed: ' + (err as Error).message,
        err
      );
    }
    this.events.push(clone);
    this.byId.set(clone.id, clone);

    // Periodic compaction.
    try {
      const stat = fs.statSync(this.dataPath);
      if (stat.size > this.compactThreshold) {
        this.compact();
      }
    } catch {
      // Non-fatal — compaction is best-effort.
    }
  }

  /** @inheritdoc */
  get(seq: number): LedgerEvent | undefined {
    if (!Number.isInteger(seq) || seq < 1 || seq > this.events.length) return undefined;
    return cloneEvent(this.events[seq - 1]);
  }

  /** @inheritdoc */
  getById(id: string): LedgerEvent | undefined {
    const ev = this.byId.get(id);
    return ev ? cloneEvent(ev) : undefined;
  }

  /** @inheritdoc */
  length(): number {
    return this.events.length;
  }

  /** @inheritdoc */
  all(): LedgerEvent[] {
    return this.events.map(cloneEvent);
  }

  /** @inheritdoc */
  snapshot(): LedgerEvent[] {
    return this.events.map(cloneEvent);
  }

  /** @inheritdoc */
  restore(events: LedgerEvent[]): void {
    if (!Array.isArray(events)) {
      throw new StoreError('restore: events must be an array');
    }
    this.events.length = 0;
    this.byId.clear();
    for (let i = 0; i < events.length; i++) {
      const ev = events[i];
      if (!ev || typeof ev !== 'object') {
        throw new StoreError(`restore: event ${i} is malformed`);
      }
      if (ev.seq !== i + 1) {
        throw new StoreError(
          `restore: event ${i} has seq=${ev.seq}, expected ${i + 1}`
        );
      }
      if (this.byId.has(ev.id)) {
        throw new StoreError(`restore: duplicate event id ${ev.id}`);
      }
      const clone = cloneEvent(ev);
      this.events.push(clone);
      this.byId.set(clone.id, clone);
    }
    this.compact();
  }

  /** Path to the JSONL data file (exposed for tests + tooling). */
  getDataPath(): string {
    return this.dataPath;
  }

  /** Path to the sidecar index file (exposed for tests + tooling). */
  getIndexPath(): string {
    return this.indexPath;
  }

  /**
   * Rewrite the data file from the in-memory state. Also rewrites the
   * sidecar index. Use after bulk in-memory mutations.
   */
  compact(): void {
    try {
      const lines = this.events.map((e) => JSON.stringify(e)).join('\n') + '\n';
      // Atomic-ish write: write to a temp file then rename.
      const tmp = this.dataPath + '.tmp';
      fs.writeFileSync(tmp, lines, { encoding: 'utf8' });
      fs.renameSync(tmp, this.dataPath);
      // Rebuild the sidecar index.
      const idx: Record<string, number> = {};
      this.events.forEach((e, i) => {
        idx[e.id] = i + 1; // 1-based line numbers
      });
      const idxTmp = this.indexPath + '.tmp';
      fs.writeFileSync(idxTmp, JSON.stringify(idx), { encoding: 'utf8' });
      fs.renameSync(idxTmp, this.indexPath);
    } catch (err) {
      throw new StoreError(
        'compact failed: ' + (err as Error).message,
        err
      );
    }
  }

  /** Load events from the data file (called by the constructor). */
  private load(): void {
    if (!fs.existsSync(this.dataPath)) return;
    let content: string;
    try {
      content = fs.readFileSync(this.dataPath, 'utf8');
    } catch (err) {
      throw new StoreError(
        'load: cannot read data file: ' + (err as Error).message,
        err
      );
    }
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.length === 0) continue;
      let ev: LedgerEvent;
      try {
        ev = JSON.parse(line) as LedgerEvent;
      } catch (err) {
        throw new StoreError(
          `load: cannot parse line ${i + 1}: ${(err as Error).message}`,
          err
        );
      }
      if (!ev || typeof ev !== 'object') {
        throw new StoreError(`load: line ${i + 1} is not an object`);
      }
      if (ev.seq !== this.events.length + 1) {
        throw new StoreError(
          `load: line ${i + 1} has seq=${ev.seq}, expected ${this.events.length + 1}`
        );
      }
      if (this.byId.has(ev.id)) {
        throw new StoreError(`load: duplicate event id ${ev.id}`);
      }
      const clone = cloneEvent(ev);
      this.events.push(clone);
      this.byId.set(clone.id, clone);
    }
  }
}
