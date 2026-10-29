/**
 * @manya/nervous-system — core event fabric.
 *
 * High-performance publish/subscribe event fabric with O(1) topic lookup
 * and O(k) per-topic filter evaluation. Supports the wildcard `*` topic,
 * structured filters, and integrates with the recorder, metrics collector,
 * router, and event sources.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Conceived, directed, and owned by Uviwe Menyiwe (Azura Daemon),
 * founder of the Manya Hael Foundation.
 *
 * Licensed under the Apache License, Version 2.0.
 */

import { EventEmitter } from 'node:events';
import { randomUUID } from 'node:crypto';
import type {
  EventFilter, EventSource, NervousConfig, NervousEvent, SubscriptionId,
} from '../types.js';
import { FabricError } from '../errors.js';
import type { Logger } from '../logging.js';
import { ConsoleLogger, SilentLogger } from '../logging.js';
import { compileFilter } from '../filter/filter.js';
import { EventRecorder, DEFAULT_RECORDER_MAX_SIZE } from '../recorder/recorder.js';
import { MetricsCollector } from '../metrics/metrics.js';

/** Default configuration values. */
export const DEFAULT_NERVOUS_CONFIG: Required<Omit<NervousConfig, 'logger'>> = {
  defaultMaxSize: DEFAULT_RECORDER_MAX_SIZE,
  recordByDefault: false,
  logLevel: 'info',
};

/** Internal subscription record. */
interface Subscription {
  id: SubscriptionId;
  filter: EventFilter;
  compiled: (e: NervousEvent) => boolean;
  handler: (event: NervousEvent) => void;
  /** Index key — either the exact topic string or '*' for wildcard/regex/undefined. */
  topicKey: string;
}

/** Built-in EventEmitter events emitted by the fabric itself. */
export interface FabricEmitterEvents {
  /** Emitted after every successful publish. */
  published: (event: NervousEvent) => void;
  /** Emitted when a handler throws. */
  error: (err: Error, event: NervousEvent) => void;
  /** Emitted when an event has no matching subscribers (and was thus dropped). */
  dropped: (event: NervousEvent) => void;
}

let subscriptionCounter = 0;

function newSubscriptionId(): SubscriptionId {
  subscriptionCounter++;
  try {
    if (typeof randomUUID === 'function') return `sub-${randomUUID()}`;
  } catch { /* fallthrough */ }
  return `sub-${Date.now().toString(36)}-${subscriptionCounter.toString(36)}`;
}

/**
 * The core event fabric.
 *
 * Performance characteristics:
 * - `publish(event)` → O(1) topic lookup + O(k) filter evaluation, where k
 *   is the number of subscribers indexed under the event's topic or the
 *   wildcard bucket.
 * - `subscribe(filter, handler)` → O(1).
 * - `unsubscribe(id)` → O(1).
 *
 * The fabric also exposes:
 * - `attach(source)` / `detach(sourceId)` for plugging in event sources.
 * - `recorder` — a built-in ring-buffer recorder (controlled via
 *   `recordByDefault` config or `startRecording()`).
 * - `metrics` — a built-in {@link MetricsCollector}.
 */
export class EventFabric {
  private readonly ee = new EventEmitter();
  private readonly subscribers = new Map<SubscriptionId, Subscription>();
  /** Index from topic-key → subscription ids registered under that key. */
  private readonly topicIndex = new Map<string, Set<SubscriptionId>>();
  private readonly sources = new Map<string, EventSource>();
  private readonly logger: Logger;
  public readonly config: Required<Omit<NervousConfig, 'logger'>>;
  public readonly recorder: EventRecorder;
  public readonly metrics: MetricsCollector;
  private recordByDefault: boolean;

  constructor(config?: NervousConfig) {
    const merged = { ...DEFAULT_NERVOUS_CONFIG, ...(config ?? {}) };
    this.config = merged;
    this.logger = config?.logger ?? (
      merged.logLevel === 'silent' ? new SilentLogger() : new ConsoleLogger(merged.logLevel)
    );
    this.recorder = new EventRecorder(merged.defaultMaxSize);
    this.metrics = new MetricsCollector();
    this.recordByDefault = !!merged.recordByDefault;
    if (this.recordByDefault) this.recorder.start();
    this.ee.setMaxListeners(0);
  }

  /** The configured logger. */
  getLogger(): Logger { return this.logger; }

  /** Whether the fabric is currently auto-recording published events. */
  isRecording(): boolean { return this.recorder.isRecording(); }

  /** Start auto-recording published events. */
  startRecording(): void { this.recorder.start(); }

