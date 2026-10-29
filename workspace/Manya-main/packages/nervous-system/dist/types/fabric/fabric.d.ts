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
import type { EventFilter, EventSource, NervousConfig, NervousEvent, SubscriptionId } from '../types.js';
import type { Logger } from '../logging.js';
import { EventRecorder } from '../recorder/recorder.js';
import { MetricsCollector } from '../metrics/metrics.js';
/** Default configuration values. */
export declare const DEFAULT_NERVOUS_CONFIG: Required<Omit<NervousConfig, 'logger'>>;
/** Built-in EventEmitter events emitted by the fabric itself. */
export interface FabricEmitterEvents {
    /** Emitted after every successful publish. */
    published: (event: NervousEvent) => void;
    /** Emitted when a handler throws. */
    error: (err: Error, event: NervousEvent) => void;
    /** Emitted when an event has no matching subscribers (and was thus dropped). */
    dropped: (event: NervousEvent) => void;
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
export declare class EventFabric {
    private readonly ee;
    private readonly subscribers;
    /** Index from topic-key → subscription ids registered under that key. */
    private readonly topicIndex;
    private readonly sources;
    private readonly logger;
    readonly config: Required<Omit<NervousConfig, 'logger'>>;
    readonly recorder: EventRecorder;
    readonly metrics: MetricsCollector;
    private recordByDefault;
    constructor(config?: NervousConfig);
    /** The configured logger. */
    getLogger(): Logger;
    /** Whether the fabric is currently auto-recording published events. */
    isRecording(): boolean;
    /** Start auto-recording published events. */
    startRecording(): void;
    /** Stop auto-recording. Recorded events are preserved. */
    stopRecording(): void;
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
    /** Unsubscribe by id. Returns true if removed, false if not present. */
    unsubscribe(id: SubscriptionId): boolean;
    /** Number of active subscriptions. */
    subscriptionCount(): number;
    /** Number of distinct topic keys currently indexed. */
    topicCount(): number;
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
    publish(event: NervousEvent): number;
    /** Attach an event source. The source's `start()` is called with a sink
     * that funnels events into this fabric via `publish`. */
    attach(source: EventSource): void;
    /** Detach a source by id. Calls `stop()` on the source. */
    detach(sourceId: string): boolean;
    /** Detach all attached sources. */
    detachAll(): void;
    /** Returns the ids of all attached sources. */
    listSources(): string[];
    /** Number of attached sources. */
    sourceCount(): number;
    /** Subscribe to fabric-level events: 'published' | 'error' | 'dropped'. */
    on(event: 'published', handler: (event: NervousEvent) => void): this;
    on(event: 'error', handler: (err: Error, event: NervousEvent) => void): this;
    on(event: 'dropped', handler: (event: NervousEvent) => void): this;
    /** Remove a fabric-level event listener. */
    off(event: string, handler: (...args: any[]) => void): this;
    /** Detach all sources, stop recording, and remove all subscribers. */
    shutdown(): void;
}
//# sourceMappingURL=fabric.d.ts.map