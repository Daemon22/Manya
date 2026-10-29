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
export declare class EventReplayer {
    private readonly events;
    /**
     * @param events - The events to replay. The replayer does NOT take ownership
     *                 of the array (it iterates lazily) — pass a snapshot if
     *                 the underlying store may mutate during replay.
     */
    constructor(events: LedgerEvent[] | Iterable<LedgerEvent>);
    /**
     * Iterate over events matching `filter`. Returns an iterable suitable for
     * `for...of` loops or spread into an array.
     *
     * @param filter - Optional filter.
     * @returns An iterable of matching events.
     */
    replay(filter?: ReplayFilter): IterableIterator<LedgerEvent>;
    /**
     * Fold matching events through `reducer` to build a projection.
     *
     * @param reducer - Folding function `(state, event) => newState`.
     * @param initialState - Initial state passed to the first reducer call.
     * @param filter - Optional filter applied before folding.
     * @returns The final state.
     */
    project<S>(reducer: (state: S, event: LedgerEvent) => S, initialState: S, filter?: ReplayFilter): S;
}
//# sourceMappingURL=replay.d.ts.map