  /** Stop auto-recording. Recorded events are preserved. */
  stopRecording(): void { this.recorder.stop(); }

  /**
   * Subscribe to events matching a filter.
   *
   * The filter's `topic` controls indexing:
   * - string (exact) → indexed under that exact topic for O(1) lookup.
   * - `'*'` or RegExp or undefined → indexed under the wildcard bucket
   *   (`'*'`), evaluated for every event.
   *
   * @returns The new subscription id (also retrievable via the second arg).
   */
  subscribe(filter: EventFilter, handler: (event: NervousEvent) => void): SubscriptionId;
  subscribe(filter: EventFilter, id: SubscriptionId, handler: (event: NervousEvent) => void): SubscriptionId;
  subscribe(filter: EventFilter, idOrHandler: SubscriptionId | ((event: NervousEvent) => void), maybeHandler?: (event: NervousEvent) => void): SubscriptionId {
    if (!filter || typeof filter !== 'object') throw new FabricError('subscribe(): filter must be an object');
    let id: SubscriptionId;
    let handler: (event: NervousEvent) => void;
    if (typeof idOrHandler === 'function') {
      id = newSubscriptionId();
      handler = idOrHandler;
    } else if (typeof idOrHandler === 'string' && typeof maybeHandler === 'function') {
      id = idOrHandler;
      handler = maybeHandler;
      if (this.subscribers.has(id)) {
        throw new FabricError(`subscribe(): subscription id '${id}' already exists`);
      }
    } else {
      throw new FabricError('subscribe(): invalid arguments');
    }
    if (typeof handler !== 'function') throw new FabricError('subscribe(): handler must be a function');

    const compiled = compileFilter(filter);
    const topicKey = indexKeyForFilter(filter);
    const sub: Subscription = { id, filter, compiled, handler, topicKey };
    this.subscribers.set(id, sub);
    let bucket = this.topicIndex.get(topicKey);
    if (!bucket) { bucket = new Set(); this.topicIndex.set(topicKey, bucket); }
    bucket.add(id);
    this.metrics.setActiveSubscriptions(this.subscribers.size);
    this.logger.debug('subscribe', { id, topicKey });
    return id;
  }

  /** Unsubscribe by id. Returns true if removed, false if not present. */
  unsubscribe(id: SubscriptionId): boolean {
    const sub = this.subscribers.get(id);
    if (!sub) return false;
    this.subscribers.delete(id);
    const bucket = this.topicIndex.get(sub.topicKey);
    if (bucket) {
      bucket.delete(id);
      if (bucket.size === 0) this.topicIndex.delete(sub.topicKey);
    }
    this.metrics.setActiveSubscriptions(this.subscribers.size);
    this.logger.debug('unsubscribe', { id });
    return true;
  }

  /** Number of active subscriptions. */
  subscriptionCount(): number { return this.subscribers.size; }

  /** Number of distinct topic keys currently indexed. */
  topicCount(): number { return this.topicIndex.size; }

  /**
   * Publish an event. The event is delivered to every matching subscriber
   * synchronously, in subscription-insertion order within each topic bucket.
   *
   * Performance: O(1) topic lookup, O(k) filter evaluation where k is the
   * number of subscribers indexed under the event's topic plus the wildcard
   * bucket.
   *
   * @returns the number of subscribers the event was delivered to.
   */
  publish(event: NervousEvent): number {
    if (!event || typeof event !== 'object') throw new FabricError('publish(): event must be an object');
    if (typeof event.topic !== 'string' || !event.topic) throw new FabricError('publish(): event.topic must be a non-empty string');
    const start = process.hrtime.bigint();
    this.metrics.recordPublish();
    if (this.recorder.isRecording()) this.recorder.record(event);

    let delivered = 0;
    let errored = 0;

    const exactBucket = this.topicIndex.get(event.topic);
    const wildcardBucket = this.topicIndex.get('*');
    const seen = new Set<SubscriptionId>();

    const runBucket = (bucket: Set<SubscriptionId> | undefined): void => {
      if (!bucket || bucket.size === 0) return;
      // Snapshot the ids so unsubscribe-during-publish is safe.
      const ids = Array.from(bucket);
      for (const id of ids) {
        if (seen.has(id)) continue;
        seen.add(id);
        const sub = this.subscribers.get(id);
        if (!sub) continue;
        let matched = false;
        try { matched = sub.compiled(event); }
        catch (e) {
          errored++;
          const err = e instanceof Error ? e : new FabricError('filter threw', e);
          this.logger.warn('publish: filter threw', { id, error: err.message });
          try { this.ee.emit('error', err, event); } catch { /* noop */ }
          this.metrics.recordDrop();
          continue;
        }
        if (!matched) continue;
        try {
          sub.handler(event);
          delivered++;
          this.metrics.recordDeliver();
        } catch (e) {
          errored++;
          const err = e instanceof Error ? e : new FabricError('handler threw', e);
          this.logger.warn('publish: handler threw', { id, error: err.message });
          try { this.ee.emit('error', err, event); } catch { /* noop */ }
          this.metrics.recordDrop();
        }
      }
    };

    runBucket(exactBucket);
    runBucket(wildcardBucket);

    const elapsedNs = Number(process.hrtime.bigint() - start);
    this.metrics.recordLatency(elapsedNs / 1_000_000);

    if (delivered === 0 && errored === 0) {
      // No subscriber matched — emit a 'dropped' event for observability.
      try { this.ee.emit('dropped', event); } catch { /* noop */ }
    }
    try { this.ee.emit('published', event); } catch { /* noop */ }
    return delivered;
  }

