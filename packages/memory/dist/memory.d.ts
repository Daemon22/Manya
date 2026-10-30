/**
 * @manya-os/memory — the unified memory facade.
 *
 * Wires together all subsystems: working, episodic, semantic, procedural,
 * long-term, index, links, ranking, permissions, aging, sync, backup, I/O.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
import type { EpisodicEvent, LongTermRecord, MemoryId, MemorySnapshot, RetrievalResult, CollaborationPackage, WriteConflict, ConflictResolution } from './types.js';
import type { MemoryStore } from './store/store.js';
import { WorkingMemory } from './working/working.js';
import { EpisodicMemory } from './episodic/episodic.js';
import { SemanticMemory } from './semantic/semantic.js';
import { ProceduralMemory } from './procedural/procedural.js';
import { LongTermMemory } from './longterm/longterm.js';
import { InvertedIndex } from './index/index.js';
import { LinkGraph } from './link/link.js';
import { PermissionModel } from './permissions/permissions.js';
import { DEFAULT_WEIGHTS } from './rank/rank.js';
import { effectiveImportance } from './aging/aging.js';
import type { SyncDelta } from './sync/sync.js';
import { DEFAULT_CONFIG } from './config/config.js';
import type { MemoryConfig } from './config/config.js';
export declare class MemorySystem {
    readonly working: WorkingMemory;
    readonly episodic: EpisodicMemory;
    readonly semantic: SemanticMemory;
    readonly procedural: ProceduralMemory;
    readonly longterm: LongTermMemory;
    readonly index: InvertedIndex;
    readonly links: LinkGraph;
    readonly permissions: PermissionModel;
    private readonly config;
    private readonly logger;
    private readonly _persistenceBackend?;
    /** Unique id for this memory instance. Used in collaboration packages. */
    readonly instanceId: string;
    constructor(config?: MemoryConfig);
    /** The configured persistence store, if any. */
    get persistenceStore(): MemoryStore | undefined;
    /** Record an episodic event AND index it. */
    remember(agent: string, event: string, context?: Record<string, unknown>, opts?: {
        importance?: number;
        tags?: string[];
        source?: string;
    }): string;
    /** Recall events by query. Returns ranked results. */
    recall(query: string, limit?: number): RetrievalResult<EpisodicEvent>[];
    /** Learn a semantic fact AND index it. */
    learn(entity: string, attribute: string, value: unknown, confidence?: number, source?: string): string;
    /** Store a long-term record AND index it. */
    store(payload: unknown, opts?: {
        type?: 'longterm';
        importance?: number;
        tags?: string[];
        source?: string;
        id?: string;
    }): string;
    /** Retrieve a long-term record (updates access stats). */
    retrieve(id: string): LongTermRecord | null;
    /** Unified search across all memory types. Returns ranked long-term records. */
    search(query: string, limit?: number): RetrievalResult<LongTermRecord>[];
    /** Link two records. */
    link(fromId: MemoryId, toId: MemoryId, relation: string, weight?: number): boolean;
    /** Find related records via links. */
    related(id: MemoryId, relation?: string, maxDepth?: number): MemoryId[];
    /** Run aging: prune low-importance episodic events, decay long-term importance. */
    age(now?: number): {
        prunedEpisodic: number;
        agedLongTerm: number;
    };
    /** Snapshot the entire memory state. */
    snapshot(): MemorySnapshot;
    /** Restore from a snapshot. */
    restore(snapshot: MemorySnapshot): void;
    /** Backup the current state. */
    backup(): import("./backup/backup.js").Backup;
    /** Restore from a backup. */
    restoreFromBackup(backup: ReturnType<MemorySystem['backup']>): void;
    /**
     * Synchronize with a remote snapshot. Returns the applied delta.
     *
     * IMPORTANT: This method is for peer-to-peer sync between equally-privileged
     * local instances only. It must NOT be used to send full memory snapshots to
     * the Hub. Use `createCollaborationPackage()` for Hub interactions.
     * If the remote snapshot's source differs from the local instance and appears
     * to be a Hub-hosted mirror, the operation is rejected.
     */
    synchronize(remoteSnapshot: MemorySnapshot): SyncDelta;
    /**
     * Create a collaboration package containing only shareable data.
     * This is the ONLY mechanism for sharing memory between instances.
     * Full snapshots are never transmitted to the Hub.
     */
    createCollaborationPackage(opts?: {
        includeEpisodic?: boolean;
        includeSemantic?: boolean;
        includeLongterm?: boolean;
        filterEpisodic?: (event: EpisodicEvent) => boolean;
        filterSemantic?: (fact: import('./types.js').SemanticFact) => boolean;
        filterLongterm?: (record: LongTermRecord) => boolean;
        expiresAt?: string;
        metadata?: Record<string, unknown>;
    }): CollaborationPackage;
    /**
     * Apply a received collaboration package to local memory.
     * Detects and resolves in-flight write conflicts.
     * Returns the list of conflicts found and how they were resolved.
     */
    applyCollaborationPackage(pkg: CollaborationPackage, opts?: {
        conflictStrategy?: ConflictResolution;
        customResolver?: (conflicts: WriteConflict[]) => Map<MemoryId, 'local' | 'remote' | 'skip'>;
    }): {
        applied: boolean;
        conflicts: WriteConflict[];
        resolutions: Map<MemoryId, 'local' | 'remote' | 'skip'>;
    };
    /** Mark an episodic event as shareable (or not). */
    setShareable(eventId: string, shareable: boolean): void;
    /** Export the snapshot to a JSON string. */
    export(): string;
    /** Import a snapshot from a JSON string. */
    import(json: string): void;
    /**
     * Persist the current in-memory state to the configured store.
     * Requires a store to be configured. Throws MemoryError if no store.
     */
    persist(): Promise<void>;
    /**
     * Hydrate in-memory state from the configured store.
     * Requires a store to be configured. Throws MemoryError if no store.
     */
    hydrate(): Promise<void>;
    /** Dispose of resources (sweepers, etc.). */
    dispose(): void;
}
export { DEFAULT_CONFIG, DEFAULT_WEIGHTS, effectiveImportance };
//# sourceMappingURL=memory.d.ts.map