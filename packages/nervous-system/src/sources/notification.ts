/**
 * @manya/nervous-system — notification source.
 *
 * A simple in-process notification source. Exposes a `notify(topic, payload)`
 * method that publishes events into the attached sink. Useful for
 * applications that need to surface user-facing notifications.
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

/** Options for {@link NotificationSource}. */
export interface NotificationSourceOptions {
  /** Source id (default 'notifications'). */
  id?: string;
  /** Default severity for emitted events. Default 'info'. */
  severity?: Severity;
  /** Default tags for emitted events. */
  tags?: string[];
}

/**
 * In-process notification source. Applications call `notify()` to publish
 * `notification.*` events into the fabric.
 */
export class NotificationSource {
  public readonly id: string;
  private readonly severity: Severity;
  private readonly tags: string[] | undefined;
  private sink: EventSink | null = null;

  constructor(opts?: NotificationSourceOptions) {
    const o = opts ?? {};
    this.id = o.id ?? 'notifications';
    this.severity = o.severity ?? 'info';
    this.tags = o.tags;
  }

  /** Start the source — stores the sink. */
  start(sink: EventSink): void { this.sink = sink; }

  /** Stop the source — clears the sink. */
  stop(): void { this.sink = null; }

  /**
   * Publish a notification. The topic is prefixed with `notification.`
   * unless the caller already provides a `notification.*` topic.
   *
   * @returns the constructed event, or `null` if the source is not started.
   */
  notify(topic: string, payload: unknown, opts?: { severity?: Severity; tags?: string[]; metadata?: Record<string, unknown> }): NervousEvent | null {
    if (!this.sink) return null;
    if (typeof topic !== 'string' || !topic) throw new SourceError('notify(): topic is required');
    const fullTopic = topic.startsWith('notification.') ? topic : `notification.${topic}`;
    const ev: NervousEvent = createEvent(fullTopic, this.id, payload, {
      severity: opts?.severity ?? this.severity,
      tags: opts?.tags ?? this.tags,
      metadata: opts?.metadata,
    });
    try { this.sink(ev); } catch { /* swallow */ }
    return ev;
  }
}
