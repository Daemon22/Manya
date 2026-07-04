/**
 * @manya/nervous-system — asynchronous event queue.
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
import type { NervousEvent } from '../types.js';
/** Queue configuration. */
export interface QueueOptions {
    /** Maximum capacity. `0` or `undefined` → unbounded. */
    capacity?: number;
    /** When true, `enqueue()` returns a Promise that resolves once there is room. */
    waitWhenFull?: boolean;
}
/** Default capacity for a bounded queue (when `capacity` is omitted and `waitWhenFull` is true). */
export declare const DEFAULT_QUEUE_CAPACITY = 1024;
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
export declare class EventQueue {
    private readonly buf;
    private readonly capacity;
    private readonly waitWhenFull;
    private readonly waiters;
    private readonly dequeuers;
    private producersPending;
    private stopped;
    constructor(opts?: QueueOptions);
    /** Returns the configured capacity (0 = unbounded). */
    getCapacity(): number;
    /** Whether the queue will block producers when full. */
    isBlocking(): boolean;
    /** Current number of events buffered. */
    size(): number;
    /** Whether the queue is empty. */
    isEmpty(): boolean;
    /** Whether the queue is at capacity. */
    isFull(): boolean;
    /** Whether `stop()` has been called. */
    isStopped(): boolean;
    /**
     * Enqueue an event.
     *
     * - If `waitWhenFull` is false and the queue is full, throws `QueueError`.
     * - If `waitWhenFull` is true and the queue is full, returns a Promise that
     *   resolves once space is available, then enqueues.
     * - Returns `true` synchronously when the event was enqueued immediately.
     */
    enqueue(event: NervousEvent): boolean | Promise<boolean>;
    /**
     * Dequeue the next event. Blocks while the queue is empty (unless stopped).
     * Resolves with `null` if the queue is stopped and empty.
     */
    dequeue(): Promise<NervousEvent | null>;
    /**
     * Resolves when there are no producers pending (i.e., all backpressure
     * has been relieved). The buffer may still contain events — draining the
     * buffer itself is the consumer's responsibility.
     */
    drain(): Promise<void>;
    /** Stop the queue. Pending dequeuers resolve with `null`. Pending enqueues reject. */
    stop(): void;
    /** Clear buffered events. Pending enqueues/dequeues are unaffected. */
    clear(): void;
    private pushInternal;
    private popInternal;
}
//# sourceMappingURL=queue.d.ts.map