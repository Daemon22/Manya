/**
 * @manya-os/memory — inverted index for fast token-based retrieval.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
import type { IndexEntry, MemoryId } from '../types.js';
export declare class InvertedIndex {
    private readonly index;
    private readonly docLengths;
    /** Tokenize a string into lowercase terms. */
    static tokenize(text: string): string[];
    /** Add a document (record) to the index. */
    add(recordId: MemoryId, text: string): void;
    /** Remove a document from the index. */
    remove(recordId: MemoryId): void;
    /** Look up records containing a token. */
    lookup(token: string): IndexEntry | undefined;
    /** Search by query string. Returns record IDs with TF scores. */
    search(query: string): Array<{
        recordId: MemoryId;
        score: number;
    }>;
    /** Number of unique tokens. */
    size(): number;
    /** All entries (for serialization). */
    entries(): IndexEntry[];
}
//# sourceMappingURL=index.d.ts.map