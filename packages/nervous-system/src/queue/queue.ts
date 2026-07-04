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
import { QueueError } from '../errors.js';

/** Queue configuration. */
export interface QueueOptions {
  /** Maximum capacity. `0` or `undefined` → unbounded. */
  capacity?: number;
  /** When true, `enqueue()` returns a Promise that resolves once there is room. */
  waitWhenFull?: boolean;
}

interface Waiter { resolve: () => void; reject: (e: Error) => void; }

/** Default capacity for a bounded queue (when `capacity` is omitted and `waitWhenFull` is true). */
export const DEFAULT_QUEUE_CAPACITY = 1024;

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
export class EventQueue {
  private readonly buf: NervousEvent[] = [];
  private readonly capacity: number;
  private readonly waitWhenFull: boolean;
  private readonly waiters: Waiter[] = [];
  private readonly dequeuers: Array<{ resolve: (e: NervousEvent | null) => void; reject: (e: Error) => void }> = [];
  private producersPending = 0;
  private stopped = false;

  constructor(opts?: QueueOptions) {
    const o = opts ?? {};
    this.waitWhenFull = !!o.waitWhenFull;
    if (o.capacity !== undefined && (!Number.isInteger(o.capacity) || o.capacity < 0)) {
      throw new QueueError('capacity must be a non-negative integer');
    }
    this.capacity = o.capacity && o.capacity > 0 ? o.capacity : (this.waitWhenFull ? DEFAULT_QUEUE_CAPACITY : 0);
  }

  /** Returns the configured capacity (0 = unbounded). */
  getCapacity(): number { return this.capacity; }

  /** Whether the queue will block producers when full. */
  isBlocking(): boolean { return this.waitWhenFull; }

  /** Current number of events buffered. */
  size(): number { return this.buf.length; }

  /** Whether the queue is empty. */
  isEmpty(): boolean { return this.buf.length === 0; }

  /** Whether the queue is at capacity. */
  isFull(): boolean { return this.capacity > 0 && this.buf.length >= this.capacity; }

  /** Whether `stop()` has been called. */
  isStopped(): boolean { return this.stopped; }

  /**
   * Enqueue an event.
   *
   * - If `waitWhenFull` is false and the queue is full, throws `QueueError`.
   * - If `waitWhenFull` is true and the queue is full, returns a Promise that
   *   resolves once space is available, then enqueues.
   * - Returns `true` synchronously when the event was enqueued immediately.
   */
  enqueue(event: NervousEvent): boolean | Promise<boolean> {
    if (this.stopped) throw new QueueError('enqueue(): queue is stopped');
    if (!event || typeof event !== 'object') throw new QueueError('enqueue(): event must be an object');
    if (this.capacity === 0 || this.buf.length < this.capacity) {
      this.pushInternal(event);
      return true;
    }
    if (!this.waitWhenFull) {
      throw new QueueError('enqueue(): queue is full');
    }
    this.producersPending++;
    return new Promise<boolean>((resolve, reject) => {
      this.waiters.push({
        resolve: () => {
          this.producersPending--;
          try {
            this.pushInternal(event);
            resolve(true);
          } catch (e) {
            reject(e instanceof Error ? e : new QueueError('enqueue failed', e));
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
  dequeue(): Promise<NervousEvent | null> {
    if (this.buf.length > 0) {
      return Promise.resolve(this.popInternal());
    }
    if (this.stopped) return Promise.resolve(null);
    return new Promise<NervousEvent | null>((resolve, reject) => {
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
  async drain(): Promise<void> {
    while (this.producersPending > 0 || this.waiters.length > 0) {
      await nextTick();
    }
  }

  /** Stop the queue. Pending dequeuers resolve with `null`. Pending enqueues reject. */
  stop(): void {
    if (this.stopped) return;
    this.stopped = true;
    for (const w of this.waiters) w.reject(new QueueError('queue stopped'));
    this.waiters.length = 0;
    for (const d of this.dequeuers) d.resolve(null);
    this.dequeuers.length = 0;
  }

  /** Clear buffered events. Pending enqueues/dequeues are unaffected. */
  clear(): void { this.buf.length = 0; }

  // ----- internal helpers -----

  private pushInternal(event: NervousEvent): void {
    this.buf.push(event);
    // If a dequeuer is waiting, hand off immediately.
    if (this.dequeuers.length > 0) {
      const next = this.dequeuers.shift()!;
      const e = this.buf.shift()!;
      next.resolve(e);
    }
  }

  private popInternal(): NervousEvent {
    const e = this.buf.shift()!;
    // Free up a producer if one is blocked.
    if (this.waiters.length > 0) {
      const w = this.waiters.shift()!;
      w.resolve();
    }
    return e;
  }
}

function nextTick(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}
