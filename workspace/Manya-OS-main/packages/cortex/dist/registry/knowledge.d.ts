/**
 * @manya-os/cortex — knowledge registry and differential sync.
 *
 * Tracks which component owns each knowledge key and computes
 * differential payloads for efficient inter-component sync.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
import type { ProvenanceEntry, DiffResult } from '../types.js';
export declare class KnowledgeRegistry {
    private readonly entries;
    /**
     * Register a knowledge key with an owning component.
     * Throws if the key is already owned by a different component.
     */
    register(key: string, ownerComponentId: string, opts?: {
        description?: string;
    }): ProvenanceEntry;
    /**
     * Register or transfer a knowledge key. If the key is owned by a different
     * component, the ownership is transferred (previous entry is overwritten).
     * This is the non-throwing variant for use during sync.
     */
    transfer(key: string, newOwnerComponentId: string, opts?: {
        description?: string;
    }): ProvenanceEntry;
    /** Look up the owning component for a key. */
    lookup(key: string): ProvenanceEntry | undefined;
    /** Check if a key is registered. */
    has(key: string): boolean;
    /** Remove a key. Returns true if it was present. */
    unregister(key: string): boolean;
    /** Get all entries. */
    all(): ProvenanceEntry[];
    /** Get all keys owned by a given component. */
    byOwner(ownerComponentId: string): ProvenanceEntry[];
    /** Number of registered keys. */
    size(): number;
    /**
     * Compute the differential (delta) of knowledge changes since a given
     * timestamp. Used for efficient inter-component sync: only changed data
     * is transferred.
     *
     * @param since - Epoch ms. Only entries with `lastUpdated > since` are included.
     */
    diff(since: number): DiffResult;
    /**
     * Compute diff excluding keys owned by a specific component.
     * Useful when a component wants to see changes from *other* components only.
     */
    diffExcluding(since: number, excludeComponentId: string): DiffResult;
}
//# sourceMappingURL=knowledge.d.ts.map