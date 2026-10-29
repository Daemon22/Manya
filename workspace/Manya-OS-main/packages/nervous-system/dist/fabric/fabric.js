"use strict";
/**
 * @manya-os/nervous-system — core event fabric.
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventFabric = exports.DEFAULT_NERVOUS_CONFIG = void 0;
const node_events_1 = require("node:events");
const node_crypto_1 = require("node:crypto");
const errors_js_1 = require("../errors.js");
const logging_js_1 = require("../logging.js");
const filter_js_1 = require("../filter/filter.js");
const recorder_js_1 = require("../recorder/recorder.js");
const metrics_js_1 = require("../metrics/metrics.js");
/** Default configuration values. */
exports.DEFAULT_NERVOUS_CONFIG = {
    defaultMaxSize: recorder_js_1.DEFAULT_RECORDER_MAX_SIZE,
    recordByDefault: false,
    logLevel: 'info',
    collaborationQueueCapacity: 256,
    collaborationRequestTtlMs: 300_000,
};
let subscriptionCounter = 0;
function newSubscriptionId() {
    subscriptionCounter++;
    try {
        if (typeof node_crypto_1.randomUUID === 'function')
            return `sub-${(0, node_crypto_1.randomUUID)()}`;
    }
    catch { /* fallthrough */ }
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
class EventFabric {
    ee = new node_events_1.EventEmitter();
    subscribers = new Map();
    /** Index from topic-key → subscription ids registered under that key. */
    topicIndex = new Map();
    sources = new Map();
    logger;
    config;
    recorder;
    metrics;
    recordByDefault;
    constructor(config) {
        const merged = { ...exports.DEFAULT_NERVOUS_CONFIG, ...(config ?? {}) };
        this.config = merged;
        this.logger = config?.logger ?? (merged.logLevel === 'silent' ? new logging_js_1.SilentLogger() : new logging_js_1.ConsoleLogger(merged.logLevel));
        this.recorder = new recorder_js_1.EventRecorder(merged.defaultMaxSize);
        this.metrics = new metrics_js_1.MetricsCollector();
        this.recordByDefault = !!merged.recordByDefault;
        if (this.recordByDefault)
            this.recorder.start();
        this.ee.setMaxListeners(0);
    }
    /** The configured logger. */
    getLogger() { return this.logger; }
    /** Whether the fabric is currently auto-recording published events. */
    isRecording() { return this.recorder.isRecording(); }
    /** Start auto-recording published events. */
    startRecording() { this.recorder.start(); }
    /** Stop auto-recording. Recorded events are preserved. */
    stopRecording() { this.recorder.stop(); }
    subscribe(filter, idOrHandler, maybeHandler) {
        if (!filter || typeof filter !== 'object')
            throw new errors_js_1.FabricError('subscribe(): filter must be an object');
        let id;
        let handler;
        if (typeof idOrHandler === 'function') {
            id = newSubscriptionId();
            handler = idOrHandler;
        }
        else if (typeof idOrHandler === 'string' && typeof maybeHandler === 'function') {
            id = idOrHandler;
            handler = maybeHandler;
            if (this.subscribers.has(id)) {
                throw new errors_js_1.FabricError(`subscribe(): subscription id '${id}' already exists`);
            }
        }
        else {
            throw new errors_js_1.FabricError('subscribe(): invalid arguments');
        }
        if (typeof handler !== 'function')
            throw new errors_js_1.FabricError('subscribe(): handler must be a function');
        const compiled = (0, filter_js_1.compileFilter)(filter);
        const topicKey = indexKeyForFilter(filter);
        const sub = { id, filter, compiled, handler, topicKey };
        this.subscribers.set(id, sub);
        let bucket = this.topicIndex.get(topicKey);
        if (!bucket) {
            bucket = new Set();
            this.topicIndex.set(topicKey, bucket);
        }
        bucket.add(id);
        this.metrics.setActiveSubscriptions(this.subscribers.size);
        this.logger.debug('subscribe', { id, topicKey });
        return id;
    }
    /** Unsubscribe by id. Returns true if removed, false if not present. */
    unsubscribe(id) {
        const sub = this.subscribers.get(id);
        if (!sub)
            return false;
        this.subscribers.delete(id);
        const bucket = this.topicIndex.get(sub.topicKey);
        if (bucket) {
            bucket.delete(id);
            if (bucket.size === 0)
                this.topicIndex.delete(sub.topicKey);
        }
        this.metrics.setActiveSubscriptions(this.subscribers.size);
        this.logger.debug('unsubscribe', { id });
        return true;
    }
    /** Number of active subscriptions. */
    subscriptionCount() { return this.subscribers.size; }
    /** Number of distinct topic keys currently indexed. */
    topicCount() { return this.topicIndex.size; }
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
    publish(event) {
        if (!event || typeof event !== 'object')
            throw new errors_js_1.FabricError('publish(): event must be an object');
        if (typeof event.topic !== 'string' || !event.topic)
            throw new errors_js_1.FabricError('publish(): event.topic must be a non-empty string');
        const start = process.hrtime.bigint();
        this.metrics.recordPublish();
        if (this.recorder.isRecording())
            this.recorder.record(event);
        let delivered = 0;
        let errored = 0;
        const exactBucket = this.topicIndex.get(event.topic);
        const wildcardBucket = this.topicIndex.get('*');
        const seen = new Set();
        const runBucket = (bucket) => {
            if (!bucket || bucket.size === 0)
                return;
            // Snapshot the ids so unsubscribe-during-publish is safe.
            const ids = Array.from(bucket);
            for (const id of ids) {
                if (seen.has(id))
                    continue;
                seen.add(id);
                const sub = this.subscribers.get(id);
                if (!sub)
                    continue;
                let matched = false;
                try {
                    matched = sub.compiled(event);
                }
                catch (e) {
                    errored++;
                    const err = e instanceof Error ? e : new errors_js_1.FabricError('filter threw', e);
                    this.logger.warn('publish: filter threw', { id, error: err.message });
                    try {
                        this.ee.emit('error', err, event);
                    }
                    catch { /* noop */ }
                    this.metrics.recordDrop();
                    continue;
                }
                if (!matched)
                    continue;
                try {
                    sub.handler(event);
                    delivered++;
                    this.metrics.recordDeliver();
                }
                catch (e) {
                    errored++;
                    const err = e instanceof Error ? e : new errors_js_1.FabricError('handler threw', e);
                    this.logger.warn('publish: handler threw', { id, error: err.message });
                    try {
                        this.ee.emit('error', err, event);
                    }
                    catch { /* noop */ }
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
            try {
                this.ee.emit('dropped', event);
            }
            catch { /* noop */ }
        }
        try {
            this.ee.emit('published', event);
        }
        catch { /* noop */ }
        return delivered;
    }
    /** Attach an event source. The source's `start()` is called with a sink
     * that funnels events into this fabric via `publish`. */
    attach(source) {
        if (!source || typeof source !== 'object')
            throw new errors_js_1.FabricError('attach(): source must be an object');
        if (typeof source.id !== 'string' || !source.id)
            throw new errors_js_1.FabricError('attach(): source.id must be non-empty string');
        if (this.sources.has(source.id)) {
            throw new errors_js_1.FabricError(`attach(): source '${source.id}' already attached`);
        }
        if (typeof source.start !== 'function' || typeof source.stop !== 'function') {
            throw new errors_js_1.FabricError('attach(): source must implement start() and stop()');
        }
        this.sources.set(source.id, source);
        this.metrics.setActiveSources(this.sources.size);
        const sink = (event) => {
            try {
                this.publish(event);
            }
            catch (e) {
                const err = e instanceof Error ? e : new errors_js_1.FabricError('source sink publish failed', e);
                this.logger.warn('source sink error', { sourceId: source.id, error: err.message });
            }
        };
        try {
            source.start(sink);
            this.logger.debug('attached source', { id: source.id });
        }
        catch (e) {
            this.sources.delete(source.id);
            this.metrics.setActiveSources(this.sources.size);
            throw new errors_js_1.FabricError(`attach(): source '${source.id}' start() threw`, e);
        }
    }
    /** Detach a source by id. Calls `stop()` on the source. */
    detach(sourceId) {
        const source = this.sources.get(sourceId);
        if (!source)
            return false;
        try {
            source.stop();
        }
        catch (e) {
            this.logger.warn('source stop threw', { sourceId, error: e.message });
        }
        this.sources.delete(sourceId);
        this.metrics.setActiveSources(this.sources.size);
        this.logger.debug('detached source', { id: sourceId });
        return true;
    }
    /** Detach all attached sources. */
    detachAll() {
        for (const id of Array.from(this.sources.keys()))
            this.detach(id);
    }
    /** Returns the ids of all attached sources. */
    listSources() { return Array.from(this.sources.keys()); }
    /** Number of attached sources. */
    sourceCount() { return this.sources.size; }
    on(event, handler) {
        this.ee.on(event, handler);
        return this;
    }
    /** Remove a fabric-level event listener. */
    off(event, handler) {
        this.ee.off(event, handler);
        return this;
    }
    /** Detach all sources, stop recording, and remove all subscribers. */
    shutdown() {
        this.detachAll();
        this.recorder.stop();
        this.subscribers.clear();
        this.topicIndex.clear();
        this.metrics.setActiveSubscriptions(0);
        this.metrics.setActiveSources(0);
        this.ee.removeAllListeners();
    }
}
exports.EventFabric = EventFabric;
/**
 * Decide the topic-index key for a filter. Returns the exact topic string
 * when the filter has a plain string topic, or `'*'` for wildcards, RegExp,
 * and undefined topics.
 */
function indexKeyForFilter(filter) {
    if (filter.topic === undefined)
        return '*';
    if (typeof filter.topic === 'string') {
        if (filter.topic === '*')
            return '*';
        return filter.topic;
    }
    if (filter.topic instanceof RegExp)
        return '*';
    return '*';
}
//# sourceMappingURL=fabric.js.map