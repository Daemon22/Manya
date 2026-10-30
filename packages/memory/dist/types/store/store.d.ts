/**
 * @manya-os/memory — persistence store interface.
 *
 * A {@link MemoryStore} is an optional persistence backend for the memory
 * system. When provided via config, the MemorySystem delegates reads/writes
 * to the store. When absent, everything remains in-memory (the default).
 *
 * Implementations may be in-memory, file-backed, database-backed, etc.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
import type { EpisodicEvent, LongTermRecord, MemoryLink, MemoryPermission, MemorySnapshot, MemoryType, SemanticFact } from '../types.js';
/**
 * Persistence backend for the memory system.
 *
 * All methods are async to support network-backed stores (databases, APIs).
 * The default in-memory implementation is provided by {@link InMemoryMemoryStore}.
 */
export interface MemoryStore {
    /** Persist a single episodic event. */
    putEpisodic(event: EpisodicEvent): Promise<void>;
    /** Retrieve an episodic event by ID, or null if absent. */
    getEpisodic(id: string): Promise<EpisodicEvent | null>;
    /** Delete an episodic event by ID. Returns true if deleted. */
    deleteEpisodic(id: string): Promise<boolean>;
    /** List episodic events with optional filters. */
    listEpisodic(opts?: {
        agent?: string;
        limit?: number;
        before?: number;
    }): Promise<EpisodicEvent[]>;
    /** Prune episodic events older than the given timestamp. Returns count removed. */
    pruneEpisodic(olderThan: number): Promise<number>;
    /** Persist a semantic fact (upsert by ID). */
    putSemantic(fact: SemanticFact): Promise<void>;
    /** Retrieve a semantic fact by ID, or null if absent. */
    getSemantic(id: string): Promise<SemanticFact | null>;
    /** Delete a semantic fact by ID. Returns true if deleted. */
    deleteSemantic(id: string): Promise<boolean>;
    /** Find semantic facts by entity and optionally attribute. */
    findSemantic(entity: string, attribute?: string): Promise<SemanticFact[]>;
    /** Update the confidence of a semantic fact. Returns true if updated. */
    updateSemanticConfidence(id: string, confidence: number): Promise<boolean>;
    /** Persist a long-term record (upsert by ID). */
    putLongterm(record: LongTermRecord): Promise<void>;
    /** Retrieve a long-term record by ID, or null if absent. */
    getLongterm(id: string): Promise<LongTermRecord | null>;
    /** Delete a long-term record by ID. Returns true if deleted. */
    deleteLongterm(id: string): Promise<boolean>;
    /** List long-term records with optional filters. */
    listLongterm(opts?: {
        type?: MemoryType;
        tag?: string;
        limit?: number;
    }): Promise<LongTermRecord[]>;
    /** Touch a long-term record: increment accessCount and update lastAccessedAt. */
    touchLongterm(id: string): Promise<boolean>;
    /** Add a link between two records (upsert). */
    putLink(link: MemoryLink): Promise<void>;
    /** Delete a specific link. Returns true if deleted. */
    deleteLink(fromId: string, toId: string, relation: string): Promise<boolean>;
    /** Get all outgoing links from a record. */
    outgoingFrom(id: string): Promise<MemoryLink[]>;
    /** Get all incoming links to a record. */
    incomingTo(id: string): Promise<MemoryLink[]>;
    /** Set permissions for a record (upsert). */
    setPermission(perm: MemoryPermission): Promise<void>;
    /** Get permissions for a record, or null if absent. */
    getPermission(recordId: string): Promise<MemoryPermission | null>;
    /** Delete permissions for a record. Returns true if deleted. */
    deletePermission(recordId: string): Promise<boolean>;
    /** Load the full snapshot from the store. */
    loadSnapshot(): Promise<MemorySnapshot>;
    /** Save a full snapshot to the store (replaces all data). */
    saveSnapshot(snapshot: MemorySnapshot): Promise<void>;
}
/**
 * In-memory implementation of {@link MemoryStore}.
 * Delegates to plain Maps — identical to the current MemorySystem behavior.
 */
export declare class InMemoryMemoryStore implements MemoryStore {
    private readonly episodic;
    private readonly semantic;
    private readonly longterm;
    private readonly links;
    private readonly permissions;
    private linkKey;
    putEpisodic(event: EpisodicEvent): Promise<void>;
    getEpisodic(id: string): Promise<EpisodicEvent | null>;
    deleteEpisodic(id: string): Promise<boolean>;
    listEpisodic(opts?: {
        agent?: string;
        limit?: number;
        before?: number;
    }): Promise<EpisodicEvent[]>;
    pruneEpisodic(olderThan: number): Promise<number>;
    putSemantic(fact: SemanticFact): Promise<void>;
    getSemantic(id: string): Promise<SemanticFact | null>;
    deleteSemantic(id: string): Promise<boolean>;
    findSemantic(entity: string, attribute?: string): Promise<SemanticFact[]>;
    updateSemanticConfidence(id: string, confidence: number): Promise<boolean>;
    putLongterm(record: LongTermRecord): Promise<void>;
    getLongterm(id: string): Promise<LongTermRecord | null>;
    deleteLongterm(id: string): Promise<boolean>;
    listLongterm(opts?: {
        type?: MemoryType;
        tag?: string;
        limit?: number;
    }): Promise<LongTermRecord[]>;
    touchLongterm(id: string): Promise<boolean>;
    putLink(link: MemoryLink): Promise<void>;
    deleteLink(fromId: string, toId: string, relation: string): Promise<boolean>;
    outgoingFrom(id: string): Promise<MemoryLink[]>;
    incomingTo(id: string): Promise<MemoryLink[]>;
    setPermission(perm: MemoryPermission): Promise<void>;
    getPermission(recordId: string): Promise<MemoryPermission | null>;
    deletePermission(recordId: string): Promise<boolean>;
    loadSnapshot(): Promise<MemorySnapshot>;
    saveSnapshot(snapshot: MemorySnapshot): Promise<void>;
}
//# sourceMappingURL=store.d.ts.map