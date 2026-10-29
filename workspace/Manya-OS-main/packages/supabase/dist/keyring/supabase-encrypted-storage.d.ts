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
export declare class SupabaseEncryptedStorage {
    private readonly client;
    private readonly table;
    private readonly logger;
    private readonly retryConfig;
    constructor(client: SupabaseClient, config: ResolvedConfig, logger: Logger);
    /** Get a value by key, or null if absent. */
    get(key: string): Promise<Buffer | null>;
    /** Put a value under key. Overwrites if present. */
    put(key: string, value: Buffer): Promise<void>;
    /** Delete a value by key. Idempotent. */
    delete(key: string): Promise<void>;
    /** List keys, optionally filtered by prefix. */
    list(prefix?: string): Promise<string[]>;
}
//# sourceMappingURL=supabase-encrypted-storage.d.ts.map