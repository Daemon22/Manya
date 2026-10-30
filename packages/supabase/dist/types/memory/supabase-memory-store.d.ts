/**
 * @manya-os/supabase — Supabase-backed MemoryStore.
 *
 * Implements the @manya-os/memory MemoryStore interface against
 * a Postgres/Supabase database. Provides durable persistence for
 * episodic, semantic, long-term memory, links, and permissions.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { MemoryStore, EpisodicEvent, SemanticFact, LongTermRecord, MemoryLink, MemoryPermission, MemorySnapshot, MemoryType } from '@manya-os/memory';
import type { Logger } from '../logging.js';
import type { ResolvedConfig } from '../config.js';
/**
 * Supabase-backed memory persistence store.
 *
 * Implements the MemoryStore interface from @manya-os/memory.
 * All operations are async and use parameterized queries via the Supabase client.
 */
export declare class SupabaseMemoryStore implements MemoryStore {
    private readonly client;
    private readonly tables;
    private readonly logger;
    private readonly retryConfig;
    constructor(client: SupabaseClient, config: ResolvedConfig, logger: Logger);
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
//# sourceMappingURL=supabase-memory-store.d.ts.map