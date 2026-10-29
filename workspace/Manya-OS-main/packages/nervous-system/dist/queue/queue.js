"use strict";
/**
 * @manya-os/nervous-system — asynchronous event queue.
 *
 * A bounded/unbounded FIFO queue of events with promise-based blocking
 * dequeue, drain semantics, and configurable backpressure via the
 * `waitWhenFull` option.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Conceived, directed, and owned by Uviwe Menyiwe (Azura Daemon),
 * founder of the Manya Hael Foundation.
 *
 * Licensed under the Apache License, Version 2.0.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventQueue = exports.DEFAULT_QUEUE_CAPACITY = void 0;
const errors_js_1 = require("../errors.js");
/** Default capacity for a bounded queue (when `capacity` is omitted and `waitWhenFull` is true). */
exports.DEFAULT_QUEUE_CAPACITY = 1024;
/**
 * FIFO event queue with promise-based blocking dequeue.
 *
 * - `enqueue(event)`: returns `true` if accepted, or — when `waitWhenFull`
 *   is true — a Promise that resolves when room is available.
 * - `dequeue()`: returns a Promise that resolves to the next event. Blocks
 *   while the queue is empty.
 * - `drain()`: resolves when the queue is empty AND no producers are pending.
 * - `size()`: O(1).
 */
class EventQueue {
    buf = [];
    capacity;
    waitWhenFull;
    waiters = [];
    dequeuers = [];
    producersPending = 0;
    stopped = false;
    constructor(opts) {
        const o = opts ?? {};
        this.waitWhenFull = !!o.waitWhenFull;
        if (o.capacity !== undefined && (!Number.isInteger(o.capacity) || o.capacity < 0)) {
            throw new errors_js_1.QueueError('capacity must be a non-negative integer');
        }
        this.capacity = o.capacity && o.capacity > 0 ? o.capacity : (this.waitWhenFull ? exports.DEFAULT_QUEUE_CAPACITY : 0);
    }
    /** Returns the configured capacity (0 = unbounded). */
    getCapacity() { return this.capacity; }
    /** Whether the queue will block producers when full. */
    isBlocking() { return this.waitWhenFull; }
    /** Current number of events buffered. */
    size() { return this.buf.length; }
    /** Whether the queue is empty. */
    isEmpty() { return this.buf.length === 0; }
    /** Whether the queue is at capacity. */
    isFull() { return this.capacity > 0 && this.buf.length >= this.capacity; }
    /** Whether `stop()` has been called. */
    isStopped() { return this.stopped; }
    /**
     * Enqueue an event.
     *
     * - If `waitWhenFull` is false and the queue is full, throws `QueueError`.
     * - If `waitWhenFull` is true and the queue is full, returns a Promise that
     *   resolves once space is available, then enqueues.
     * - Returns `true` synchronously when the event was enqueued immediately.
     */
    enqueue(event) {
        if (this.stopped)
            throw new errors_js_1.QueueError('enqueue(): queue is stopped');
        if (!event || typeof event !== 'object')
            throw new errors_js_1.QueueError('enqueue(): event must be an object');
        if (this.capacity === 0 || this.buf.length < this.capacity) {
            this.pushInternal(event);
            return true;
        }
        if (!this.waitWhenFull) {
            throw new errors_js_1.QueueError('enqueue(): queue is full');
        }
        this.producersPending++;
        return new Promise((resolve, reject) => {
            this.waiters.push({
                resolve: () => {
                    this.producersPending--;
                    try {
                        this.pushInternal(event);
                        resolve(true);
                    }
                    catch (e) {
                        reject(e instanceof Error ? e : new errors_js_1.QueueError('enqueue failed', e));
                    }
                },
                reject: (e) => { this.producersPending--; reject(e); },
            });
        });
    }
    /**
     * Dequeue the next event. Blocks while the queue is empty (unless stopped).
     * Resolves with `null` if the queue is stopped and empty.
     */
    dequeue() {
        if (this.buf.length > 0) {
            return Promise.resolve(this.popInternal());
        }
        if (this.stopped)
            return Promise.resolve(null);
        return new Promise((resolve, reject) => {
            this.dequeuers.push({
                resolve: (e) => resolve(e),
                reject: (e) => reject(e),
            });
        });
    }
    /**
     * Resolves when there are no producers pending (i.e., all backpressure
     * has been relieved). The buffer may still contain events — draining the
     * buffer itself is the consumer's responsibility.
     */
    async drain() {
        while (this.producersPending > 0 || this.waiters.length > 0) {
            await nextTick();
        }
    }
    /** Stop the queue. Pending dequeuers resolve with `null`. Pending enqueues reject. */
    stop() {
        if (this.stopped)
            return;
        this.stopped = true;
        for (const w of this.waiters)
            w.reject(new errors_js_1.QueueError('queue stopped'));
        this.waiters.length = 0;
        for (const d of this.dequeuers)
            d.resolve(null);
        this.dequeuers.length = 0;
    }
    /** Clear buffered events. Pending enqueues/dequeues are unaffected. */
    clear() { this.buf.length = 0; }
    // ----- internal helpers -----
    pushInternal(event) {
        this.buf.push(event);
        // If a dequeuer is waiting, hand off immediately.
        if (this.dequeuers.length > 0) {
            const next = this.dequeuers.shift();
            const e = this.buf.shift();
            next.resolve(e);
        }
    }
    popInternal() {
        const e = this.buf.shift();
        // Free up a producer if one is blocked.
        if (this.waiters.length > 0) {
            const w = this.waiters.shift();
            w.resolve();
        }
        return e;
    }
}
exports.EventQueue = EventQueue;
function nextTick() {
    return new Promise((resolve) => setImmediate(resolve));
}
//# sourceMappingURL=queue.js.map