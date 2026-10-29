/**
 * @manya-os/memory — episodic memory (timestamped events).
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
import type { EpisodicEvent } from '../types.js';
export declare class EpisodicMemory {
    private readonly events;
    private readonly maxCount;
    constructor(maxCount?: number);
    /** Record an event. Returns the event id. */
    record(agent: string, event: string, context?: Record<string, unknown>, opts?: {
        importance?: number;
        tags?: string[];
        source?: string;
        id?: string;
        timestamp?: number;
    }): string;
    /** Recall the last N events. */
    recall(limit?: number, agentFilter?: string): EpisodicEvent[];
    /** Recall events in a time range. */
    recallRange(startMs: number, endMs: number, limit?: number): EpisodicEvent[];
    /** Find events matching a substring (case-insensitive). */
    search(query: string, limit?: number): EpisodicEvent[];
    /** Find by tag. */
    findByTag(tag: string): EpisodicEvent[];
    /** Find by id. */
    findById(id: string): EpisodicEvent | undefined;
    /** Get all events (read-only). */
    all(): EpisodicEvent[];
    /** Count events. */
    count(): number;
    /** Delete events older than cutoff. Returns count removed. */
    pruneOlderThan(cutoffMs: number): number;
    /** Prune low-importance events when over a count threshold. */
    pruneLowImportance(threshold?: number, maxCount?: number): number;
}
//# sourceMappingURL=episodic.d.ts.map