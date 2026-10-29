/**
 * @manya/nervous-system — application source.
 *
 * Wraps an application surface (HTTP request handler, RPC server, etc.)
 * and emits `app.request` events. The default implementation uses an
 * internal {@link EventEmitter} so the source is testable without binding
 * a real network socket.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Conceived, directed, and owned by Uviwe Menyiwe (Azura Daemon),
 * founder of the Manya Hael Foundation.
 *
 * Licensed under the Apache License, Version 2.0.
 */

import { EventEmitter } from 'node:events';
import type { EventSink, NervousEvent, Severity } from '../types.js';
import { createEvent } from '../event/event.js';

/** Options for {@link ApplicationSource}. */
export interface ApplicationSourceOptions {
  /** Source id (default 'application'). */
  id?: string;
  /** Severity for emitted events. Default 'info'. */
  severity?: Severity;
  /** Tags applied to every emitted event. */
  tags?: string[];
  /** External emitter to listen on (default: internal). */
  emitter?: EventEmitter;
}

/**
 * Wraps an application surface and emits `app.request` events for every
 * request-like interaction. By default, listens on an internal
 * {@link EventEmitter} so callers can simulate requests via `recordRequest`.
 *
 * To integrate a real HTTP server, supply an `emitter` that emits
 * `request` events with `{ method, url, headers?, body? }` payloads.
 */
export class ApplicationSource {
  public readonly id: string;
  private readonly severity: Severity;
  private readonly tags: string[] | undefined;
  private readonly emitter: EventEmitter;
  private readonly ownsEmitter: boolean;
  private sink: EventSink | null = null;
  private listener: ((req: unknown) => void) | null = null;

  constructor(opts?: ApplicationSourceOptions) {
    const o = opts ?? {};
    this.id = o.id ?? 'application';
    this.severity = o.severity ?? 'info';
    this.tags = o.tags;
    if (o.emitter) {
      this.emitter = o.emitter;
      this.ownsEmitter = false;
    } else {
      this.emitter = new EventEmitter();
      this.emitter.setMaxListeners(0);
      this.ownsEmitter = true;
    }
  }

  /** Start listening for request events on the emitter. */
  start(sink: EventSink): void {
    if (this.listener) return;
    this.sink = sink;
    this.listener = (req) => {
      if (!this.sink) return;
      const payload = normalizeRequest(req);
      const ev: NervousEvent = createEvent('app.request', this.id, payload, {
        severity: this.severity,
        tags: this.tags,
      });
      try { this.sink(ev); } catch { /* swallow */ }
    };
    this.emitter.on('request', this.listener);
  }

  /** Stop listening. */
  stop(): void {
    if (this.listener) {
      this.emitter.off('request', this.listener);
      this.listener = null;
    }
    this.sink = null;
  }

  /** Simulate a request (only meaningful when no external emitter was supplied). */
  recordRequest(req: { method?: string; url?: string; headers?: Record<string, string>; body?: unknown }): void {
    this.emitter.emit('request', req);
  }

  /** The internal emitter (useful for `app.response` etc. extensions). */
  getEmitter(): EventEmitter { return this.emitter; }
}

function normalizeRequest(req: unknown): { method: string; url: string; headers?: Record<string, string>; body?: unknown } {
  if (!req || typeof req !== 'object') {
    return { method: 'UNKNOWN', url: '' };
  }
  const r = req as { method?: string; url?: string; headers?: Record<string, string>; body?: unknown };
  return {
    method: typeof r.method === 'string' ? r.method : 'UNKNOWN',
    url: typeof r.url === 'string' ? r.url : '',
    ...(r.headers ? { headers: r.headers } : {}),
    ...(r.body !== undefined ? { body: r.body } : {}),
  };
}
