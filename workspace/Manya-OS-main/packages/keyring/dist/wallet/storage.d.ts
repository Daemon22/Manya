/**
 * @manya-os/keyring — encrypted storage backends.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
/**
 * Async key-value storage interface. Keys are opaque strings; values are
 * binary buffers. Implementations must be concurrency-safe within a single
 * process.
 *
 * Backends included in this package: {@link InMemoryStorage},
 * {@link FileStorage}.
 */
export interface EncryptedStorage {
    /** Get a value by key, or `null` if absent. */
    get(key: string): Promise<Buffer | null>;
    /** Put a value under `key`. Overwrites if present. */
    put(key: string, value: Buffer): Promise<void>;
    /** Delete a value by key. Idempotent. */
    delete(key: string): Promise<void>;
    /** List keys, optionally filtered by `prefix`. */
    list(prefix?: string): Promise<string[]>;
}
/**
 * In-memory storage. Useful for tests and ephemeral wallets.
 */
export declare class InMemoryStorage implements EncryptedStorage {
    private readonly map;
    /** @inheritdoc */
    get(key: string): Promise<Buffer | null>;
    /** @inheritdoc */
    put(key: string, value: Buffer): Promise<void>;
    /** @inheritdoc */
    delete(key: string): Promise<void>;
    /** @inheritdoc */
    list(prefix?: string): Promise<string[]>;
    /** Number of stored entries. */
    get size(): number;
    /** Remove all entries. */
    clear(): void;
}
/**
 * Validate a storage key. We allow alphanumerics, `:`, `_`, `-`, `.`.
 * The `:` separator is converted to a path separator on disk; `/` is not
 * allowed to keep the mapping bijective.
 * @internal
 */
export declare function assertValidKey(key: string): void;
/**
 * File-backed storage. Each key maps to a file under `dirPath`. Writes are
 * atomic (tmp file + rename).
 */
export declare class FileStorage implements EncryptedStorage {
    private readonly dirPath;
    constructor(dirPath: string);
    /** Ensure the storage directory exists. Call once at startup. */
    ensureInitialized(): Promise<void>;
    /** @inheritdoc */
    get(key: string): Promise<Buffer | null>;
    /** @inheritdoc */
    put(key: string, value: Buffer): Promise<void>;
    /** @inheritdoc */
    delete(key: string): Promise<void>;
    /** @inheritdoc */
    list(prefix?: string): Promise<string[]>;
    /** Convert a logical key to a filesystem path. */
    private pathFor;
}
//# sourceMappingURL=storage.d.ts.map