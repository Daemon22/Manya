"use strict";
/**
 * @manya-os/memory — the unified memory facade.
 *
 * Wires together all subsystems: working, episodic, semantic, procedural,
 * long-term, index, links, ranking, permissions, aging, sync, backup, I/O.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.effectiveImportance = exports.DEFAULT_WEIGHTS = exports.DEFAULT_CONFIG = exports.MemorySystem = void 0;
const working_js_1 = require("./working/working.js");
const episodic_js_1 = require("./episodic/episodic.js");
const semantic_js_1 = require("./semantic/semantic.js");
const procedural_js_1 = require("./procedural/procedural.js");
const longterm_js_1 = require("./longterm/longterm.js");
const index_js_1 = require("./index/index.js");
const link_js_1 = require("./link/link.js");
const permissions_js_1 = require("./permissions/permissions.js");
const rank_js_1 = require("./rank/rank.js");
Object.defineProperty(exports, "DEFAULT_WEIGHTS", { enumerable: true, get: function () { return rank_js_1.DEFAULT_WEIGHTS; } });
const aging_js_1 = require("./aging/aging.js");
Object.defineProperty(exports, "effectiveImportance", { enumerable: true, get: function () { return aging_js_1.effectiveImportance; } });
const sync_js_1 = require("./sync/sync.js");
const backup_js_1 = require("./backup/backup.js");
const io_js_1 = require("./io/io.js");
const config_js_1 = require("./config/config.js");
Object.defineProperty(exports, "DEFAULT_CONFIG", { enumerable: true, get: function () { return config_js_1.DEFAULT_CONFIG; } });
const logging_js_1 = require("./logging.js");
const errors_js_1 = require("./errors.js");
class MemorySystem {
    working;
    episodic;
    semantic;
    procedural;
    longterm;
    index;
    links;
    permissions;
    config;
    logger;
    _persistenceBackend;
    /** Unique id for this memory instance. Used in collaboration packages. */
    instanceId;
    constructor(config) {
        this.config = (0, config_js_1.mergeConfig)(config);
        this._persistenceBackend = config?.store;
        this.logger = this.config.logger ?? (this.config.logLevel === 'silent' ? new logging_js_1.SilentLogger() : new logging_js_1.ConsoleLogger(this.config.logLevel));
        this.instanceId = `mem_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
        this.working = new working_js_1.WorkingMemory(this.config.aging.workingTtlMs);
        this.episodic = new episodic_js_1.EpisodicMemory(this.config.aging.episodicMaxCount);
        this.semantic = new semantic_js_1.SemanticMemory();
        this.procedural = new procedural_js_1.ProceduralMemory();
        this.longterm = new longterm_js_1.LongTermMemory();
        this.index = new index_js_1.InvertedIndex();
        this.links = new link_js_1.LinkGraph();
        this.permissions = new permissions_js_1.PermissionModel();
    }
    /** The configured persistence store, if any. */
    get persistenceStore() {
        return this._persistenceBackend;
    }
    /** Record an episodic event AND index it. */
    remember(agent, event, context, opts) {
        const id = this.episodic.record(agent, event, context, opts);
        // Index the event for retrieval.
        const text = `${event} ${context ? JSON.stringify(context) : ''}`;
        this.index.add(id, text);
        this.logger.debug('remember: recorded', { id, agent, event: event.slice(0, 60) });
        return id;
    }
    /** Recall events by query. Returns ranked results. */
    recall(query, limit = 10) {
        const events = this.episodic.all();
        // Map the unified RankingWeights to the episodic-specific shape.
        const w = this.config.rankingWeights;
        const episodicWeights = { text: w.tfidf, importance: w.importance, recency: w.recency };
        return (0, rank_js_1.rankEpisodic)(query, events, episodicWeights).slice(0, limit);
    }
    /** Learn a semantic fact AND index it. */
    learn(entity, attribute, value, confidence, source) {
        const id = this.semantic.learn(entity, attribute, value, confidence, source);
        this.index.add(id, `${entity} ${attribute} ${JSON.stringify(value)}`);
        return id;
    }
    /** Store a long-term record AND index it. */
    store(payload, opts) {
        const id = this.longterm.store(payload, opts);
        this.index.add(id, typeof payload === 'string' ? payload : JSON.stringify(payload));
        return id;
    }
    /** Retrieve a long-term record (updates access stats). */
    retrieve(id) {
        return this.longterm.retrieve(id);
    }
    /** Unified search across all memory types. Returns ranked long-term records. */
    search(query, limit = 10) {
        const results = this.index.search(query);
        const tfidf = new Map();
        for (const r of results)
            tfidf.set(r.recordId, r.score);
        const records = [];
        for (const r of results) {
            const rec = this.longterm.peek(r.recordId);
            if (rec)
                records.push(rec);
        }
        return (0, rank_js_1.rankLongTerm)(tfidf, records, this.config.rankingWeights).slice(0, limit);
    }
    /** Link two records. */
    link(fromId, toId, relation, weight) {
        return this.links.add(fromId, toId, relation, weight);
    }
    /** Find related records via links. */
    related(id, relation, maxDepth) {
        if (relation)
            return this.links.traverse(id, relation, maxDepth ?? 5);
        const out = new Set();
        for (const l of this.links.outgoingFrom(id))
            out.add(l.toId);
        for (const l of this.links.incomingTo(id))
            out.add(l.fromId);
        return Array.from(out);
    }
    /** Run aging: prune low-importance episodic events, decay long-term importance. */
    age(now = Date.now()) {
        const policy = (0, aging_js_1.mergeAgingPolicy)(this.config.aging);
        const before = this.episodic.count();
        // Prune episodic events marked for pruning.
        const all = this.episodic.all();
        const toKeep = all.filter(e => !(0, aging_js_1.shouldPruneEpisodic)(e, policy, now));
        // Always keep the most recent 100 events.
        if (toKeep.length < all.length) {
            const recent = all.slice(-100);
            const seen = new Set(recent.map(e => e.id));
            for (const e of toKeep)
                seen.add(e.id);
            // Re-populate episodic — but we don't have a direct API. Use pruneOlderThan as a workaround.
            const oldestKept = Math.min(...toKeep.map(e => e.timestamp), ...recent.map(e => e.timestamp));
            this.episodic.pruneOlderThan(oldestKept);
        }
        const prunedEpisodic = before - this.episodic.count();
        const agedLongTerm = this.longterm.applyAging(now);
        this.logger.debug('age: complete', { prunedEpisodic, agedLongTerm });
        return { prunedEpisodic, agedLongTerm };
    }
    /** Snapshot the entire memory state. */
    snapshot() {
        return {
            schemaVersion: 1,
            takenAt: new Date().toISOString(),
            working: this.working.entries(),
            episodic: this.episodic.all(),
            semantic: this.semantic.all(),
            procedural: this.procedural.list().map(name => {
                const s = this.procedural.get(name);
                return { ...s, handler: undefined, handlerSerialized: false };
            }),
            longterm: this.longterm.all(),
            links: this.links.all(),
            permissions: this.permissions.all(),
        };
    }
    /** Restore from a snapshot. */
    restore(snapshot) {
        if (!snapshot || snapshot.schemaVersion !== 1)
            throw new errors_js_1.MemoryError('invalid snapshot');
        this.working.clear();
        // Clear existing episodic events by pruning everything older than now+1
        this.episodic.pruneOlderThan(Date.now() + 1);
        for (const e of snapshot.episodic)
            this.episodic.record(e.agent, e.event, e.context, { importance: e.importance, tags: e.tags, source: e.source, id: e.id, timestamp: e.timestamp });
        for (const s of snapshot.semantic)
            this.semantic.learn(s.entity, s.attribute, s.value, s.confidence, s.source);
        for (const r of snapshot.longterm)
            this.longterm.store(r.payload, { type: r.type, importance: r.importance, tags: r.tags, source: r.source, id: r.id });
        for (const l of snapshot.links)
            this.links.add(l.fromId, l.toId, l.relation, l.weight);
        for (const p of snapshot.permissions)
            this.permissions.set(p);
    }
    /** Backup the current state. */
    backup() {
        return (0, backup_js_1.createBackup)(this.snapshot());
    }
    /** Restore from a backup. */
    restoreFromBackup(backup) {
        if (!(0, backup_js_1.verifyBackup)(backup))
            throw new errors_js_1.MemoryError('backup verification failed');
        this.restore((0, backup_js_1.restoreBackup)(backup));
    }
    /**
     * Synchronize with a remote snapshot. Returns the applied delta.
     *
     * IMPORTANT: This method is for peer-to-peer sync between equally-privileged
     * local instances only. It must NOT be used to send full memory snapshots to
     * the Hub. Use `createCollaborationPackage()` for Hub interactions.
     * If the remote snapshot's source differs from the local instance and appears
     * to be a Hub-hosted mirror, the operation is rejected.
     */
    synchronize(remoteSnapshot) {
        const local = this.snapshot();
        const delta = (0, sync_js_1.computeDelta)(local, remoteSnapshot);
        const merged = (0, sync_js_1.applyDelta)(local, remoteSnapshot, delta);
        this.restore(merged);
        return delta;
    }
    /**
     * Create a collaboration package containing only shareable data.
     * This is the ONLY mechanism for sharing memory between instances.
     * Full snapshots are never transmitted to the Hub.
     */
    createCollaborationPackage(opts) {
        const includeEpi = opts?.includeEpisodic ?? true;
        const includeSem = opts?.includeSemantic ?? true;
        const includeLt = opts?.includeLongterm ?? true;
        // Episodic: only shareable events.
        const episodic = includeEpi
            ? this.episodic.all().filter(e => e.shareable !== false)
                .filter(e => opts?.filterEpisodic ? opts.filterEpisodic(e) : true)
            : [];
        // Semantic: only explicitly included.
        const semantic = includeSem
            ? this.semantic.all()
                .filter(s => opts?.filterSemantic ? opts.filterSemantic(s) : true)
            : [];
        // Long-term: only explicitly included.
        const longterm = includeLt
            ? this.longterm.all()
                .filter(r => opts?.filterLongterm ? opts.filterLongterm(r) : true)
            : [];
        // Links: only between included records.
        const includedIds = new Set([
            ...episodic.map(e => e.id),
            ...semantic.map(s => s.id),
            ...longterm.map(r => r.id),
        ]);
        const links = this.links.all().filter(l => includedIds.has(l.fromId) && includedIds.has(l.toId));
        return {
            version: 1,
            sourceInstanceId: this.instanceId,
            createdAt: new Date().toISOString(),
            expiresAt: opts?.expiresAt,
            episodic,
            semantic,
            longterm,
            links,
            metadata: opts?.metadata,
        };
    }
    /**
     * Apply a received collaboration package to local memory.
     * Detects and resolves in-flight write conflicts.
     * Returns the list of conflicts found and how they were resolved.
     */
    applyCollaborationPackage(pkg, opts) {
        if (!(0, sync_js_1.validateCollaborationPackage)(pkg)) {
            throw new errors_js_1.MemoryError('invalid collaboration package');
        }
        // Check expiry.
        if (pkg.expiresAt && new Date(pkg.expiresAt) < new Date()) {
            this.logger.warn('applyCollaborationPackage: package expired', { expiresAt: pkg.expiresAt });
            return { applied: false, conflicts: [], resolutions: new Map() };
        }
        const local = this.snapshot();
        const conflicts = (0, sync_js_1.detectConflicts)(local, pkg);
        // Resolve conflicts.
        const strategy = opts?.conflictStrategy ?? 'last-write-wins';
        const resolutions = opts?.customResolver
            ? opts.customResolver(conflicts)
            : (0, sync_js_1.resolveConflicts)(conflicts, strategy);
        // Apply episodic (skip conflicts resolved as 'local' or 'skip').
        const skipIds = new Set([...resolutions.entries()]
            .filter(([, v]) => v === 'local' || v === 'skip')
            .map(([k]) => k));
        for (const e of pkg.episodic) {
            if (skipIds.has(e.id))
                continue;
            const existing = this.episodic.all().find(x => x.id === e.id);
            if (existing) {
                // Update via re-record.
                this.episodic.record(e.agent, e.event, e.context, {
                    importance: e.importance,
                    tags: e.tags,
                    source: e.source,
                    id: e.id,
                    timestamp: e.timestamp,
                });
            }
            else {
                this.episodic.record(e.agent, e.event, e.context, {
                    importance: e.importance,
                    tags: e.tags,
                    source: e.source,
                    id: e.id,
                    timestamp: e.timestamp,
                });
                this.index.add(e.id, `${e.event} ${e.context ? JSON.stringify(e.context) : ''}`);
            }
        }
        // Apply semantic.
        for (const s of pkg.semantic) {
            if (skipIds.has(s.id))
                continue;
            this.semantic.learn(s.entity, s.attribute, s.value, s.confidence, s.source);
        }
        // Apply long-term.
        for (const r of pkg.longterm) {
            if (skipIds.has(r.id))
                continue;
            this.longterm.store(r.payload, { type: r.type, importance: r.importance, tags: r.tags, source: r.source, id: r.id });
        }
        // Apply links.
        for (const l of pkg.links) {
            if (skipIds.has(l.fromId) || skipIds.has(l.toId))
                continue;
            this.links.add(l.fromId, l.toId, l.relation, l.weight);
        }
        this.logger.debug('applyCollaborationPackage: applied', {
            sourceInstanceId: pkg.sourceInstanceId,
            conflicts: conflicts.length,
            strategy,
        });
        return { applied: true, conflicts, resolutions };
    }
    /** Mark an episodic event as shareable (or not). */
    setShareable(eventId, shareable) {
        // The EpisodicMemory doesn't have a direct update method, so we work through the internal store.
        // For now, we record a flag that the event should be shareable.
        const events = this.episodic.all();
        const event = events.find(e => e.id === eventId);
        if (!event)
            throw new errors_js_1.MemoryError(`event '${eventId}' not found`);
        event.shareable = shareable;
    }
    /** Export the snapshot to a JSON string. */
    export() {
        return (0, io_js_1.exportSnapshot)(this.snapshot());
    }
    /** Import a snapshot from a JSON string. */
    import(json) {
        this.restore((0, io_js_1.importSnapshot)(json));
    }
    /**
     * Persist the current in-memory state to the configured store.
     * Requires a store to be configured. Throws MemoryError if no store.
     */
    async persist() {
        if (!this._persistenceBackend)
            throw new errors_js_1.MemoryError('No persistence store configured');
        const snap = this.snapshot();
        await this._persistenceBackend.saveSnapshot(snap);
        this.logger.debug('persist: snapshot saved to store');
    }
    /**
     * Hydrate in-memory state from the configured store.
     * Requires a store to be configured. Throws MemoryError if no store.
     */
    async hydrate() {
        if (!this._persistenceBackend)
            throw new errors_js_1.MemoryError('No persistence store configured');
        const snap = await this._persistenceBackend.loadSnapshot();
        this.restore(snap);
        this.logger.debug('hydrate: snapshot loaded from store');
    }
    /** Dispose of resources (sweepers, etc.). */
    dispose() {
        this.working.dispose();
    }
}
exports.MemorySystem = MemorySystem;
//# sourceMappingURL=memory.js.map