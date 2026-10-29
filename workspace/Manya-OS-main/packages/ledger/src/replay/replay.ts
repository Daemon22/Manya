/**
 * @manya-os/ledger — event replayer + projections.
 *
 * Replays a sequence of ledger events through a filter, optionally folding
 * them through a reducer to build a projection.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Conceived, directed, and owned by Uviwe Menyiwe (Azura Daemon), founder
 * of the Manya Hael Foundation.
 *
 * Licensed under the Apache License, Version 2.0.
 */

import { ReplayError } from '../errors.js';
import type { LedgerEvent } from '../types.js';

/** Filter options for {@link EventReplayer.replay} / {@link EventReplayer.project}. */
export interface ReplayFilter {
  /** 1-based starting sequence (inclusive). */
  fromSeq?: number;
  /** 1-based ending sequence (inclusive). */
  toSeq?: number;
  /** ISO-8601 starting timestamp (inclusive). */
  fromTime?: string | number;
  /** ISO-8601 ending timestamp (inclusive). */
  toTime?: string | number;
  /** Event type filter (exact match). */
  type?: string;
  /** Actor filter (exact match). */
  actor?: string;
}

/**
 * Replay events from a chain (or any array of events) through a filter.
 *
 * Supports range filters (by `seq` and by `timestamp`), equality filters
 * (by `type` and `actor`), and projections (via {@link project}).
 */
export class EventReplayer {
  /**
   * @param events - The events to replay. The replayer does NOT take ownership
   *                 of the array (it iterates lazily) — pass a snapshot if
   *                 the underlying store may mutate during replay.
   */
  constructor(private readonly events: LedgerEvent[] | Iterable<LedgerEvent>) {
    if (events === null || events === undefined) {
      throw new ReplayError('EventReplayer: events are required');
    }
  }

  /**
   * Iterate over events matching `filter`. Returns an iterable suitable for
   * `for...of` loops or spread into an array.
   *
   * @param filter - Optional filter.
   * @returns An iterable of matching events.
   */
  *replay(filter: ReplayFilter = {}): IterableIterator<LedgerEvent> {
    const fromSeq = filter.fromSeq ?? 1;
    const toSeq = filter.toSeq ?? Number.MAX_SAFE_INTEGER;
    if (!Number.isInteger(fromSeq) || fromSeq < 1) {
      throw new ReplayError(`replay: fromSeq must be a positive integer, got ${fromSeq}`);
    }
    if (!Number.isInteger(toSeq) || toSeq < fromSeq) {
      throw new ReplayError(
        `replay: toSeq must be >= fromSeq (${fromSeq}), got ${toSeq}`
      );
    }
    const fromTimeMs = filter.fromTime !== undefined ? parseTime(filter.fromTime) : -Infinity;
    const toTimeMs = filter.toTime !== undefined ? parseTime(filter.toTime) : Infinity;
    if (Number.isNaN(fromTimeMs)) {
      throw new ReplayError('replay: fromTime is not a valid timestamp');
    }
    if (Number.isNaN(toTimeMs)) {
      throw new ReplayError('replay: toTime is not a valid timestamp');
    }
    for (const ev of this.events) {
      if (ev.seq < fromSeq || ev.seq > toSeq) continue;
      if (filter.type !== undefined && ev.type !== filter.type) continue;
      if (filter.actor !== undefined && ev.actor !== filter.actor) continue;
      const tsMs = Date.parse(ev.timestamp);
      if (Number.isNaN(tsMs)) continue;
      if (tsMs < fromTimeMs || tsMs > toTimeMs) continue;
      yield ev;
    }
  }

  /**
   * Fold matching events through `reducer` to build a projection.
   *
   * @param reducer - Folding function `(state, event) => newState`.
   * @param initialState - Initial state passed to the first reducer call.
   * @param filter - Optional filter applied before folding.
   * @returns The final state.
   */
  project<S>(
    reducer: (state: S, event: LedgerEvent) => S,
    initialState: S,
    filter: ReplayFilter = {}
  ): S {
    if (typeof reducer !== 'function') {
      throw new ReplayError('project: reducer must be a function');
    }
    let state = initialState;
    for (const ev of this.replay(filter)) {
      try {
        state = reducer(state, ev);
      } catch (err) {
        throw new ReplayError(
          'project: reducer threw at seq=' + ev.seq + ': ' + (err as Error).message,
          err
        );
      }
    }
    return state;
  }
}

/**
 * Parse an ISO-8601 string or epoch-millis number into epoch-millis.
 * @internal
 */
function parseTime(t: string | number): number {
  if (typeof t === 'number') return t;
  return Date.parse(t);
}
