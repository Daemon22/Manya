/**
 * @manya-os/memory — episodic memory (timestamped events).
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import type { EpisodicEvent } from '../types.js';
import { EpisodicMemoryError } from '../errors.js';
import { randomId } from '../longterm/keys.js';

export class EpisodicMemory {
  private readonly events: EpisodicEvent[] = [];
  private readonly maxCount: number;

  constructor(maxCount: number = 10_000) {
    if (maxCount < 1) throw new EpisodicMemoryError('maxCount must be positive');
    this.maxCount = maxCount;
  }

  /** Record an event. Returns the event id. */
  record(agent: string, event: string, context?: Record<string, unknown>, opts?: { importance?: number; tags?: string[]; source?: string; id?: string; timestamp?: number }): string {
    if (!agent) throw new EpisodicMemoryError('agent is required');
    if (!event) throw new EpisodicMemoryError('event is required');
    const id = opts?.id ?? randomId('ep');
    const e: EpisodicEvent = {
      id, timestamp: opts?.timestamp ?? Date.now(), agent, event,
      context, importance: opts?.importance ?? 0.5,
      tags: opts?.tags, source: opts?.source,
    };
    // If id already exists, replace; otherwise push.
    const existingIdx = this.events.findIndex(ev => ev.id === id);
    if (existingIdx >= 0) this.events[existingIdx] = e;
    else {
      this.events.push(e);
      if (this.events.length > this.maxCount) this.events.shift();
    }
    return id;
  }

  /** Recall the last N events. */
  recall(limit: number = 10, agentFilter?: string): EpisodicEvent[] {
    const filtered = agentFilter ? this.events.filter(e => e.agent === agentFilter) : this.events;
    return filtered.slice(-limit);
  }

  /** Recall events in a time range. */
  recallRange(startMs: number, endMs: number, limit: number = 100): EpisodicEvent[] {
    return this.events.filter(e => e.timestamp >= startMs && e.timestamp <= endMs).slice(-limit);
  }

  /** Find events matching a substring (case-insensitive). */
  search(query: string, limit: number = 20): EpisodicEvent[] {
    const q = query.toLowerCase();
    return this.events.filter(e => e.event.toLowerCase().includes(q) ||
      (e.context && JSON.stringify(e.context).toLowerCase().includes(q)))
      .slice(-limit);
  }

  /** Find by tag. */
  findByTag(tag: string): EpisodicEvent[] {
    return this.events.filter(e => e.tags?.includes(tag));
  }

  /** Find by id. */
  findById(id: string): EpisodicEvent | undefined {
    return this.events.find(e => e.id === id);
  }

  /** Get all events (read-only). */
  all(): EpisodicEvent[] {
    return [...this.events];
  }

  /** Count events. */
  count(): number { return this.events.length; }

  /** Delete events older than cutoff. Returns count removed. */
  pruneOlderThan(cutoffMs: number): number {
    const before = this.events.length;
    const kept = this.events.filter(e => e.timestamp >= cutoffMs);
    const removed = before - kept.length;
    // Mutate in place to preserve array identity for external references.
    this.events.length = 0;
    this.events.push(...kept);
    return removed;
  }

  /** Prune low-importance events when over a count threshold. */
  pruneLowImportance(threshold: number = 0.3, maxCount?: number): number {
    const cap = maxCount ?? this.maxCount;
    if (this.events.length <= cap) return 0;
    const before = this.events.length;
    const kept = this.events.filter(e => (e.importance ?? 0) >= threshold);
    // Always keep the most recent 100 regardless of importance.
    const recent = this.events.slice(-100);
    const seen = new Set(recent.map(e => e.id));
    for (const e of kept) if (!seen.has(e.id)) seen.add(e.id);
    const final = this.events.filter(e => seen.has(e.id));
    this.events.length = 0;
    this.events.push(...final);
    return before - this.events.length;
  }
}
