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
export const DEFAULT_LATENCY_BUFFER = 1024;

/** Default sampling frequency (1 in N events) for latency tracking. */
export const DEFAULT_LATENCY_SAMPLE_EVERY = 1;

/**
 * Lightweight per-event latency tracker with a fixed-size ring buffer.
 *
 * Performance: O(1) per record, O(N log N) per percentile query (sorts a copy).
 */
export class MetricsCollector {
  private readonly buffer: Float64Array;
  private readonly capacity: number;
  private readonly sampleEvery: number;
  private head = 0;
  private filled = 0;
  private published = 0;
  private delivered = 0;
  private dropped = 0;
  private activeSubscriptions = 0;
  private activeSources = 0;
  private sampledCount = 0;
  private sampleCounter = 0;

  constructor(capacity: number = DEFAULT_LATENCY_BUFFER, sampleEvery: number = DEFAULT_LATENCY_SAMPLE_EVERY) {
    if (!Number.isInteger(capacity) || capacity <= 0) throw new RangeError('capacity must be positive integer');
    if (!Number.isInteger(sampleEvery) || sampleEvery <= 0) throw new RangeError('sampleEvery must be positive integer');
    this.capacity = capacity;
    this.buffer = new Float64Array(capacity);
    this.sampleEvery = sampleEvery;
  }

  /** Increment the published-events counter. */
  recordPublish(): void { this.published++; }

  /** Increment the delivered-events counter (one per successful subscriber delivery). */
  recordDeliver(): void { this.delivered++; }

  /** Increment the dropped-events counter (e.g. due to handler throw or backpressure). */
  recordDrop(): void { this.dropped++; }

  /** Set the current active-subscription gauge. */
  setActiveSubscriptions(n: number): void {
    if (!Number.isInteger(n) || n < 0) throw new RangeError('activeSubscriptions must be >= 0 integer');
    this.activeSubscriptions = n;
  }

  /** Increment the active-subscriptions gauge by 1. */
  incSubscription(): void { this.activeSubscriptions++; }
  /** Decrement the active-subscriptions gauge by 1 (floor at 0). */
  decSubscription(): void { if (this.activeSubscriptions > 0) this.activeSubscriptions--; }

  /** Set the current active-sources gauge. */
  setActiveSources(n: number): void {
    if (!Number.isInteger(n) || n < 0) throw new RangeError('activeSources must be >= 0 integer');
    this.activeSources = n;
  }
  /** Increment active sources. */
  incSource(): void { this.activeSources++; }
  /** Decrement active sources (floor at 0). */
  decSource(): void { if (this.activeSources > 0) this.activeSources--; }

  /**
   * Record a latency sample (ms). Sampling may be applied per the configured
   * `sampleEvery` to amortize overhead in high-throughput workloads.
   */
  recordLatency(ms: number): void {
    if (typeof ms !== 'number' || !Number.isFinite(ms) || ms < 0) return;
    this.sampleCounter++;
    if (this.sampleCounter % this.sampleEvery !== 0) return;
    this.buffer[this.head] = ms;
    this.head = (this.head + 1) % this.capacity;
    if (this.filled < this.capacity) this.filled++;
    this.sampledCount++;
  }

  /** Returns the number of latency samples currently stored. */
  sampleCount(): number { return this.filled; }

  /** Returns the total number of latency samples ever observed (including unsampled). */
  totalSamplesObserved(): number { return this.sampledCount; }

  /** Compute the average latency across stored samples. */
  avgLatency(): number {
    if (this.filled === 0) return 0;
    let sum = 0;
    for (let i = 0; i < this.filled; i++) sum += this.buffer[i];
    return sum / this.filled;
  }

  /** Compute the p-th percentile latency (0 ≤ p ≤ 100) across stored samples. */
  percentile(p: number): number {
    if (p < 0 || p > 100) throw new RangeError('percentile must be in [0,100]');
    if (this.filled === 0) return 0;
    const copy = Array.prototype.slice.call(this.buffer.subarray(0, this.filled)) as number[];
    copy.sort((a, b) => a - b);
    if (p === 0) return copy[0];
    if (p === 100) return copy[copy.length - 1];
    // Nearest-rank percentile.
    const rank = Math.ceil((p / 100) * copy.length);
    const idx = Math.max(0, Math.min(copy.length - 1, rank - 1));
    return copy[idx];
  }

  /** Snapshot the current metrics. */
  snapshot(): FabricMetrics {
    return {
      eventsPublished: this.published,
      eventsDelivered: this.delivered,
      eventsDropped: this.dropped,
      activeSubscriptions: this.activeSubscriptions,
      activeSources: this.activeSources,
      avgLatencyMs: round3(this.avgLatency()),
      p50LatencyMs: round3(this.percentile(50)),
      p99LatencyMs: round3(this.percentile(99)),
    };
  }

  /** Reset every counter and clear the latency buffer. */
  reset(): void {
    this.head = 0;
    this.filled = 0;
    this.published = 0;
    this.delivered = 0;
    this.dropped = 0;
    this.activeSubscriptions = 0;
    this.activeSources = 0;
    this.sampledCount = 0;
    this.sampleCounter = 0;
    this.buffer.fill(0);
  }
}

function round3(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 1000) / 1000;
}
