/**
 * @manya-os/supabase — Supabase-backed LedgerStore.
 *
 * Implements the @manya-os/ledger LedgerStore interface against
 * a Postgres/Supabase database. Append-only with full chain query support.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { LedgerEvent } from '@manya-os/ledger';
import type { Logger } from '../logging.js';
import type { ResolvedConfig } from '../config.js';
/**
 * Supabase-backed append-only ledger store.
 *
 * Implements the LedgerStore interface from @manya-os/ledger.
 * All writes use INSERT (append-only). No UPDATE or DELETE operations
 * are performed — the database RLS policy enforces this at the DB level.
 */
export declare class SupabaseLedgerStore {
    private readonly client;
    private readonly table;
    private readonly logger;
    private readonly timeoutMs;
    private readonly retryConfig;
    constructor(client: SupabaseClient, config: ResolvedConfig, logger: Logger);
    /** Append an event to the store. */
    append(event: LedgerEvent): Promise<void>;
    /** Get the event at 1-based sequence number. */
    get(seq: number): Promise<LedgerEvent | undefined>;
    /** Get the event with the given ID. */
    getById(id: string): Promise<LedgerEvent | undefined>;
    /** Number of events in the store. */
    length(): Promise<number>;
    /** All events in chain order. */
    all(): Promise<LedgerEvent[]>;
    /** A deep copy of all events (for snapshotting). */
    snapshot(): Promise<LedgerEvent[]>;
    /** Replace the store's contents with the given events. */
    restore(events: LedgerEvent[]): Promise<void>;
}
//# sourceMappingURL=supabase-ledger-store.d.ts.map