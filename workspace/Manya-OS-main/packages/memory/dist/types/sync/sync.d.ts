/**
 * @manya-os/memory — synchronization between memory instances.
 *
 * Compares two snapshots and produces an apply-able delta.
 * Collaboration packages provide a narrow, permissioned sharing mechanism
 * that never exposes the full memory to the Hub.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
import type { MemorySnapshot, MemoryId, CollaborationPackage, WriteConflict, ConflictResolution } from '../types.js';
/** A sync delta: ids added/removed/updated on the remote side. */
export interface SyncDelta {
    addedEpisodic: MemoryId[];
    updatedEpisodic: MemoryId[];
    addedSemantic: MemoryId[];
    addedLongTerm: MemoryId[];
    updatedLongTerm: MemoryId[];
    addedLinks: number;
    conflicts: Array<{
        id: MemoryId;
        localTimestamp: number;
        remoteTimestamp: number;
    }>;
}
/** Compare local vs remote snapshot; returns the delta to apply locally. */
export declare function computeDelta(local: MemorySnapshot, remote: MemorySnapshot): SyncDelta;
/** Apply a snapshot's new/updated records onto a local snapshot (mutates local). */
export declare function applyDelta(local: MemorySnapshot, remote: MemorySnapshot, delta: SyncDelta): MemorySnapshot;
/** Detect in-flight write conflicts between a local snapshot and a collaboration package. */
export declare function detectConflicts(local: MemorySnapshot, pkg: CollaborationPackage): WriteConflict[];
/** Resolve conflicts using the given strategy, returning the winning records. */
export declare function resolveConflicts(conflicts: WriteConflict[], strategy: ConflictResolution): Map<MemoryId, 'local' | 'remote' | 'skip'>;
/** Validate that a collaboration package is well-formed. */
export declare function validateCollaborationPackage(pkg: unknown): pkg is CollaborationPackage;
//# sourceMappingURL=sync.d.ts.map