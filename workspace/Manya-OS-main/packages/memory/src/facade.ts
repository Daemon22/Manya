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

import { vault } from '@manya-os/vault';
import { stampApi } from '@manya-os/stamp';
import { unify } from '@manya-os/unify';
import type { ChainEntry, ProvenanceChain } from '@manya-os/stamp';

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
  working: Map<string, { value: unknown; ttl?: number; createdAt: number }>;
  episodicChain: { name: string; algorithm: string; entries: ChainEntry[] };
  episodicRaw: EpisodicRecord[];
  semantic: Map<string, { entity: string; fact: string; confidence: number; learnedAt: string }>;
  procedural: Map<string, (...args: unknown[]) => unknown>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  archive: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  bus: any;
  createdAt: string;
}

/**
 * Creates a new memory store for an owner (an agent, device, or human).
 */
export function createMemoryStore(ownerId: string): FacadeMemoryStore {
  if (!ownerId || typeof ownerId !== 'string') {
    throw new Error('ownerId is required');
  }
  return {
    ownerId,
    working: new Map(),
    episodicChain: { name: `${ownerId}-episodic`, algorithm: 'sha256', entries: [] },
    episodicRaw: [],
    semantic: new Map(),
    procedural: new Map(),
    archive: vault.create(`${ownerId}-archive`),
    bus: unify.createBus({ replay: true }),
    createdAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Episodic memory — tamper-evident event log
// ---------------------------------------------------------------------------

/**
 * Records an episodic event and chains it onto the store's provenance chain.
 */
export function remember(
  store: FacadeMemoryStore,
  agent: string,
  event: string,
  context: Record<string, unknown> = {}
): ChainEntry {
  if (!agent || typeof agent !== 'string') throw new Error('agent is required');
  if (!event || typeof event !== 'string') throw new Error('event is required');
  const rec = { agent, event, context, timestamp: new Date().toISOString() };
  const previous = store.episodicChain.entries.at(-1) || null;
  const entry = stampApi.chainEntry(
    Buffer.from(JSON.stringify(rec)),
    previous ? previous.hash : undefined,
    { label: event, metadata: { agent } }
  );
  entry.index = store.episodicChain.entries.length;
  store.episodicChain.entries.push(entry);
  store.episodicRaw.push(rec);
  return entry;
}

/**
 * Recalls recent episodic events, optionally filtered by agent.
 */
export function recallEpisodes(
  store: FacadeMemoryStore,
  options: { limit?: number; agent?: string } = {}
): EpisodicRecord[] {
  const { limit = 10, agent } = options;
  const data = agent ? store.episodicRaw.filter((e) => e.agent === agent) : store.episodicRaw;
  return data.slice(-limit);
}

/**
 * Verifies that the episodic chain has not been tampered with.
 */
export function verifyEpisodicIntegrity(store: FacadeMemoryStore) {
  return stampApi.verifyChain(store.episodicChain as unknown as ProvenanceChain);
}

// ---------------------------------------------------------------------------
// Working memory — ephemeral, TTL-bound
// ---------------------------------------------------------------------------

/**
 * Stores a value in working memory with an optional expiry.
 */
export function rememberWorking(
  store: FacadeMemoryStore,
  key: string,
  value: unknown,
  ttlMs?: number
): void {
  if (!key || typeof key !== 'string') throw new Error('key is required');
  store.working.set(key, { value, ttl: ttlMs, createdAt: Date.now() });
}

/**
 * Recalls a value from working memory, honoring TTL expiry.
 */
export function recallWorking(store: FacadeMemoryStore, key: string): unknown {
  const item = store.working.get(key);
  if (!item) return undefined;
  if (item.ttl && Date.now() - item.createdAt > item.ttl) {
    store.working.delete(key);
    return undefined;
  }
  return item.value;
}

/** Removes a key from working memory. */
export function forgetWorking(store: FacadeMemoryStore, key: string): boolean {
  return store.working.delete(key);
}

// ---------------------------------------------------------------------------
// Semantic memory — learned facts
// ---------------------------------------------------------------------------

/**
 * Records a fact about an entity, with an associated confidence.
 */
export function learnFact(
  store: FacadeMemoryStore,
  entity: string,
  fact: string,
  confidence = 1.0
): void {
  if (!entity || typeof entity !== 'string') throw new Error('entity is required');
  if (!fact || typeof fact !== 'string') throw new Error('fact is required');
  store.semantic.set(entity, { entity, fact, confidence, learnedAt: new Date().toISOString() });
}

/** Recalls a previously learned fact about an entity, or null. */
export function recallFact(store: FacadeMemoryStore, entity: string): { entity: string; fact: string; confidence: number; learnedAt: string } | null {
  return store.semantic.get(entity) || null;
}

// ---------------------------------------------------------------------------
// Procedural memory — named skills
// ---------------------------------------------------------------------------

/** Registers a callable skill under a name. */
export function learnSkill(
  store: FacadeMemoryStore,
  name: string,
  skillFn: (...args: unknown[]) => unknown
): void {
  if (!name || typeof name !== 'string') throw new Error('name is required');
  if (typeof skillFn !== 'function') throw new Error('skillFn must be a function');
  store.procedural.set(name, skillFn);
}

/** Invokes a previously learned skill by name. */
export function executeSkill(store: FacadeMemoryStore, name: string, ...args: unknown[]): unknown {
  const skill = store.procedural.get(name);
  if (!skill) throw new Error(`Procedural skill "${name}" not found`);
  return skill(...args);
}

// ---------------------------------------------------------------------------
// Archival memory — encrypted long-term storage (vault-backed)
// ---------------------------------------------------------------------------

/** Persists a value to archival (long-term, vault-backed) memory. */
export function archive(
  store: FacadeMemoryStore,
  key: string,
  value: unknown,
  options: Record<string, unknown> = {}
): unknown {
  return vault.put(store.archive, key, value as never, options);
}

/** Retrieves a value from archival memory. */
export function retrieveArchive(store: FacadeMemoryStore, key: string): unknown {
  return vault.get(store.archive, key);
}

// ---------------------------------------------------------------------------
// Selective sharing — only what's explicitly published crosses the boundary
// ---------------------------------------------------------------------------

/**
 * Shares a payload on a named channel. Only subscribers of that specific
 * channel receive it — the rest of the store stays private.
 */
export function shareOn(store: FacadeMemoryStore, channel: string, payload: unknown): { eventId: string; delivered: number } {
  return unify.publish(store.bus, channel, { type: 'memory-share', sourceToolId: store.ownerId, payload });
}

/**
 * Subscribes to a channel to receive future shared memories.
 */
export function subscribeOn(
  store: FacadeMemoryStore,
  channel: string,
  handler: (event: unknown) => void
): () => void {
  return unify.subscribe(store.bus, channel, handler as never, { subscriberId: store.ownerId });
}

/** Unified tool-grade facade object (consumed as `memory` by other tools). */
export const memory = {
  createMemoryStore,
  remember,
  recallEpisodes,
  verifyEpisodicIntegrity,
  rememberWorking,
  recallWorking,
  forgetWorking,
  learnFact,
  recallFact,
  learnSkill,
  executeSkill,
  archive,
  retrieveArchive,
  shareOn,
  subscribeOn,
};

export default memory;
