/**
 * @manya-os/attest — session store interface + in-memory implementation.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import type { SessionRecord } from '../types.js';
import { SessionError } from '../errors.js';

/**
 * Persistent session store. Implementations may be in-memory, file-backed,
 * Redis-backed, etc.
 *
 * All keys are opaque session tokens (strings). Implementations MUST be
 * safe to call from multiple async callers; they need NOT be safe to call
 * from multiple processes (use a distributed store for that).
 */
export interface SessionStore {
  /** Look up a session record by token. Returns `null` if absent. */
  get(token: string): Promise<SessionRecord | null>;
  /** Store a session record. Overwrites any existing record for the same token. */
  put(record: SessionRecord): Promise<void>;
  /** Delete a session record by token. Returns `true` if a record was deleted. */
  delete(token: string): Promise<boolean>;
  /** List all currently-stored records (for diagnostics / cleanup). */
  list(): Promise<SessionRecord[]>;
}

/**
 * In-memory {@link SessionStore} backed by a `Map`.
 *
 * Defensive copies are made on `put` and `get` so callers cannot mutate the
 * stored records by holding on to the returned references.
 */
export class InMemorySessionStore implements SessionStore {
  private readonly records = new Map<string, SessionRecord>();

  /** @inheritdoc */
  async get(token: string): Promise<SessionRecord | null> {
    if (typeof token !== 'string' || token.length === 0) {
      throw new SessionError('get: token must be a non-empty string');
    }
    const record = this.records.get(token);
    if (!record) return null;
    return cloneRecord(record);
  }

  /** @inheritdoc */
  async put(record: SessionRecord): Promise<void> {
    if (!record || typeof record !== 'object') {
      throw new SessionError('put: record must be a SessionRecord');
    }
    if (typeof record.token !== 'string' || record.token.length === 0) {
      throw new SessionError('put: record.token must be a non-empty string');
    }
    this.records.set(record.token, cloneRecord(record));
  }

  /** @inheritdoc */
  async delete(token: string): Promise<boolean> {
    if (typeof token !== 'string' || token.length === 0) return false;
    return this.records.delete(token);
  }

  /** @inheritdoc */
  async list(): Promise<SessionRecord[]> {
    return Array.from(this.records.values()).map(cloneRecord);
  }

  /** Clear all records (useful in tests). */
  clear(): void {
    this.records.clear();
  }
}

/**
 * Deep-clone a SessionRecord. Because SessionRecord is a plain JSON-able
 * object, structured cloning via JSON round-trip is sufficient and avoids
 * any shared-reference bugs.
 *
 * @internal
 */
function cloneRecord(record: SessionRecord): SessionRecord {
  try {
    return JSON.parse(JSON.stringify(record)) as SessionRecord;
  } catch (err) {
    throw new SessionError(
      'cloneRecord: failed to clone session record: ' + (err as Error).message,
      err
    );
  }
}
