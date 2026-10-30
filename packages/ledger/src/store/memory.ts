/**
 * @manya-os/ledger — in-memory ledger store (array-backed).
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Conceived, directed, and owned by Uviwe Menyiwe (Azura Daemon), founder
 * of the Manya Hael Foundation.
 *
 * Licensed under the Apache License, Version 2.0.
 */

import { StoreError } from '../errors.js';
import type { LedgerEvent } from '../types.js';
import type { LedgerStore } from './store.js';

/**
 * An in-memory {@link LedgerStore} backed by a plain array.
 *
 * Events are stored as deep clones (via JSON round-trip) so callers cannot
 * mutate the store's internal state by holding references to appended events.
 */
export class InMemoryLedgerStore implements LedgerStore {
  private readonly events: LedgerEvent[] = [];
  private readonly byId: Map<string, LedgerEvent> = new Map();

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
    this.events.push(clone);
    this.byId.set(clone.id, clone);
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
  }
}

/**
 * Deep-clone a ledger event via JSON round-trip.
 *
 * The payload / metadata must be JSON-serializable (this is enforced by
 * {@link createEvent}); JSON clone is therefore sufficient and avoids the
 * complexity of a structured-clone polyfill.
 *
 * @internal
 */
export function cloneEvent(event: LedgerEvent): LedgerEvent {
  try {
    return JSON.parse(JSON.stringify(event)) as LedgerEvent;
  } catch (err) {
    throw new StoreError(
      'cloneEvent: event is not JSON-serializable: ' + (err as Error).message,
      err
    );
  }
}
