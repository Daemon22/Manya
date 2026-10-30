"use strict";
/**
 * @manya-os/nervous-system — collaboration request queue.
 *
 * A bounded queue with TTL for inter-instance collaboration requests.
 * Supports reconnect surfacing and automatic expiry of stale requests.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CollaborationRequestQueue = void 0;
const errors_js_1 = require("../errors.js");
const DEFAULT_COLLABORATION_QUEUE_CAPACITY = 256;
const DEFAULT_COLLABORATION_REQUEST_TTL_MS = 300_000;
/**
 * A bounded, TTL-aware queue for collaboration requests between instances.
 * Automatically expires stale requests and supports reconnect surfacing.
 */
class CollaborationRequestQueue {
    queue = [];
    capacity;
    ttlMs;
    pending = new Map();
    constructor(opts) {
        this.capacity = opts?.capacity ?? DEFAULT_COLLABORATION_QUEUE_CAPACITY;
        this.ttlMs = opts?.ttlMs ?? DEFAULT_COLLABORATION_REQUEST_TTL_MS;
    }
    /**
     * Enqueue a collaboration request. Returns the tracked request.
     * If the queue is full, throws QueueError.
     */
    enqueue(event) {
        this.evictExpired();
        if (this.queue.length >= this.capacity) {
            throw new errors_js_1.QueueError(`collaboration queue is full (${this.capacity})`);
        }
        const tracked = {
            event,
            status: 'pending',
            updatedAt: Date.now(),
        };
        this.queue.push(tracked);
        // Wake up a waiting dequeuer if any.
        const waiter = this.pending.values().next().value;
        if (waiter) {
            this.pending.delete(this.pending.keys().next().value);
            clearTimeout(waiter.timer);
            waiter.resolve(tracked);
        }
        return tracked;
    }
    /**
     * Dequeue the next pending request. Blocks (returns a Promise) if the queue
     * is empty. Resolves with null if the queue is stopped or drained with no
     * more pending requests.
     */
    dequeue() {
        this.evictExpired();
        // Return immediately if something is available.
        const next = this.queue.find(r => r.status === 'pending');
        if (next) {
            next.status = 'processing';
            next.updatedAt = Date.now();
            return Promise.resolve(next);
        }
        // Check for reconnect requests that have been retried.
        const reconnect = this.queue.find(r => r.status === 'retrying');
        if (reconnect) {
            reconnect.status = 'processing';
            reconnect.updatedAt = Date.now();
            return Promise.resolve(reconnect);
        }
        // Nothing available — register a waiter.
        const key = `waiter_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                if (this.pending.has(key)) {
                    this.pending.delete(key);
                    resolve(null);
                }
            }, this.ttlMs);
            if (typeof timer.unref === 'function')
                timer.unref();
            this.pending.set(key, {
                resolve: (v) => resolve(v),
                reject: (e) => reject(e),
                timer,
            });
        });
    }
    /**
     * Mark a request as completed.
     */
    complete(requestId) {
        const tracked = this.queue.find(r => r.event.id === requestId);
        if (!tracked)
            return false;
        tracked.status = 'completed';
        tracked.updatedAt = Date.now();
        return true;
    }
    /**
     * Mark a request as failed and schedule for retry.
     */
    fail(requestId, error) {
        const tracked = this.queue.find(r => r.event.id === requestId);
        if (!tracked)
            return false;
        tracked.status = 'failed';
        tracked.error = error;
        tracked.updatedAt = Date.now();
        return true;
    }
    /**
     * Mark a failed request for retry. The request becomes eligible for
     * re-dequeue with isReconnect=true.
     */
    retry(requestId) {
        const tracked = this.queue.find(r => r.event.id === requestId);
        if (!tracked || tracked.status !== 'failed')
            return false;
        tracked.status = 'retrying';
        tracked.event.isReconnect = true;
        tracked.event.retryCount = (tracked.event.retryCount ?? 0) + 1;
        tracked.updatedAt = Date.now();
        // Wake up a waiter.
        const waiter = this.pending.values().next().value;
        if (waiter) {
            this.pending.delete(this.pending.keys().next().value);
            clearTimeout(waiter.timer);
            waiter.resolve(tracked);
        }
        return true;
    }
    /**
     * Surface reconnect requests — return all requests marked for retry.
     */
    surfaceReconnects() {
        return this.queue.filter(r => r.status === 'retrying');
    }
    /** Get all tracked requests. */
    all() {
        this.evictExpired();
        return [...this.queue];
    }
    /** Get requests by status. */
    byStatus(status) {
        return this.all().filter(r => r.status === status);
    }
    /** Current queue size (including non-pending items). */
    size() {
        this.evictExpired();
        return this.queue.length;
    }
    /** Remove completed and expired items from the queue. */
    gc() {
        const before = this.queue.length;
        this.evictExpired();
        // Remove completed items.
        for (let i = this.queue.length - 1; i >= 0; i--) {
            if (this.queue[i].status === 'completed') {
                this.queue.splice(i, 1);
            }
        }
        return before - this.queue.length;
    }
    /** Number of pending waiters. */
    pendingWaiters() {
        return this.pending.size;
    }
    /** Clear the queue and reject all pending waiters. */
    stop() {
        this.queue.length = 0;
        for (const [, w] of this.pending) {
            clearTimeout(w.timer);
            w.reject(new errors_js_1.QueueError('queue stopped'));
        }
        this.pending.clear();
    }
    // ----- internal -----
    evictExpired() {
        const now = Date.now();
        for (let i = this.queue.length - 1; i >= 0; i--) {
            const r = this.queue[i];
            if (r.status === 'pending' && now > r.event.expiresAt) {
                r.status = 'expired';
                r.updatedAt = now;
            }
        }
    }
}
exports.CollaborationRequestQueue = CollaborationRequestQueue;
//# sourceMappingURL=queue.js.map