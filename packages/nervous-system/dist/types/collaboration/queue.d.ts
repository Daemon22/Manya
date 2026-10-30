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
export interface CollaborationQueueOptions {
    /** Maximum queue capacity (default 256). */
    capacity?: number;
    /** TTL in ms for requests (default 300_000 = 5 min). */
    ttlMs?: number;
}
/**
 * A bounded, TTL-aware queue for collaboration requests between instances.
 * Automatically expires stale requests and supports reconnect surfacing.
 */
export declare class CollaborationRequestQueue {
    private readonly queue;
    private readonly capacity;
    private readonly ttlMs;
    private readonly pending;
    constructor(opts?: CollaborationQueueOptions);
    /**
     * Enqueue a collaboration request. Returns the tracked request.
     * If the queue is full, throws QueueError.
     */
    enqueue(event: CollaborationRequestEvent): TrackedCollaborationRequest;
    /**
     * Dequeue the next pending request. Blocks (returns a Promise) if the queue
     * is empty. Resolves with null if the queue is stopped or drained with no
     * more pending requests.
     */
    dequeue(): Promise<TrackedCollaborationRequest | null>;
    /**
     * Mark a request as completed.
     */
    complete(requestId: string): boolean;
    /**
     * Mark a request as failed and schedule for retry.
     */
    fail(requestId: string, error: string): boolean;
    /**
     * Mark a failed request for retry. The request becomes eligible for
     * re-dequeue with isReconnect=true.
     */
    retry(requestId: string): boolean;
    /**
     * Surface reconnect requests — return all requests marked for retry.
     */
    surfaceReconnects(): TrackedCollaborationRequest[];
    /** Get all tracked requests. */
    all(): TrackedCollaborationRequest[];
    /** Get requests by status. */
    byStatus(status: CollaborationRequestStatus): TrackedCollaborationRequest[];
    /** Current queue size (including non-pending items). */
    size(): number;
    /** Remove completed and expired items from the queue. */
    gc(): number;
    /** Number of pending waiters. */
    pendingWaiters(): number;
    /** Clear the queue and reject all pending waiters. */
    stop(): void;
    private evictExpired;
}
//# sourceMappingURL=queue.d.ts.map