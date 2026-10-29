/**
 * @manya-os/keyring — encrypted storage backends.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import * as fs from 'fs/promises';
import * as nodeFs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { StorageError } from '../errors.js';

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
export class InMemoryStorage implements EncryptedStorage {
  private readonly map = new Map<string, Buffer>();

  /** @inheritdoc */
  public async get(key: string): Promise<Buffer | null> {
    const v = this.map.get(key);
    return v ? Buffer.from(v) : null;
  }

  /** @inheritdoc */
  public async put(key: string, value: Buffer): Promise<void> {
    if (!Buffer.isBuffer(value)) {
      throw new StorageError('InMemoryStorage.put: value must be a Buffer');
    }
    // Defensive copy so external mutations don't leak.
    this.map.set(key, Buffer.from(value));
  }

  /** @inheritdoc */
  public async delete(key: string): Promise<void> {
    this.map.delete(key);
  }

  /** @inheritdoc */
  public async list(prefix?: string): Promise<string[]> {
    const keys = Array.from(this.map.keys());
    if (!prefix) return keys.sort();
    return keys.filter((k) => k.startsWith(prefix)).sort();
  }

  /** Number of stored entries. */
  public get size(): number {
    return this.map.size;
  }

  /** Remove all entries. */
  public clear(): void {
    this.map.clear();
  }
}

/**
 * Validate a storage key. We allow alphanumerics, `:`, `_`, `-`, `.`.
 * The `:` separator is converted to a path separator on disk; `/` is not
 * allowed to keep the mapping bijective.
 * @internal
 */
export function assertValidKey(key: string): void {
  if (typeof key !== 'string' || key.length === 0) {
    throw new StorageError('storage key must be a non-empty string');
  }
  if (key.length > 1024) {
    throw new StorageError('storage key too long (>1024 chars)');
  }
  if (!/^[A-Za-z0-9:_\-.]+$/.test(key)) {
    throw new StorageError(
      `storage key contains forbidden characters: '${key}'`
    );
  }
  if (key.includes('..')) {
    throw new StorageError('storage key must not contain path-traversal sequences');
  }
}

/**
 * File-backed storage. Each key maps to a file under `dirPath`. Writes are
 * atomic (tmp file + rename).
 */
export class FileStorage implements EncryptedStorage {
  constructor(private readonly dirPath: string) {
    if (typeof dirPath !== 'string' || dirPath.length === 0) {
      throw new StorageError('FileStorage: dirPath must be a non-empty string');
    }
  }

  /** Ensure the storage directory exists. Call once at startup. */
  public async ensureInitialized(): Promise<void> {
    try {
      await fs.mkdir(this.dirPath, { recursive: true });
    } catch (err) {
      throw new StorageError(
        `FileStorage.init: mkdir failed: ${(err as Error).message}`,
        err
      );
    }
  }

  /** @inheritdoc */
  public async get(key: string): Promise<Buffer | null> {
    assertValidKey(key);
    const filePath = this.pathFor(key);
    try {
      return await fs.readFile(filePath);
    } catch (err) {
      const e = err as NodeJS.ErrnoException;
      if (e && e.code === 'ENOENT') return null;
      throw new StorageError(
        `FileStorage.get('${key}') failed: ${(err as Error).message}`,
        err
      );
    }
  }

  /** @inheritdoc */
  public async put(key: string, value: Buffer): Promise<void> {
    assertValidKey(key);
    if (!Buffer.isBuffer(value)) {
      throw new StorageError('FileStorage.put: value must be a Buffer');
    }
    const filePath = this.pathFor(key);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    // Atomic write: write to temp file in the same directory, fsync, rename.
    const tmpPath = filePath + '.tmp.' + crypto.randomBytes(6).toString('hex');
    const fd = await fs.open(tmpPath, 'w');
    try {
      await fd.writeFile(value);
      try {
        await fd.sync();
      } catch {
        // fsync best-effort on some platforms; not fatal.
      }
    } finally {
      await fd.close();
    }
    try {
      await fs.rename(tmpPath, filePath);
    } catch (err) {
      try { await fs.unlink(tmpPath); } catch { /* ignore */ }
      throw new StorageError(
        `FileStorage.put('${key}'): rename failed: ${(err as Error).message}`,
        err
      );
    }
  }

  /** @inheritdoc */
  public async delete(key: string): Promise<void> {
    assertValidKey(key);
    const filePath = this.pathFor(key);
    try {
      await fs.unlink(filePath);
    } catch (err) {
      const e = err as NodeJS.ErrnoException;
      if (e && e.code === 'ENOENT') return;
      throw new StorageError(
        `FileStorage.delete('${key}') failed: ${(err as Error).message}`,
        err
      );
    }
  }

  /** @inheritdoc */
  public async list(prefix?: string): Promise<string[]> {
    const results: string[] = [];
    const stack: string[] = [this.dirPath];
    while (stack.length > 0) {
      const dir = stack.pop()!;
      let entries: nodeFs.Dirent[];
      try {
        entries = await fs.readdir(dir, { withFileTypes: true });
      } catch (err) {
        const e = err as NodeJS.ErrnoException;
        if (e && e.code === 'ENOENT') continue;
        throw new StorageError(
          `FileStorage.list: readdir failed: ${(err as Error).message}`,
          err
        );
      }
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          stack.push(full);
        } else if (entry.isFile() && !entry.name.endsWith('.tmp')) {
          // Convert back to a logical key. The on-disk path separator is
          // mapped back to `:` to round-trip the original key.
          const rel = path.relative(this.dirPath, full);
          const key = rel.split(path.sep).join(':');
          if (!prefix || key.startsWith(prefix)) {
            results.push(key);
          }
        }
      }
    }
    return results.sort();
  }

  /** Convert a logical key to a filesystem path. */
  private pathFor(key: string): string {
    // Replace ':' with '/' so that `manya:keyring:roles:abc` becomes
    // `manya/keyring/roles/abc` on disk.
    const parts = key.split(':').join('/').split('/');
    return path.join(this.dirPath, ...parts);
  }
}
