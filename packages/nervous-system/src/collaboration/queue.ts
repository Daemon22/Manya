/**
 * @manya-os/nervous-system — collaboration request queue.
 *
 * A bounded queue with TTL for inter-instance collaboration requests.
 * Supports reconnect surfacing and automatic expiry of stale requests.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import type { CollaborationRequestEvent, CollaborationRequestStatus, TrackedCollaborationRequest } from '../types.js';
import { QueueError } from '../errors.js';

export interface CollaborationQueueOptions {
  /** Maximum queue capacity (default 256). */
  capacity?: number;
  /** TTL in ms for requests (default 300_000 = 5 min). */
  ttlMs?: number;
}

const DEFAULT_COLLABORATION_QUEUE_CAPACITY = 256;
const DEFAULT_COLLABORATION_REQUEST_TTL_MS = 300_000;

/**
 * A bounded, TTL-aware queue for collaboration requests between instances.
 * Automatically expires stale requests and supports reconnect surfacing.
 */
export class CollaborationRequestQueue {
  private readonly queue: TrackedCollaborationRequest[] = [];
  private readonly capacity: number;
  private readonly ttlMs: number;
  private readonly pending = new Map<string, {
    resolve: (v: TrackedCollaborationRequest | null) => void;
    reject: (e: Error) => void;
    timer: NodeJS.Timeout;
  }>();

  constructor(opts?: CollaborationQueueOptions) {
    this.capacity = opts?.capacity ?? DEFAULT_COLLABORATION_QUEUE_CAPACITY;
    this.ttlMs = opts?.ttlMs ?? DEFAULT_COLLABORATION_REQUEST_TTL_MS;
  }

  /**
   * Enqueue a collaboration request. Returns the tracked request.
   * If the queue is full, throws QueueError.
   */
  enqueue(event: CollaborationRequestEvent): TrackedCollaborationRequest {
    this.evictExpired();

    if (this.queue.length >= this.capacity) {
      throw new QueueError(`collaboration queue is full (${this.capacity})`);
    }

    const tracked: TrackedCollaborationRequest = {
      event,
      status: 'pending',
      updatedAt: Date.now(),
    };

    this.queue.push(tracked);

    // Wake up a waiting dequeuer if any.
    const waiter = this.pending.values().next().value;
    if (waiter) {
      this.pending.delete(this.pending.keys().next().value!);
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
  dequeue(): Promise<TrackedCollaborationRequest | null> {
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
    return new Promise<TrackedCollaborationRequest | null>((resolve, reject) => {
      const timer = setTimeout(() => {
        if (this.pending.has(key)) {
          this.pending.delete(key);
          resolve(null);
        }
      }, this.ttlMs);
      if (typeof timer.unref === 'function') timer.unref();
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
  complete(requestId: string): boolean {
    const tracked = this.queue.find(r => r.event.id === requestId);
    if (!tracked) return false;
    tracked.status = 'completed';
    tracked.updatedAt = Date.now();
    return true;
  }

  /**
   * Mark a request as failed and schedule for retry.
   */
  fail(requestId: string, error: string): boolean {
    const tracked = this.queue.find(r => r.event.id === requestId);
    if (!tracked) return false;
    tracked.status = 'failed';
    tracked.error = error;
    tracked.updatedAt = Date.now();
    return true;
  }

  /**
   * Mark a failed request for retry. The request becomes eligible for
   * re-dequeue with isReconnect=true.
   */
  retry(requestId: string): boolean {
    const tracked = this.queue.find(r => r.event.id === requestId);
    if (!tracked || tracked.status !== 'failed') return false;
    tracked.status = 'retrying';
    tracked.event.isReconnect = true;
    tracked.event.retryCount = (tracked.event.retryCount ?? 0) + 1;
    tracked.updatedAt = Date.now();

    // Wake up a waiter.
    const waiter = this.pending.values().next().value;
    if (waiter) {
      this.pending.delete(this.pending.keys().next().value!);
      clearTimeout(waiter.timer);
      waiter.resolve(tracked);
    }

    return true;
  }

  /**
   * Surface reconnect requests — return all requests marked for retry.
   */
  surfaceReconnects(): TrackedCollaborationRequest[] {
    return this.queue.filter(r => r.status === 'retrying');
  }

  /** Get all tracked requests. */
  all(): TrackedCollaborationRequest[] {
    this.evictExpired();
    return [...this.queue];
  }

  /** Get requests by status. */
  byStatus(status: CollaborationRequestStatus): TrackedCollaborationRequest[] {
    return this.all().filter(r => r.status === status);
  }

  /** Current queue size (including non-pending items). */
  size(): number {
    this.evictExpired();
    return this.queue.length;
  }

  /** Remove completed and expired items from the queue. */
  gc(): number {
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
  pendingWaiters(): number {
    return this.pending.size;
  }

  /** Clear the queue and reject all pending waiters. */
  stop(): void {
    this.queue.length = 0;
    for (const [, w] of this.pending) {
      clearTimeout(w.timer);
      w.reject(new QueueError('queue stopped'));
    }
    this.pending.clear();
  }

  // ----- internal -----

  private evictExpired(): void {
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