  /** Attach an event source. The source's `start()` is called with a sink
   * that funnels events into this fabric via `publish`. */
  attach(source: EventSource): void {
    if (!source || typeof source !== 'object') throw new FabricError('attach(): source must be an object');
    if (typeof source.id !== 'string' || !source.id) throw new FabricError('attach(): source.id must be non-empty string');
    if (this.sources.has(source.id)) {
      throw new FabricError(`attach(): source '${source.id}' already attached`);
    }
    if (typeof source.start !== 'function' || typeof source.stop !== 'function') {
      throw new FabricError('attach(): source must implement start() and stop()');
    }
    this.sources.set(source.id, source);
    this.metrics.setActiveSources(this.sources.size);
    const sink = (event: NervousEvent): void => {
      try { this.publish(event); }
      catch (e) {
        const err = e instanceof Error ? e : new FabricError('source sink publish failed', e);
        this.logger.warn('source sink error', { sourceId: source.id, error: err.message });
      }
    };
    try {
      source.start(sink);
      this.logger.debug('attached source', { id: source.id });
    } catch (e) {
      this.sources.delete(source.id);
      this.metrics.setActiveSources(this.sources.size);
      throw new FabricError(`attach(): source '${source.id}' start() threw`, e);
    }
  }

  /** Detach a source by id. Calls `stop()` on the source. */
  detach(sourceId: string): boolean {
    const source = this.sources.get(sourceId);
    if (!source) return false;
    try { source.stop(); }
    catch (e) {
      this.logger.warn('source stop threw', { sourceId, error: (e as Error).message });
    }
    this.sources.delete(sourceId);
    this.metrics.setActiveSources(this.sources.size);
    this.logger.debug('detached source', { id: sourceId });
    return true;
  }

  /** Detach all attached sources. */
  detachAll(): void {
    for (const id of Array.from(this.sources.keys())) this.detach(id);
  }

  /** Returns the ids of all attached sources. */
  listSources(): string[] { return Array.from(this.sources.keys()); }

  /** Number of attached sources. */
  sourceCount(): number { return this.sources.size; }

  /** Subscribe to fabric-level events: 'published' | 'error' | 'dropped'. */
  on(event: 'published', handler: (event: NervousEvent) => void): this;
  on(event: 'error', handler: (err: Error, event: NervousEvent) => void): this;
  on(event: 'dropped', handler: (event: NervousEvent) => void): this;
  on(event: string, handler: (...args: any[]) => void): this {
    this.ee.on(event, handler as (...args: unknown[]) => void);
    return this;
  }

  /** Remove a fabric-level event listener. */
  off(event: string, handler: (...args: any[]) => void): this {
    this.ee.off(event, handler as (...args: unknown[]) => void);
    return this;
  }

  /** Detach all sources, stop recording, and remove all subscribers. */
  shutdown(): void {
    this.detachAll();
    this.recorder.stop();
    this.subscribers.clear();
    this.topicIndex.clear();
    this.metrics.setActiveSubscriptions(0);
    this.metrics.setActiveSources(0);
    this.ee.removeAllListeners();
  }
}

/**
 * Decide the topic-index key for a filter. Returns the exact topic string
 * when the filter has a plain string topic, or `'*'` for wildcards, RegExp,
 * and undefined topics.
 */
function indexKeyForFilter(filter: EventFilter): string {
  if (filter.topic === undefined) return '*';
  if (typeof filter.topic === 'string') {
    if (filter.topic === '*') return '*';
    return filter.topic;
  }
  if (filter.topic instanceof RegExp) return '*';
  return '*';
}
