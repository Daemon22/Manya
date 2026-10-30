/**
 * @manya-os/memory — working memory (short-TTL scratchpad).
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import type { WorkingMemoryEntry } from '../types.js';
import { WorkingMemoryError } from '../errors.js';
import { randomId } from '../longterm/keys.js';

export class WorkingMemory {
  private readonly store = new Map<string, WorkingMemoryEntry>();
  private sweeper: NodeJS.Timeout | null = null;

  constructor(private readonly defaultTtlMs: number = 5 * 60 * 1000) {
    // Auto-sweep every 30 seconds in Node runtimes.
    if (typeof setInterval === 'function' && typeof process !== 'undefined' && process.versions?.node) {
      this.sweeper = setInterval(() => this.sweep(), 30_000);
      if (this.sweeper && typeof this.sweeper.unref === 'function') this.sweeper.unref();
    }
  }

  /** Store a value with optional TTL. Returns the entry id. */
  set(key: string, value: unknown, ttlMs?: number, tags?: string[]): string {
    if (!key || typeof key !== 'string') throw new WorkingMemoryError('key must be non-empty string');
    const id = randomId('wk');
    const entry: WorkingMemoryEntry = {
      id, key, value,
      createdAt: Date.now(),
      ttlMs: ttlMs ?? this.defaultTtlMs,
      tags,
    };
    this.store.set(key, entry);
    return id;
  }

  /** Retrieve a value. Returns null if missing or expired. */
  get(key: string): unknown | null {
    const e = this.store.get(key);
    if (!e) return null;
    if (this.isExpired(e)) {
      this.store.delete(key);
      return null;
    }
    return e.value;
  }

  /** Get the full entry (including metadata). */
  getEntry(key: string): WorkingMemoryEntry | null {
    const e = this.store.get(key);
    if (!e) return null;
    if (this.isExpired(e)) {
      this.store.delete(key);
      return null;
    }
    return e;
  }

  /** Check if a key exists (and is not expired). */
  has(key: string): boolean {
    const e = this.store.get(key);
    if (!e) return false;
    if (this.isExpired(e)) { this.store.delete(key); return false; }
    return true;
  }

  /** Delete a key. */
  delete(key: string): boolean {
    return this.store.delete(key);
  }

  /** Clear all working memory. */
  clear(): void {
    this.store.clear();
  }

  /** Number of non-expired entries. */
  size(): number {
    this.sweep();
    return this.store.size;
  }

  /** Iterate non-expired entries. */
  entries(): WorkingMemoryEntry[] {
    this.sweep();
    return Array.from(this.store.values());
  }

  /** Find entries by tag. */
  findByTag(tag: string): WorkingMemoryEntry[] {
    return this.entries().filter(e => e.tags?.includes(tag));
  }

  /** Stop the sweeper. */
  dispose(): void {
    if (this.sweeper) { clearInterval(this.sweeper); this.sweeper = null; }
  }

  private isExpired(e: WorkingMemoryEntry): boolean {
    if (!e.ttlMs) return false;
    return Date.now() - e.createdAt > e.ttlMs;
  }

  /** Remove expired entries. Returns count removed. */
  sweep(): number {
    let removed = 0;
    for (const [k, e] of this.store) {
      if (this.isExpired(e)) { this.store.delete(k); removed++; }
    }
    return removed;
  }
}
