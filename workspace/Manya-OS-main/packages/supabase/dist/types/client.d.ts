/**
 * @manya-os/supabase — Supabase client factory.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
import { type SupabaseClient } from '@supabase/supabase-js';
import type { ResolvedConfig } from './config.js';
import type { Logger } from './logging.js';
/** Wrapper around SupabaseClient with lifecycle management. */
export declare class SupabaseClientFacade {
    private readonly config;
    private readonly logger;
    private client;
    private disposed;
    private timeoutId;
    private readonly initialization;
    private readonly ownedMigrationExecutor?;
    constructor(config: ResolvedConfig, logger: Logger);
    private initializeMigrations;
    /** Wait for optional startup migrations to finish. */
    ready(): Promise<void>;
    /** Get the underlying Supabase client. */
    getClient(): SupabaseClient;
    /** Verify connectivity by running a lightweight query. */
    ping(): Promise<boolean>;
    /** Dispose of the client. */
    dispose(): void;
}
//# sourceMappingURL=client.d.ts.map