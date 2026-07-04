/**
 * @manya/nervous-system — event model.
 *
 * Defines the universal `NervousEvent` shape plus a factory, JSON serializer,
 * and deserializer. Events are the smallest unit of work in the fabric.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Conceived, directed, and owned by Uviwe Menyiwe (Azura Daemon),
 * founder of the Manya Hael Foundation.
 *
 * Licensed under the Apache License, Version 2.0.
 */

import { randomUUID } from 'node:crypto';
import type { NervousEvent, Severity } from '../types.js';
import { NervousSystemError } from '../errors.js';

/** The set of valid severity strings (kept private to this module). */
const KNOWN_SEVERITIES: ReadonlySet<Severity> = new Set<Severity>(['debug', 'info', 'warn', 'error']);

/** Options accepted by {@link createEvent}. */
export interface CreateEventOptions {
  /** Override the auto-generated event id. */
  id?: string;
  /** Override the auto-stamped timestamp (epoch ms). */
  timestamp?: number;
  /** Severity. Defaults to 'info'. */
  severity?: Severity;
  /** Optional taxonomy tags. */
  tags?: string[];
  /** Optional structured metadata. */
  metadata?: Record<string, unknown>;
}

/**
 * Generate a stable event id. Uses `crypto.randomUUID()` when available,
 * falling back to a high-entropy timestamp+random string.
 */
export function generateEventId(): string {
  try {
    if (typeof randomUUID === 'function') return randomUUID();
  } catch { /* fallthrough */ }
  return `evt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

/** Returns true if `s` is a valid {@link Severity} value. */
export function isSeverity(s: unknown): s is Severity {
  return typeof s === 'string' && KNOWN_SEVERITIES.has(s as Severity);
}

/**
 * Create a {@link NervousEvent} with sane defaults.
 *
 * @param topic   Event topic, e.g. `'fs.change'` or `'os.metrics'`.
 * @param source  Provenance string identifying the producer.
 * @param payload Arbitrary structured payload.
 * @param opts    Optional overrides (id, timestamp, severity, tags, metadata).
 */
export function createEvent(
  topic: string,
  source: string,
  payload: unknown,
  opts?: CreateEventOptions,
): NervousEvent {
  if (!topic || typeof topic !== 'string') throw new NervousSystemError('Event topic is required');
  if (!source || typeof source !== 'string') throw new NervousSystemError('Event source is required');
  const severity: Severity = opts?.severity ?? 'info';
  if (!isSeverity(severity)) throw new NervousSystemError(`Invalid severity: ${String(severity)}`);
  const event: NervousEvent = {
    id: opts?.id ?? generateEventId(),
    topic,
    source,
    payload,
    timestamp: opts?.timestamp ?? Date.now(),
    severity,
  };
  if (opts?.tags) event.tags = [...opts.tags];
  if (opts?.metadata) event.metadata = { ...opts.metadata };
  return event;
}

/**
 * Serialize a {@link NervousEvent} to a JSON string.
 *
 * @param event The event to serialize.
 * @param pretty If true, indent with 2 spaces.
 */
export function serialize(event: NervousEvent, pretty?: boolean): string {
  try {
    return JSON.stringify(event, null, pretty ? 2 : 0);
  } catch (e) {
    throw new NervousSystemError('Failed to serialize event', undefined, e);
  }
}

/**
 * Deserialize a JSON string into a {@link NervousEvent}.
 *
 * Performs structural validation: requires `id`, `topic`, `source`,
 * `timestamp`, and `severity`. Payload, tags, and metadata are passed through.
 */
export function deserialize(json: string): NervousEvent {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (e) {
    throw new NervousSystemError('Failed to parse event JSON', undefined, e);
  }
  if (!parsed || typeof parsed !== 'object') {
    throw new NervousSystemError('Event JSON must be an object');
  }
  const obj = parsed as Record<string, unknown>;
  if (typeof obj.id !== 'string') throw new NervousSystemError('Event missing string field: id');
  if (typeof obj.topic !== 'string') throw new NervousSystemError('Event missing string field: topic');
  if (typeof obj.source !== 'string') throw new NervousSystemError('Event missing string field: source');
  if (typeof obj.timestamp !== 'number') throw new NervousSystemError('Event missing number field: timestamp');
  if (!isSeverity(obj.severity)) throw new NervousSystemError(`Event has invalid severity: ${String(obj.severity)}`);
  if (obj.tags !== undefined && !Array.isArray(obj.tags)) throw new NervousSystemError('Event tags must be array if present');
  if (obj.metadata !== undefined && (typeof obj.metadata !== 'object' || obj.metadata === null || Array.isArray(obj.metadata))) {
    throw new NervousSystemError('Event metadata must be object if present');
  }
  const out: NervousEvent = {
    id: obj.id,
    topic: obj.topic,
    source: obj.source,
    payload: obj.payload,
    timestamp: obj.timestamp,
    severity: obj.severity,
  };
  if (obj.tags !== undefined) out.tags = obj.tags as string[];
  if (obj.metadata !== undefined) out.metadata = obj.metadata as Record<string, unknown>;
  return out;
}

/** Deep structural equality for two events (used by tests / recorders). */
export function eventsEqual(a: NervousEvent, b: NervousEvent): boolean {
  return serialize(a) === serialize(b);
}
