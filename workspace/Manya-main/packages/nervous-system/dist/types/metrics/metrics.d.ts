/**
 * @manya/nervous-system — performance metrics.
 *
 * `MetricsCollector` tracks publish/deliver/drop counts plus a latency
 * ring buffer used to compute average, p50, and p99 latencies.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Conceived, directed, and owned by Uviwe Menyiwe (Azura Daemon),
 * founder of the Manya Hael Foundation.
 *
 * Licensed under the Apache License, Version 2.0.
 */
import type { FabricMetrics } from '../types.js';
/** Default ring-buffer size for latency samples. */
export declare const DEFAULT_LATENCY_BUFFER = 1024;
/** Default sampling frequency (1 in N events) for latency tracking. */
export declare const DEFAULT_LATENCY_SAMPLE_EVERY = 1;
/**
 * Lightweight per-event latency tracker with a fixed-size ring buffer.
 *
 * Performance: O(1) per record, O(N log N) per percentile query (sorts a copy).
 */
export declare class MetricsCollector {
    private readonly buffer;
    private readonly capacity;
    private readonly sampleEvery;
    private head;
    private filled;
    private published;
    private delivered;
    private dropped;
    private activeSubscriptions;
    private activeSources;
    private sampledCount;
    private sampleCounter;
    constructor(capacity?: number, sampleEvery?: number);
    /** Increment the published-events counter. */
    recordPublish(): void;
    /** Increment the delivered-events counter (one per successful subscriber delivery). */
    recordDeliver(): void;
    /** Increment the dropped-events counter (e.g. due to handler throw or backpressure). */
    recordDrop(): void;
    /** Set the current active-subscription gauge. */
    setActiveSubscriptions(n: number): void;
    /** Increment the active-subscriptions gauge by 1. */
    incSubscription(): void;
    /** Decrement the active-subscriptions gauge by 1 (floor at 0). */
    decSubscription(): void;
    /** Set the current active-sources gauge. */
    setActiveSources(n: number): void;
    /** Increment active sources. */
    incSource(): void;
    /** Decrement active sources (floor at 0). */
    decSource(): void;
    /**
     * Record a latency sample (ms). Sampling may be applied per the configured
     * `sampleEvery` to amortize overhead in high-throughput workloads.
     */
    recordLatency(ms: number): void;
    /** Returns the number of latency samples currently stored. */
    sampleCount(): number;
    /** Returns the total number of latency samples ever observed (including unsampled). */
    totalSamplesObserved(): number;
    /** Compute the average latency across stored samples. */
    avgLatency(): number;
    /** Compute the p-th percentile latency (0 ≤ p ≤ 100) across stored samples. */
    percentile(p: number): number;
    /** Snapshot the current metrics. */
    snapshot(): FabricMetrics;
    /** Reset every counter and clear the latency buffer. */
    reset(): void;
}
//# sourceMappingURL=metrics.d.ts.map