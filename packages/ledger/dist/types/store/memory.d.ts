/**
 * @manya-os/ledger — in-memory ledger store (array-backed).
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Conceived, directed, and owned by Uviwe Menyiwe (Azura Daemon), founder
 * of the Manya Hael Foundation.
 *
 * Licensed under the Apache License, Version 2.0.
 */
import type { LedgerEvent } from '../types.js';
import type { LedgerStore } from './store.js';
/**
 * An in-memory {@link LedgerStore} backed by a plain array.
 *
 * Events are stored as deep clones (via JSON round-trip) so callers cannot
 * mutate the store's internal state by holding references to appended events.
 */
export declare class InMemoryLedgerStore implements LedgerStore {
    private readonly events;
    private readonly byId;
    /** @inheritdoc */
    append(event: LedgerEvent): void;
    /** @inheritdoc */
    get(seq: number): LedgerEvent | undefined;
    /** @inheritdoc */
    getById(id: string): LedgerEvent | undefined;
    /** @inheritdoc */
    length(): number;
    /** @inheritdoc */
    all(): LedgerEvent[];
    /** @inheritdoc */
    snapshot(): LedgerEvent[];
    /** @inheritdoc */
    restore(events: LedgerEvent[]): void;
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
export declare function cloneEvent(event: LedgerEvent): LedgerEvent;
//# sourceMappingURL=memory.d.ts.map