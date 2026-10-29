/**
 * @manya/nervous-system — custom producer source.
 *
 * Accepts a user-supplied producer function `(emit) => void` and calls it
 * on `start()`. Useful for one-off integrations and tests.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Conceived, directed, and owned by Uviwe Menyiwe (Azura Daemon),
 * founder of the Manya Hael Foundation.
 *
 * Licensed under the Apache License, Version 2.0.
 */

import type { EventSink, NervousEvent, Severity } from '../types.js';
import { SourceError } from '../errors.js';
import { createEvent } from '../event/event.js';

/** Function called when the source starts; receives an `emit` callback. */
export type CustomProducer = (emit: (event: NervousEvent) => void) => void;

/** Options for {@link CustomSource}. */
export interface CustomSourceOptions {
  /** Source id (default 'custom'). */
  id?: string;
  /** The producer function (required). */
  producer: CustomProducer;
  /** Severity applied to events emitted via `emit()` shortcut. */
  severity?: Severity;
  /** Tags applied to events emitted via `emit()` shortcut. */
  tags?: string[];
}

/**
 * Wraps a user-supplied producer function. The producer receives an `emit`
 * callback that constructs a {@link NervousEvent} from a topic + payload
 * and forwards it to the fabric sink.
 *
 * Example:
 * ```ts
 * new CustomSource({
 *   id: 'clock',
 *   producer: (emit) => {
 *     const t = setInterval(() => emit({ topic: 'clock.tick', payload: { now: Date.now() } }), 1000);
 *     // To stop, the producer may register cleanup via the source's onStop.
 *   },
 * });
 * ```
 */
export class CustomSource {
  public readonly id: string;
  private readonly producer: CustomProducer;
  private readonly severity: Severity;
  private readonly tags: string[] | undefined;
  private sink: EventSink | null = null;
  private started = false;
  private onStop: (() => void) | null = null;

  constructor(opts: CustomSourceOptions) {
    if (!opts || typeof opts.producer !== 'function') {
      throw new SourceError('CustomSource: producer function is required');
    }
    this.id = opts.id ?? 'custom';
    this.producer = opts.producer;
    this.severity = opts.severity ?? 'info';
    this.tags = opts.tags;
  }

  /** Begin producing events. The producer is invoked synchronously. */
  start(sink: EventSink): void {
    if (this.started) return;
    this.sink = sink;
    this.started = true;
    const emit = (input: NervousEvent | { topic: string; payload: unknown; severity?: Severity; tags?: string[]; metadata?: Record<string, unknown> }): void => {
      if (!this.sink) return;
      let ev: NervousEvent;
      if (input && typeof input === 'object' && 'id' in input && typeof (input as NervousEvent).id === 'string' && 'timestamp' in input) {
        ev = input as NervousEvent;
      } else {
        const i = input as { topic: string; payload: unknown; severity?: Severity; tags?: string[]; metadata?: Record<string, unknown> };
        ev = createEvent(i.topic, this.id, i.payload, {
          severity: i.severity ?? this.severity,
          tags: i.tags ?? this.tags,
          metadata: i.metadata,
        });
      }
      try { this.sink(ev); } catch { /* swallow */ }
    };
    try {
      const ret = this.producer(emit);
      // If the producer returns a cleanup function (typical Promise-or-sync
      // pattern), stash it for `stop()`.
      if (typeof ret === 'function') this.onStop = ret as () => void;
    } catch (e) {
      this.started = false;
      this.sink = null;
      throw new SourceError('CustomSource: producer threw', e);
    }
  }

  /** Stop the source. Calls the producer's cleanup function if one was returned. */
  stop(): void {
    if (this.onStop) {
      try { this.onStop(); } catch { /* swallow */ }
      this.onStop = null;
    }
    this.started = false;
    this.sink = null;
  }
}
