"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.memory = void 0;
exports.createMemoryStore = createMemoryStore;
exports.remember = remember;
exports.recallEpisodes = recallEpisodes;
exports.verifyEpisodicIntegrity = verifyEpisodicIntegrity;
exports.rememberWorking = rememberWorking;
exports.recallWorking = recallWorking;
exports.forgetWorking = forgetWorking;
exports.learnFact = learnFact;
exports.recallFact = recallFact;
exports.learnSkill = learnSkill;
exports.executeSkill = executeSkill;
exports.archive = archive;
exports.retrieveArchive = retrieveArchive;
exports.shareOn = shareOn;
exports.subscribeOn = subscribeOn;
const vault_1 = require("@manya-os/vault");
const stamp_1 = require("@manya-os/stamp");
const unify_1 = require("@manya-os/unify");
/**
 * Creates a new memory store for an owner (an agent, device, or human).
 */
function createMemoryStore(ownerId) {
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
        archive: vault_1.vault.create(`${ownerId}-archive`),
        bus: unify_1.unify.createBus({ replay: true }),
        createdAt: new Date().toISOString(),
    };
}
// ---------------------------------------------------------------------------
// Episodic memory — tamper-evident event log
// ---------------------------------------------------------------------------
/**
 * Records an episodic event and chains it onto the store's provenance chain.
 */
function remember(store, agent, event, context = {}) {
    if (!agent || typeof agent !== 'string')
        throw new Error('agent is required');
    if (!event || typeof event !== 'string')
        throw new Error('event is required');
    const rec = { agent, event, context, timestamp: new Date().toISOString() };
    const previous = store.episodicChain.entries.at(-1) || null;
    const entry = stamp_1.stampApi.chainEntry(Buffer.from(JSON.stringify(rec)), previous ? previous.hash : undefined, { label: event, metadata: { agent } });
    entry.index = store.episodicChain.entries.length;
    store.episodicChain.entries.push(entry);
    store.episodicRaw.push(rec);
    return entry;
}
/**
 * Recalls recent episodic events, optionally filtered by agent.
 */
function recallEpisodes(store, options = {}) {
    const { limit = 10, agent } = options;
    const data = agent ? store.episodicRaw.filter((e) => e.agent === agent) : store.episodicRaw;
    return data.slice(-limit);
}
/**
 * Verifies that the episodic chain has not been tampered with.
 */
function verifyEpisodicIntegrity(store) {
    return stamp_1.stampApi.verifyChain(store.episodicChain);
}
// ---------------------------------------------------------------------------
// Working memory — ephemeral, TTL-bound
// ---------------------------------------------------------------------------
/**
 * Stores a value in working memory with an optional expiry.
 */
function rememberWorking(store, key, value, ttlMs) {
    if (!key || typeof key !== 'string')
        throw new Error('key is required');
    store.working.set(key, { value, ttl: ttlMs, createdAt: Date.now() });
}
/**
 * Recalls a value from working memory, honoring TTL expiry.
 */
function recallWorking(store, key) {
    const item = store.working.get(key);
    if (!item)
        return undefined;
    if (item.ttl && Date.now() - item.createdAt > item.ttl) {
        store.working.delete(key);
        return undefined;
    }
    return item.value;
}
/** Removes a key from working memory. */
function forgetWorking(store, key) {
    return store.working.delete(key);
}
// ---------------------------------------------------------------------------
// Semantic memory — learned facts
// ---------------------------------------------------------------------------
/**
 * Records a fact about an entity, with an associated confidence.
 */
function learnFact(store, entity, fact, confidence = 1.0) {
    if (!entity || typeof entity !== 'string')
        throw new Error('entity is required');
    if (!fact || typeof fact !== 'string')
        throw new Error('fact is required');
    store.semantic.set(entity, { entity, fact, confidence, learnedAt: new Date().toISOString() });
}
/** Recalls a previously learned fact about an entity, or null. */
function recallFact(store, entity) {
    return store.semantic.get(entity) || null;
}
// ---------------------------------------------------------------------------
// Procedural memory — named skills
// ---------------------------------------------------------------------------
/** Registers a callable skill under a name. */
function learnSkill(store, name, skillFn) {
    if (!name || typeof name !== 'string')
        throw new Error('name is required');
    if (typeof skillFn !== 'function')
        throw new Error('skillFn must be a function');
    store.procedural.set(name, skillFn);
}
/** Invokes a previously learned skill by name. */
function executeSkill(store, name, ...args) {
    const skill = store.procedural.get(name);
    if (!skill)
        throw new Error(`Procedural skill "${name}" not found`);
    return skill(...args);
}
// ---------------------------------------------------------------------------
// Archival memory — encrypted long-term storage (vault-backed)
// ---------------------------------------------------------------------------
/** Persists a value to archival (long-term, vault-backed) memory. */
function archive(store, key, value, options = {}) {
    return vault_1.vault.put(store.archive, key, value, options);
}
/** Retrieves a value from archival memory. */
function retrieveArchive(store, key) {
    return vault_1.vault.get(store.archive, key);
}
// ---------------------------------------------------------------------------
// Selective sharing — only what's explicitly published crosses the boundary
// ---------------------------------------------------------------------------
/**
 * Shares a payload on a named channel. Only subscribers of that specific
 * channel receive it — the rest of the store stays private.
 */
function shareOn(store, channel, payload) {
    return unify_1.unify.publish(store.bus, channel, { type: 'memory-share', sourceToolId: store.ownerId, payload });
}
/**
 * Subscribes to a channel to receive future shared memories.
 */
function subscribeOn(store, channel, handler) {
    return unify_1.unify.subscribe(store.bus, channel, handler, { subscriberId: store.ownerId });
}
/** Unified tool-grade facade object (consumed as `memory` by other tools). */
exports.memory = {
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
exports.default = exports.memory;
//# sourceMappingURL=facade.js.map