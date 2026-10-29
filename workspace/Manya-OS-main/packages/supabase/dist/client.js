"use strict";
/**
 * @manya-os/supabase — Supabase client factory.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupabaseClientFacade = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const errors_js_1 = require("./errors.js");
const runner_js_1 = require("./migrations/runner.js");
const postgres_executor_js_1 = require("./migrations/postgres-executor.js");
/** Wrapper around SupabaseClient with lifecycle management. */
class SupabaseClientFacade {
    config;
    logger;
    client;
    disposed = false;
    timeoutId;
    initialization;
    ownedMigrationExecutor;
    constructor(config, logger) {
        this.config = config;
        this.logger = logger;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), config.timeoutMs);
        this.client = (0, supabase_js_1.createClient)(config.url, config.serviceRoleKey, {
            auth: { autoRefreshToken: false, persistSession: false },
            db: { schema: 'public' },
            global: {
                headers: { 'x-manya-client': '@manya-os/supabase' },
                fetch: (url, init) => {
                    const signal = init?.signal
                        ? AbortSignal.any([init.signal, controller.signal])
                        : controller.signal;
                    return fetch(url, { ...init, signal });
                },
            },
        });
        this.timeoutId = timeoutId;
        this.logger.info('Supabase client created', { url: config.url });
        this.ownedMigrationExecutor = !config.migrateOnStart || config.migrationExecutor || !config.databaseUrl
            ? undefined
            : new postgres_executor_js_1.PostgresMigrationExecutor(config.databaseUrl);
        this.initialization = config.migrateOnStart
            ? this.initializeMigrations()
            : Promise.resolve();
    }
    async initializeMigrations() {
        const runner = new runner_js_1.MigrationRunner(this.client, this.logger, this.config.migrationDir, this.config.migrationExecutor ?? this.ownedMigrationExecutor);
        const results = await runner.runPending();
        const failed = results.find((result) => !result.applied);
        if (failed) {
            throw new errors_js_1.ConnectionError(`Migration ${failed.version} (${failed.name}) failed: ${failed.error ?? 'unknown error'}`);
        }
        this.logger.info('Supabase migrations initialized', { applied: results.length });
    }
    /** Wait for optional startup migrations to finish. */
    async ready() {
        if (this.disposed)
            throw new errors_js_1.ConnectionError('Client has been disposed');
        await this.initialization;
    }
    /** Get the underlying Supabase client. */
    getClient() {
        if (this.disposed) {
            throw new errors_js_1.ConnectionError('Client has been disposed');
        }
        return this.client;
    }
    /** Verify connectivity by running a lightweight query. */
    async ping() {
        if (this.disposed)
            return false;
        try {
            const pingSignal = AbortSignal.timeout(Math.min(this.config.timeoutMs, 1000));
            const pingClient = (0, supabase_js_1.createClient)(this.config.url, this.config.serviceRoleKey, {
                auth: { autoRefreshToken: false, persistSession: false },
                db: { schema: 'public' },
                global: {
                    headers: { 'x-manya-client': '@manya-os/supabase' },
                    fetch: (url, init) => fetch(url, { ...init, signal: pingSignal }),
                },
            });
            return await Promise.race([
                (async () => {
                    const { error } = await pingClient
                        .from('pg_catalog')
                        .select('1')
                        .limit(1)
                        .maybeSingle();
                    // pg_catalog may not be accessible via PostgREST; fallback to raw
                    if (error) {
                        // Try a simple RPC call instead
                        const { error: rpcError } = await pingClient.rpc('version');
                        return !rpcError;
                    }
                    return true;
                })(),
                new Promise((resolve) => setTimeout(() => resolve(false), 1500)),
            ]);
        }
        catch {
            return false;
        }
    }
    /** Dispose of the client. */
    dispose() {
        if (!this.disposed) {
            this.disposed = true;
            if (this.timeoutId) {
                clearTimeout(this.timeoutId);
                this.timeoutId = undefined;
            }
            if (this.ownedMigrationExecutor) {
                void this.ownedMigrationExecutor.close();
            }
            this.logger.info('Supabase client disposed');
        }
    }
}
exports.SupabaseClientFacade = SupabaseClientFacade;
//# sourceMappingURL=client.js.map