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
import type { AttestSessionRow } from '../types.js';
import { classifyError } from '../errors.js';
import { withRetry } from '../retry.js';

/** Row → SessionRecord mapping. */
function toSession(row: AttestSessionRow): SessionRecord {
  return {
    token: row.token,
    sessionId: row.session_id,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    fingerprint: row.fingerprint as unknown as string,
    identity: row.identity ?? '',
    trustScore: row.trust_score ?? 0,
    ...(row.bound_nonce ? { boundNonce: row.bound_nonce } : {}),
  };
}

/** SessionRecord → Row mapping. */
function toRow(record: SessionRecord): Record<string, unknown> {
  return {
    token: record.token,
    session_id: record.sessionId,
    created_at: record.createdAt,
    expires_at: record.expiresAt,
    fingerprint: record.fingerprint,
    identity: record.identity ?? null,
    trust_score: record.trustScore ?? null,
    bound_nonce: record.boundNonce ?? '',
  };
}

/**
 * Supabase-backed session store for @manya-os/attest.
 *
 * Implements the SessionStore interface from @manya-os/attest.
 * All operations use parameterized queries via the Supabase client
 * and are wrapped with retry logic for transient errors.
 */
export class SupabaseSessionStore {
  private readonly table: string;
  private readonly logger: Logger;
  private readonly retryConfig: ResolvedConfig['retry'];

  constructor(
    private readonly client: SupabaseClient,
    config: ResolvedConfig,
    logger: Logger,
  ) {
    this.table = config.tables.attestSessions;
    this.logger = logger;
    this.retryConfig = config.retry;
  }

  /** Look up a session record by token. Returns null if absent. */
  async get(token: string): Promise<SessionRecord | null> {
    return withRetry(async () => {
      const { data, error } = await this.client
        .from(this.table)
        .select('*')
        .eq('token', token)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw classifyError(error);
      }

      return toSession(data as AttestSessionRow);
    }, this.retryConfig, this.logger, 'session get');
  }

  /** Store a session record. Overwrites any existing record for the same token. */
  async put(record: SessionRecord): Promise<void> {
    await withRetry(async () => {
      const { error } = await this.client
        .from(this.table)
        .upsert(toRow(record), { onConflict: 'token' });

      if (error) {
        this.logger.error('session put failed', {
          token: record.token,
          error: error.message,
        });
        throw classifyError(error);
      }

      this.logger.debug('session stored', { token: record.token });
    }, this.retryConfig, this.logger, 'session put');
  }

  /** Delete a session record by token. Returns true if a record was deleted. */
  async delete(token: string): Promise<boolean> {
    return withRetry(async () => {
      const { error, count } = await this.client
        .from(this.table)
        .delete({ count: 'exact' })
        .eq('token', token);

      if (error) throw classifyError(error);
      return (count ?? 0) > 0;
    }, this.retryConfig, this.logger, 'session delete');
  }

  /** List all currently-stored records. */
  async list(): Promise<SessionRecord[]> {
    return withRetry(async () => {
      const { data, error } = await this.client
        .from(this.table)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw classifyError(error);
      return (data as AttestSessionRow[]).map(toSession);
    }, this.retryConfig, this.logger, 'session list');
  }

  /** Delete all expired sessions. Returns count of deleted records. */
  async pruneExpired(): Promise<number> {
    return withRetry(async () => {
      const now = new Date().toISOString();
      const { error, count } = await this.client
        .from(this.table)
        .delete({ count: 'exact' })
        .lt('expires_at', now);

      if (error) throw classifyError(error);
      const deleted = count ?? 0;
      if (deleted > 0) {
        this.logger.info('expired sessions pruned', { count: deleted });
      }
      return deleted;
    }, this.retryConfig, this.logger, 'session prune');
  }
}
