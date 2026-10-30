/**
 * @manya-os/ledger — ledger store interface.
 *
 * A {@link LedgerStore} is the persistence abstraction for a ledger chain.
 * Stores MUST be append-only: once an event is written, it MUST NOT be
 * silently modified. {@link InMemoryLedgerStore} and {@link FileLedgerStore}
 * are provided; distributed deployments can implement this against any
 * append-only backend (Postgres, S3 + WAL, Kafka, etc.).
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Conceived, directed, and owned by Uviwe Menyiwe (Azura Daemon), founder
 * of the Manya Hael Foundation.
 *
 * Licensed under the Apache License, Version 2.0.
 */

import type { LedgerEvent } from '../types.js';

/**
 * Append-only persistence abstraction for a ledger chain.
 */
export interface LedgerStore {
  /**
   * Append an event to the store. MUST be atomic with respect to other
   * concurrent writers on the same backing medium.
   *
   * @param event - The event to append.
   */
  append(event: LedgerEvent): void;
  /**
   * Get the event at 1-based sequence number `seq`, or `undefined`.
   */
  get(seq: number): LedgerEvent | undefined;
  /**
   * Get the event with id `id`, or `undefined`.
   */
  getById(id: string): LedgerEvent | undefined;
  /** Number of events in the store. */
  length(): number;
  /** All events in chain order. */
  all(): LedgerEvent[];
  /** A deep copy of all events (for snapshotting). */
  snapshot(): LedgerEvent[];
  /** Replace the store's contents with `events`. Used by restore paths. */
  restore(events: LedgerEvent[]): void;
}

/**
 * Async append-only persistence abstraction for a ledger chain.
 *
 * Mirrors {@link LedgerStore} but with Promise return types, suitable for
 * network-backed stores (databases, APIs). Sync stores (InMemoryLedgerStore,
 * FileLedgerStore) can satisfy this interface since sync return values are
 * valid Promise return values.
 */
export interface AsyncLedgerStore {
  /** Append an event to the store. */
  append(event: LedgerEvent): Promise<void>;
  /** Get the event at 1-based sequence number `seq`, or `undefined`. */
  get(seq: number): Promise<LedgerEvent | undefined>;
  /** Get the event with id `id`, or `undefined`. */
  getById(id: string): Promise<LedgerEvent | undefined>;
  /** Number of events in the store. */
  length(): Promise<number>;
  /** All events in chain order. */
  all(): Promise<LedgerEvent[]>;
  /** A deep copy of all events (for snapshotting). */
  snapshot(): Promise<LedgerEvent[]>;
  /** Replace the store's contents with `events`. Used by restore paths. */
  restore(events: LedgerEvent[]): Promise<void>;
}
