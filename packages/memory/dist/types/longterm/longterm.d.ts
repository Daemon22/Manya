/**
 * @manya-os/memory — long-term storage (durable records).
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
import type { LongTermRecord, MemoryType } from '../types.js';
export declare class LongTermMemory {
    private readonly records;
    private readonly byTag;
    private readonly byType;
    /** Store a record. Returns its id. */
    store(payload: unknown, opts?: {
        type?: MemoryType;
        importance?: number;
        tags?: string[];
        source?: string;
        id?: string;
    }): string;
    /** Retrieve a record (updates access stats). */
    retrieve(id: string): LongTermRecord | null;
    /** Peek without updating access stats. */
    peek(id: string): LongTermRecord | null;
    /** Update a record's payload. */
    update(id: string, payload: unknown): void;
    /** Delete a record. */
    delete(id: string): boolean;
    /** Find by tag. */
    findByTag(tag: string): LongTermRecord[];
    /** Find by type. */
    findByType(type: MemoryType): LongTermRecord[];
    /** All records. */
    all(): LongTermRecord[];
    /** Count. */
    count(): number;
    /** Records not accessed since cutoff (candidates for compression/archival). */
    staleSince(cutoffMs: number): LongTermRecord[];
    /** Apply an aging policy: mark records as low-importance based on age & access. */
    applyAging(now?: number): number;
}
//# sourceMappingURL=longterm.d.ts.map