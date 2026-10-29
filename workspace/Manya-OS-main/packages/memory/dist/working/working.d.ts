/**
 * @manya-os/memory — working memory (short-TTL scratchpad).
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
import type { WorkingMemoryEntry } from '../types.js';
export declare class WorkingMemory {
    private readonly defaultTtlMs;
    private readonly store;
    private sweeper;
    constructor(defaultTtlMs?: number);
    /** Store a value with optional TTL. Returns the entry id. */
    set(key: string, value: unknown, ttlMs?: number, tags?: string[]): string;
    /** Retrieve a value. Returns null if missing or expired. */
    get(key: string): unknown | null;
    /** Get the full entry (including metadata). */
    getEntry(key: string): WorkingMemoryEntry | null;
    /** Check if a key exists (and is not expired). */
    has(key: string): boolean;
    /** Delete a key. */
    delete(key: string): boolean;
    /** Clear all working memory. */
    clear(): void;
    /** Number of non-expired entries. */
    size(): number;
    /** Iterate non-expired entries. */
    entries(): WorkingMemoryEntry[];
    /** Find entries by tag. */
    findByTag(tag: string): WorkingMemoryEntry[];
    /** Stop the sweeper. */
    dispose(): void;
    private isExpired;
    /** Remove expired entries. Returns count removed. */
    sweep(): number;
}
//# sourceMappingURL=working.d.ts.map