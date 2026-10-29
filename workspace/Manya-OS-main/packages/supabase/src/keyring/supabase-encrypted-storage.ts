/**
 * @manya-os/supabase — Supabase-backed EncryptedStorage.
 *
 * Implements the @manya-os/keyring EncryptedStorage interface against
 * a Postgres/Supabase database. Stores opaque encrypted binary blobs
 * as base64-encoded text. The encryption/decryption happens at the
 * KeyringWallet layer — this adapter never attempts to decrypt.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Logger } from '../logging.js';
import type { ResolvedConfig } from '../config.js';
import type { KeyringKvRow } from '../types.js';
import { classifyError } from '../errors.js';
import { withRetry } from '../retry.js';

/**
 * Supabase-backed encrypted key-value storage for @manya-os/keyring.
 *
 * Implements the EncryptedStorage interface from @manya-os/keyring.
 * Values are stored as base64-encoded text. The caller (KeyringWallet)
 * is responsible for all encryption — this adapter stores and retrieves
 * opaque binary blobs only.
 *
 * All operations are wrapped with retry logic for transient errors.
 */
export class SupabaseEncryptedStorage {
  private readonly table: string;
  private readonly logger: Logger;
  private readonly retryConfig: ResolvedConfig['retry'];

  constructor(
    private readonly client: SupabaseClient,
    config: ResolvedConfig,
    logger: Logger,
  ) {
    this.table = config.tables.keyringKv;
    this.logger = logger;
    this.retryConfig = config.retry;
  }

  /** Get a value by key, or null if absent. */
  async get(key: string): Promise<Buffer | null> {
    return withRetry(async () => {
      const { data, error } = await this.client
        .from(this.table)
        .select('value')
        .eq('key', key)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw classifyError(error);
      }

      const row = data as Pick<KeyringKvRow, 'value'>;
      return Buffer.from(row.value, 'base64');
    }, this.retryConfig, this.logger, 'encrypted storage get');
  }

  /** Put a value under key. Overwrites if present. */
  async put(key: string, value: Buffer): Promise<void> {
    await withRetry(async () => {
      const { error } = await this.client
        .from(this.table)
        .upsert(
          {
            key,
            value: value.toString('base64'),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'key' },
        );

      if (error) {
        this.logger.error('encrypted storage put failed', {
          key,
          error: error.message,
        });
        throw classifyError(error);
      }

      this.logger.debug('encrypted storage value stored', { key });
    }, this.retryConfig, this.logger, 'encrypted storage put');
  }

  /** Delete a value by key. Idempotent. */
  async delete(key: string): Promise<void> {
    await withRetry(async () => {
      const { error } = await this.client
        .from(this.table)
        .delete()
        .eq('key', key);

      if (error) throw classifyError(error);
    }, this.retryConfig, this.logger, 'encrypted storage delete');
  }

  /** List keys, optionally filtered by prefix. */
  async list(prefix?: string): Promise<string[]> {
    return withRetry(async () => {
      let query = this.client
        .from(this.table)
        .select('key')
        .order('key', { ascending: true });

      if (prefix) {
        query = query.ilike('key', `${prefix}%`);
      }

      const { data, error } = await query;
      if (error) throw classifyError(error);

      return (data as Pick<KeyringKvRow, 'key'>[]).map((r) => r.key);
    }, this.retryConfig, this.logger, 'encrypted storage list');
  }
}
