/**
 * @manya-os/supabase — Supabase-backed SessionStore.
 *
 * Implements the @manya-os/attest SessionStore interface against
 * a Postgres/Supabase database. Provides durable session persistence
 * with automatic expiry pruning.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { SessionRecord } from '@manya-os/attest';
import type { Logger } from '../logging.js';
import type { ResolvedConfig } from '../config.js';
/**
 * Supabase-backed session store for @manya-os/attest.
 *
 * Implements the SessionStore interface from @manya-os/attest.
 * All operations use parameterized queries via the Supabase client
 * and are wrapped with retry logic for transient errors.
 */
export declare class SupabaseSessionStore {
    private readonly client;
    private readonly table;
    private readonly logger;
    private readonly retryConfig;
    constructor(client: SupabaseClient, config: ResolvedConfig, logger: Logger);
    /** Look up a session record by token. Returns null if absent. */
    get(token: string): Promise<SessionRecord | null>;
    /** Store a session record. Overwrites any existing record for the same token. */
    put(record: SessionRecord): Promise<void>;
    /** Delete a session record by token. Returns true if a record was deleted. */
    delete(token: string): Promise<boolean>;
    /** List all currently-stored records. */
    list(): Promise<SessionRecord[]>;
    /** Delete all expired sessions. Returns count of deleted records. */
    pruneExpired(): Promise<number>;
}
//# sourceMappingURL=supabase-session-store.d.ts.map