/**
 * @manya-os/ledger — in-memory ledger chain.
 *
 * A {@link LedgerChain} holds events in memory in append order and computes
 * the cryptographic linkage between consecutive events (`prevHash` chains each
 * event to the previous one's `hash`).
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Conceived, directed, and owned by Uviwe Menyiwe (Azura Daemon), founder
 * of the Manya Hael Foundation.
 *
 * Licensed under the Apache License, Version 2.0.
 */

import { ChainError } from '../errors.js';
import type {
  EventMetadata,
  EventPayload,
  LedgerEvent,
  SignatureAlgorithm,
} from '../types.js';
import {
  createEvent,
  GENESIS_PREV_HASH,
  signEvent,
} from '../event/event.js';
import type * as crypto from 'crypto';

/** Options accepted by {@link LedgerChain.append}. */
export interface AppendOptions {
  /** Explicit event id (defaults to a fresh UUID v4). */
  id?: string;
  /** ISO-8601 timestamp (defaults to `new Date().toISOString()`). */
  timestamp?: string;
  /** Optional metadata (does NOT contribute to `hash`). */
  metadata?: EventMetadata;
  /**
   * Optional private key to sign the event with at append time. If provided,
   * the returned event has `signature` and `signatureAlgorithm` populated.
   */
  privateKey?: crypto.KeyObject | string;
  /** Signature algorithm. Inferred from the key if omitted. */
  signatureAlgorithm?: SignatureAlgorithm;
}

/**
 * In-memory append-only ledger chain.
 *
 * The chain holds events in an array indexed by `seq - 1`. Each event's
 * `prevHash` is set to the `hash` of the previously appended event (or
 * {@link GENESIS_PREV_HASH} for the first event).
 */
export class LedgerChain {
  private readonly events: LedgerEvent[] = [];

  /**
   * Append a new event to the chain.
   *
   * @param type - Event type.
   * @param actor - Actor identifier.
   * @param payload - Event payload (JSON-serializable).
   * @param opts - Optional parameters.
   * @returns The newly appended event (with `hash`, `prevHash`, and optional `signature`).
   */
  append(
    type: string,
    actor: string,
    payload: EventPayload,
    opts: AppendOptions = {}
  ): LedgerEvent {
    if (typeof type !== 'string' || type.length === 0) {
      throw new ChainError('append: type must be a non-empty string');
    }
    if (typeof actor !== 'string' || actor.length === 0) {
      throw new ChainError('append: actor must be a non-empty string');
    }
    if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new ChainError('append: payload must be a JSON object');
    }
    const seq = this.events.length + 1;
    const prevHash =
      this.events.length === 0
        ? GENESIS_PREV_HASH
        : this.events[this.events.length - 1].hash;

    let event = createEvent({
      type,
      actor,
      payload,
      seq,
      prevHash,
      ...(opts.id !== undefined ? { id: opts.id } : {}),
      ...(opts.timestamp !== undefined ? { timestamp: opts.timestamp } : {}),
      ...(opts.metadata !== undefined ? { metadata: opts.metadata } : {}),
    });

    if (opts.privateKey !== undefined) {
      event = signEvent(event, opts.privateKey, opts.signatureAlgorithm);
    }

    this.events.push(event);
    return event;
  }

  /**
   * Append an already-constructed event (e.g. one received via sync).
   *
   * The event's `seq` MUST be `length() + 1` and its `prevHash` MUST equal
   * the current tail's `hash` (or {@link GENESIS_PREV_HASH} for the genesis).
   *
   * @param event - Pre-built event.
   * @returns The event (unchanged).
   * @throws {@link ChainError} if the event does not chain to the current tail.
   */
  appendEvent(event: LedgerEvent): LedgerEvent {
    if (!event || typeof event.seq !== 'number' || typeof event.hash !== 'string') {
      throw new ChainError('appendEvent: event is malformed');
    }
    const expectedSeq = this.events.length + 1;
    if (event.seq !== expectedSeq) {
      throw new ChainError(
        `appendEvent: expected seq=${expectedSeq}, got seq=${event.seq}`
      );
    }
    const expectedPrev =
      this.events.length === 0
        ? GENESIS_PREV_HASH
        : this.events[this.events.length - 1].hash;
    if (event.prevHash !== expectedPrev) {
      throw new ChainError(
        'appendEvent: prevHash does not chain to current tail'
      );
    }
    this.events.push(event);
    return event;
  }

  /**
   * Get the event at 1-based sequence number `seq`.
   * @returns The event, or `undefined` if out of range.
   */
  get(seq: number): LedgerEvent | undefined {
    if (!Number.isInteger(seq) || seq < 1 || seq > this.events.length) return undefined;
    return this.events[seq - 1];
  }

  /**
   * Get the event with id `id`, if any.
   */
  getById(id: string): LedgerEvent | undefined {
    return this.events.find((e) => e.id === id);
  }

  /** Get all events (a shallow copy of the underlying array). */
  all(): LedgerEvent[] {
    return this.events.slice();
  }

  /** Number of events in the chain. */
  length(): number {
    return this.events.length;
  }

  /** The first event in the chain, or `undefined` if empty. */
  head(): LedgerEvent | undefined {
    return this.events.length === 0 ? undefined : this.events[0];
  }

  /** The last event in the chain, or `undefined` if empty. */
  tail(): LedgerEvent | undefined {
    return this.events.length === 0
      ? undefined
      : this.events[this.events.length - 1];
  }

  /** Replace the chain's contents with `events`. Used by restore paths. */
  replaceAll(events: LedgerEvent[]): void {
    if (!Array.isArray(events)) {
      throw new ChainError('replaceAll: events must be an array');
    }
    this.events.length = 0;
    for (const e of events) this.events.push(e);
  }
}
