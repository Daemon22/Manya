/**
 * @manya-os/attest — session store interface + in-memory implementation.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
import type { SessionRecord } from '../types.js';
/**
 * Persistent session store. Implementations may be in-memory, file-backed,
 * Redis-backed, etc.
 *
 * All keys are opaque session tokens (strings). Implementations MUST be
 * safe to call from multiple async callers; they need NOT be safe to call
 * from multiple processes (use a distributed store for that).
 */
export interface SessionStore {
    /** Look up a session record by token. Returns `null` if absent. */
    get(token: string): Promise<SessionRecord | null>;
    /** Store a session record. Overwrites any existing record for the same token. */
    put(record: SessionRecord): Promise<void>;
    /** Delete a session record by token. Returns `true` if a record was deleted. */
    delete(token: string): Promise<boolean>;
    /** List all currently-stored records (for diagnostics / cleanup). */
    list(): Promise<SessionRecord[]>;
}
/**
 * In-memory {@link SessionStore} backed by a `Map`.
 *
 * Defensive copies are made on `put` and `get` so callers cannot mutate the
 * stored records by holding on to the returned references.
 */
export declare class InMemorySessionStore implements SessionStore {
    private readonly records;
    /** @inheritdoc */
    get(token: string): Promise<SessionRecord | null>;
    /** @inheritdoc */
    put(record: SessionRecord): Promise<void>;
    /** @inheritdoc */
    delete(token: string): Promise<boolean>;
    /** @inheritdoc */
    list(): Promise<SessionRecord[]>;
    /** Clear all records (useful in tests). */
    clear(): void;
}
//# sourceMappingURL=store.d.ts.map