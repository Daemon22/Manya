/**
 * @manya-os/supabase — Supabase client factory.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { ResolvedConfig } from './config.js';
import type { Logger } from './logging.js';
import { ConnectionError } from './errors.js';
import { MigrationRunner } from './migrations/runner.js';
import { PostgresMigrationExecutor } from './migrations/postgres-executor.js';

/** Wrapper around SupabaseClient with lifecycle management. */
export class SupabaseClientFacade {
  private client: SupabaseClient;
  private disposed = false;
  private timeoutId: ReturnType<typeof setTimeout> | undefined;
  private readonly initialization: Promise<void>;
  private readonly ownedMigrationExecutor?: PostgresMigrationExecutor;

  constructor(
    private readonly config: ResolvedConfig,
    private readonly logger: Logger,
  ) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeoutMs);

    this.client = createClient(config.url, config.serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      db: { schema: 'public' },
      global: {
        headers: { 'x-manya-client': '@manya-os/supabase' },
        fetch: (url: string | URL | Request, init?: RequestInit) => {
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
      : new PostgresMigrationExecutor(config.databaseUrl);
    this.initialization = config.migrateOnStart
      ? this.initializeMigrations()
      : Promise.resolve();
  }

  private async initializeMigrations(): Promise<void> {
    const runner = new MigrationRunner(
      this.client,
      this.logger,
      this.config.migrationDir,
      this.config.migrationExecutor ?? this.ownedMigrationExecutor,
    );
    const results = await runner.runPending();
    const failed = results.find((result) => !result.applied);
    if (failed) {
      throw new ConnectionError(
        `Migration ${failed.version} (${failed.name}) failed: ${failed.error ?? 'unknown error'}`,
      );
    }
    this.logger.info('Supabase migrations initialized', { applied: results.length });
  }

  /** Wait for optional startup migrations to finish. */
  async ready(): Promise<void> {
    if (this.disposed) throw new ConnectionError('Client has been disposed');
    await this.initialization;
  }

  /** Get the underlying Supabase client. */
  getClient(): SupabaseClient {
    if (this.disposed) {
      throw new ConnectionError('Client has been disposed');
    }
    return this.client;
  }

  /** Verify connectivity by running a lightweight query. */
  async ping(): Promise<boolean> {
    if (this.disposed) return false;
    try {
      const pingSignal = AbortSignal.timeout(Math.min(this.config.timeoutMs, 1000));
      const pingClient = createClient(this.config.url, this.config.serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
        db: { schema: 'public' },
        global: {
          headers: { 'x-manya-client': '@manya-os/supabase' },
          fetch: (url: string | URL | Request, init?: RequestInit) => fetch(url, { ...init, signal: pingSignal }),
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
        new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 1500)),
      ]);
    } catch {
      return false;
    }
  }

  /** Dispose of the client. */
  dispose(): void {
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
