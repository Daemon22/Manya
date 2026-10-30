/**
 * @manya-os/memory — memory links (knowledge graph edges).
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
import type { MemoryLink, MemoryId } from '../types.js';
export declare class LinkGraph {
    private readonly links;
    private readonly outgoing;
    private readonly incoming;
    private static key;
    /** Add a link. Returns true if newly added. */
    add(from: MemoryId, to: MemoryId, relation: string, weight?: number): boolean;
    /** Remove a link. */
    remove(from: MemoryId, to: MemoryId, relation: string): boolean;
    /** All links from a record. */
    outgoingFrom(id: MemoryId): MemoryLink[];
    /** All links to a record. */
    incomingTo(id: MemoryId): MemoryLink[];
    /** All links of a specific relation type. */
    byRelation(relation: string): MemoryLink[];
    /** BFS from a record following links of a given relation. Returns visited ids (excluding start). */
    traverse(start: MemoryId, relation: string, maxDepth?: number): MemoryId[];
    /** All links. */
    all(): MemoryLink[];
    /** Count. */
    size(): number;
}
//# sourceMappingURL=link.d.ts.map