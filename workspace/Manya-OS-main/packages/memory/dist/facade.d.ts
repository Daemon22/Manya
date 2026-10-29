/**
 * @manya-os/memory — tool-grade facade.
 *
 * A true memory engine, not just a key-value store. Five memory types:
 *   - working     in-process Map with TTL expiry, never persisted
 *   - episodic    an append-only, tamper-evident log (@manya-os/stamp chaining)
 *   - semantic    a Map of learned facts with confidence scores
 *   - procedural  a Map of named, callable skills
 *   - archival    encrypted long-term storage (backed by @manya-os/vault)
 *
 * Sharing is explicit and selective: nothing leaves a memory store unless
 * it is published onto a named channel via shareOn(), using @manya-os/unify's
 * event bus. That is what lets every intelligence "share memory without
 * sharing everything."
 *
 * This facade is the composition surface used by @manya-os/economy,
 * perception, telepathy, and reflection. The platform-grade MemorySystem
 * in this package remains the production implementation.
 *
 * Ported from the Manya reference implementation (packages/memory).
 */
import type { ChainEntry } from '@manya-os/stamp';
/** Episodic record (raw, pre-chain). */
export interface EpisodicRecord {
    agent: string;
    event: string;
    context: Record<string, unknown>;
    timestamp: string;
}
/** A tool-grade memory store. */
export interface FacadeMemoryStore {
    ownerId: string;
    working: Map<string, {
        value: unknown;
        ttl?: number;
        createdAt: number;
    }>;
    episodicChain: {
        name: string;
        algorithm: string;
        entries: ChainEntry[];
    };
    episodicRaw: EpisodicRecord[];
    semantic: Map<string, {
        entity: string;
        fact: string;
        confidence: number;
        learnedAt: string;
    }>;
    procedural: Map<string, (...args: unknown[]) => unknown>;
    archive: any;
    bus: any;
    createdAt: string;
}
/**
 * Creates a new memory store for an owner (an agent, device, or human).
 */
export declare function createMemoryStore(ownerId: string): FacadeMemoryStore;
/**
 * Records an episodic event and chains it onto the store's provenance chain.
 */
export declare function remember(store: FacadeMemoryStore, agent: string, event: string, context?: Record<string, unknown>): ChainEntry;
/**
 * Recalls recent episodic events, optionally filtered by agent.
 */
export declare function recallEpisodes(store: FacadeMemoryStore, options?: {
    limit?: number;
    agent?: string;
}): EpisodicRecord[];
/**
 * Verifies that the episodic chain has not been tampered with.
 */
export declare function verifyEpisodicIntegrity(store: FacadeMemoryStore): import("@manya-os/stamp").ChainVerifyResult;
/**
 * Stores a value in working memory with an optional expiry.
 */
export declare function rememberWorking(store: FacadeMemoryStore, key: string, value: unknown, ttlMs?: number): void;
/**
 * Recalls a value from working memory, honoring TTL expiry.
 */
export declare function recallWorking(store: FacadeMemoryStore, key: string): unknown;
/** Removes a key from working memory. */
export declare function forgetWorking(store: FacadeMemoryStore, key: string): boolean;
/**
 * Records a fact about an entity, with an associated confidence.
 */
export declare function learnFact(store: FacadeMemoryStore, entity: string, fact: string, confidence?: number): void;
/** Recalls a previously learned fact about an entity, or null. */
export declare function recallFact(store: FacadeMemoryStore, entity: string): {
    entity: string;
    fact: string;
    confidence: number;
    learnedAt: string;
} | null;
/** Registers a callable skill under a name. */
export declare function learnSkill(store: FacadeMemoryStore, name: string, skillFn: (...args: unknown[]) => unknown): void;
/** Invokes a previously learned skill by name. */
export declare function executeSkill(store: FacadeMemoryStore, name: string, ...args: unknown[]): unknown;
/** Persists a value to archival (long-term, vault-backed) memory. */
export declare function archive(store: FacadeMemoryStore, key: string, value: unknown, options?: Record<string, unknown>): unknown;
/** Retrieves a value from archival memory. */
export declare function retrieveArchive(store: FacadeMemoryStore, key: string): unknown;
/**
 * Shares a payload on a named channel. Only subscribers of that specific
 * channel receive it — the rest of the store stays private.
 */
export declare function shareOn(store: FacadeMemoryStore, channel: string, payload: unknown): {
    eventId: string;
    delivered: number;
};
/**
 * Subscribes to a channel to receive future shared memories.
 */
export declare function subscribeOn(store: FacadeMemoryStore, channel: string, handler: (event: unknown) => void): () => void;
/** Unified tool-grade facade object (consumed as `memory` by other tools). */
export declare const memory: {
    createMemoryStore: typeof createMemoryStore;
    remember: typeof remember;
    recallEpisodes: typeof recallEpisodes;
    verifyEpisodicIntegrity: typeof verifyEpisodicIntegrity;
    rememberWorking: typeof rememberWorking;
    recallWorking: typeof recallWorking;
    forgetWorking: typeof forgetWorking;
    learnFact: typeof learnFact;
    recallFact: typeof recallFact;
    learnSkill: typeof learnSkill;
    executeSkill: typeof executeSkill;
    archive: typeof archive;
    retrieveArchive: typeof retrieveArchive;
    shareOn: typeof shareOn;
    subscribeOn: typeof subscribeOn;
};
export default memory;
//# sourceMappingURL=facade.d.ts.map