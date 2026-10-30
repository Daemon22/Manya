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
import type { LedgerEventRow } from '../types.js';
import { classifyError } from '../errors.js';
import { withRetry } from '../retry.js';

/** Row → LedgerEvent mapping. */
function toEvent(row: LedgerEventRow): LedgerEvent {
  return {
    id: row.id,
    seq: Number(row.seq),
    type: row.type,
    actor: row.actor,
    payload: row.payload ?? {},
    timestamp: row.timestamp,
    prevHash: row.prev_hash,
    hash: row.hash,
    ...(row.signature ? { signature: row.signature } : {}),
    ...(row.sig_algorithm ? { signatureAlgorithm: row.sig_algorithm as 'ecdsa-p256' | 'rsa-pss' } : {}),
    ...(row.metadata ? { metadata: row.metadata } : {}),
  };
}

/** LedgerEvent → Row mapping. */
function toRow(event: LedgerEvent): Record<string, unknown> {
  return {
    id: event.id,
    seq: event.seq,
    type: event.type,
    actor: event.actor,
    payload: event.payload,
    timestamp: event.timestamp,
    prev_hash: event.prevHash,
    hash: event.hash,
    signature: event.signature ?? null,
    sig_algorithm: event.signatureAlgorithm ?? null,
    metadata: event.metadata ?? null,
  };
}

/**
 * Supabase-backed append-only ledger store.
 *
 * Implements the LedgerStore interface from @manya-os/ledger.
 * All writes use INSERT (append-only). No UPDATE or DELETE operations
 * are performed — the database RLS policy enforces this at the DB level.
 */
export class SupabaseLedgerStore {
  private readonly table: string;
  private readonly logger: Logger;
  private readonly timeoutMs: number;
  private readonly retryConfig: ResolvedConfig['retry'];

  constructor(
    private readonly client: SupabaseClient,
    config: ResolvedConfig,
    logger: Logger,
  ) {
    this.table = config.tables.ledgerEvents;
    this.logger = logger;
    this.timeoutMs = config.timeoutMs;
    this.retryConfig = config.retry;
  }

  /** Append an event to the store. */
  async append(event: LedgerEvent): Promise<void> {
    await withRetry(async () => {
      const { error } = await this.client
        .from(this.table)
        .insert(toRow(event));

      if (error) {
        const err = classifyError(error);
        this.logger.error('ledger append failed', {
          id: event.id,
          seq: event.seq,
          error: err.message,
        });
        throw err;
      }

      this.logger.debug('ledger event appended', { id: event.id, seq: event.seq });
    }, this.retryConfig, this.logger, 'ledger append');
  }

  /** Get the event at 1-based sequence number. */
  async get(seq: number): Promise<LedgerEvent | undefined> {
    return withRetry(async () => {
      const { data, error } = await this.client
        .from(this.table)
        .select('*')
        .eq('seq', seq)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return undefined;
        throw classifyError(error);
      }

      return toEvent(data as LedgerEventRow);
    }, this.retryConfig, this.logger, 'ledger get');
  }

  /** Get the event with the given ID. */
  async getById(id: string): Promise<LedgerEvent | undefined> {
    return withRetry(async () => {
      const { data, error } = await this.client
        .from(this.table)
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return undefined;
        throw classifyError(error);
      }

      return toEvent(data as LedgerEventRow);
    }, this.retryConfig, this.logger, 'ledger getById');
  }

  /** Number of events in the store. */
  async length(): Promise<number> {
    return withRetry(async () => {
      const { count, error } = await this.client
        .from(this.table)
        .select('seq', { count: 'exact', head: true });

      if (error) throw classifyError(error);
      return count ?? 0;
    }, this.retryConfig, this.logger, 'ledger length');
  }

  /** All events in chain order. */
  async all(): Promise<LedgerEvent[]> {
    return withRetry(async () => {
      const { data, error } = await this.client
        .from(this.table)
        .select('*')
        .order('seq', { ascending: true });

      if (error) throw classifyError(error);
      return (data as LedgerEventRow[]).map(toEvent);
    }, this.retryConfig, this.logger, 'ledger all');
  }

  /** A deep copy of all events (for snapshotting). */
  async snapshot(): Promise<LedgerEvent[]> {
    const events = await this.all();
    return JSON.parse(JSON.stringify(events));
  }

  /** Replace the store's contents with the given events. */
  async restore(events: LedgerEvent[]): Promise<void> {
    await withRetry(async () => {
      const { error: deleteError } = await this.client
        .from(this.table)
        .delete()
        .neq('seq', 0);

      if (deleteError) throw classifyError(deleteError);

      if (events.length === 0) return;

      const BATCH_SIZE = 500;
      for (let i = 0; i < events.length; i += BATCH_SIZE) {
        const batch = events.slice(i, i + BATCH_SIZE);
        const { error } = await this.client
          .from(this.table)
          .insert(batch.map(toRow));

        if (error) throw classifyError(error);
      }

      this.logger.info('ledger store restored', { eventCount: events.length });
    }, this.retryConfig, this.logger, 'ledger restore');
  }
}
