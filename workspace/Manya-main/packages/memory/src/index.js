/**
 * Manya Memory — A true memory engine, not just a key-value store.
 *
 * Composes three existing Manya tools into five memory types:
 *   - working    in-process Map with TTL expiry, never persisted
 *   - episodic   an append-only, tamper-evident log (built on @manya/stamp's
 *                hash chaining) — "what happened and when"
 *   - semantic   a Map of learned facts with confidence scores
 *   - procedural a Map of named, callable skills
 *   - archival   encrypted long-term storage (backed by @manya/vault)
 *
 * Sharing is explicit and selective: nothing leaves a memory store unless
 * it's published onto a named channel via shareOn(), using @manya/unify's
 * event bus. That's what lets every intelligence "share memory without
 * sharing everything."
 */

import { vault } from '@manya/vault';
import { stampApi } from '@manya/stamp';
import { unify } from '@manya/unify';

/**
 * Creates a new memory store for an owner (an agent, device, or human).
 * @param {string} ownerId - Unique identifier for the memory's owner.
 * @returns {object} A memory store instance.
 */
export function createMemoryStore(ownerId) {
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
 * @param {object} store - The memory store.
 * @param {string} agent - Who or what generated the event.
 * @param {string} event - Description of what happened.
 * @param {object} [context] - Optional structured context.
 * @returns {{ index: number, hash: string, timestamp: string }} The chain entry.
 */
export function remember(store, agent, event, context = {}) {
  if (!agent || typeof agent !== 'string') throw new Error('agent is required');
  if (!event || typeof event !== 'string') throw new Error('event is required');
  const record = { agent, event, context, timestamp: new Date().toISOString() };
  const previous = store.episodicChain.entries.at(-1) || null;
  const entry = stampApi.chainEntry(
    Buffer.from(JSON.stringify(record)),
    previous ? previous.hash : undefined,
    { label: event, metadata: { agent } }
  );
  entry.index = store.episodicChain.entries.length;
  store.episodicChain.entries.push(entry);
  store.episodicRaw.push(record);
  return entry;
}

/**
 * Recalls recent episodic events, optionally filtered by agent.
 * @param {object} store - The memory store.
 * @param {object} [options] - Recall options.
 * @param {number} [options.limit=10] - Max events to return.
 * @param {string} [options.agent] - Filter to events from this agent.
 * @returns {Array<object>} Matching episodic records, most recent last.
 */
export function recallEpisodes(store, options = {}) {
  const { limit = 10, agent } = options;
  const data = agent ? store.episodicRaw.filter((e) => e.agent === agent) : store.episodicRaw;
  return data.slice(-limit);
}

/**
 * Verifies that the episodic chain has not been tampered with.
 * @param {object} store - The memory store.
 * @returns {{ valid: boolean, brokenAt: number|null, errors: string[] }}
 */
export function verifyEpisodicIntegrity(store) {
  return stampApi.verifyChain(store.episodicChain);
}

// ---------------------------------------------------------------------------
// Working memory — ephemeral, TTL-bound
// ---------------------------------------------------------------------------

/**
 * Stores a value in working memory with an optional expiry.
 * @param {object} store - The memory store.
 * @param {string} key - Working memory key.
 * @param {*} value - Value to store.
 * @param {number} [ttlMs] - Time-to-live in milliseconds; omit for no expiry.
 */
export function rememberWorking(store, key, value, ttlMs) {
  if (!key || typeof key !== 'string') throw new Error('key is required');
  store.working.set(key, { value, ttl: ttlMs, createdAt: Date.now() });
}

/**
 * Recalls a value from working memory, honoring TTL expiry.
 * @param {object} store - The memory store.
 * @param {string} key - Working memory key.
 * @returns {*} The stored value, or undefined if missing or expired.
 */
export function recallWorking(store, key) {
  const item = store.working.get(key);
  if (!item) return undefined;
  if (item.ttl && Date.now() - item.createdAt > item.ttl) {
    store.working.delete(key);
    return undefined;
  }
  return item.value;
}

/** Removes a key from working memory. */
export function forgetWorking(store, key) {
  return store.working.delete(key);
}

// ---------------------------------------------------------------------------
// Semantic memory — learned facts
// ---------------------------------------------------------------------------

/**
 * Records a fact about an entity, with an associated confidence.
 * @param {object} store - The memory store.
 * @param {string} entity - The entity the fact is about.
 * @param {string} fact - The fact itself.
 * @param {number} [confidence=1.0] - Confidence in [0, 1].
 */
export function learnFact(store, entity, fact, confidence = 1.0) {
  if (!entity || typeof entity !== 'string') throw new Error('entity is required');
  if (!fact || typeof fact !== 'string') throw new Error('fact is required');
  store.semantic.set(entity, { entity, fact, confidence, learnedAt: new Date().toISOString() });
}

/** Recalls a previously learned fact about an entity, or null. */
export function recallFact(store, entity) {
  return store.semantic.get(entity) || null;
}

// ---------------------------------------------------------------------------
// Procedural memory — named skills
// ---------------------------------------------------------------------------

/** Registers a callable skill under a name. */
export function learnSkill(store, name, skillFn) {
  if (!name || typeof name !== 'string') throw new Error('name is required');
  if (typeof skillFn !== 'function') throw new Error('skillFn must be a function');
  store.procedural.set(name, skillFn);
}

/** Invokes a previously learned skill by name. */
export function executeSkill(store, name, ...args) {
  const skill = store.procedural.get(name);
  if (!skill) throw new Error(`Procedural skill "${name}" not found`);
  return skill(...args);
}

// ---------------------------------------------------------------------------
// Archival memory — encrypted long-term storage (vault-backed)
// ---------------------------------------------------------------------------

/** Persists a value to archival (long-term, vault-backed) memory. */
export function archive(store, key, value, options = {}) {
  return vault.put(store.archive, key, value, options);
}

/** Retrieves a value from archival memory. */
export function retrieveArchive(store, key) {
  return vault.get(store.archive, key);
}

// ---------------------------------------------------------------------------
// Selective sharing — only what's explicitly published crosses the boundary
// ---------------------------------------------------------------------------

/**
 * Shares a payload on a named channel. Only subscribers of that specific
 * channel receive it — the rest of the store stays private.
 * @param {object} store - The memory store.
 * @param {string} channel - Channel/topic name.
 * @param {*} payload - Data to share.
 * @returns {{ eventId: string, delivered: number }}
 */
export function shareOn(store, channel, payload) {
  return unify.publish(store.bus, channel, { type: 'memory-share', sourceToolId: store.ownerId, payload });
}

/**
 * Subscribes to a channel to receive future shared memories.
 * @param {object} store - The memory store.
 * @param {string} channel - Channel/topic name.
 * @param {function} handler - Invoked with each shared event.
 * @returns {function} Unsubscribe function.
 */
export function subscribeOn(store, channel, handler) {
  return unify.subscribe(store.bus, channel, handler, { subscriberId: store.ownerId });
}

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
