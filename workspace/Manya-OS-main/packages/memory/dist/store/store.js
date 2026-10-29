"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryMemoryStore = void 0;
/**
 * In-memory implementation of {@link MemoryStore}.
 * Delegates to plain Maps — identical to the current MemorySystem behavior.
 */
class InMemoryMemoryStore {
    episodic = new Map();
    semantic = new Map();
    longterm = new Map();
    links = new Map();
    permissions = new Map();
    linkKey(l) {
        return `${l.fromId}|${l.toId}|${l.relation}`;
    }
    async putEpisodic(event) {
        this.episodic.set(event.id, JSON.parse(JSON.stringify(event)));
    }
    async getEpisodic(id) {
        const e = this.episodic.get(id);
        return e ? JSON.parse(JSON.stringify(e)) : null;
    }
    async deleteEpisodic(id) {
        return this.episodic.delete(id);
    }
    async listEpisodic(opts) {
        let results = Array.from(this.episodic.values());
        if (opts?.agent)
            results = results.filter((e) => e.agent === opts.agent);
        if (opts?.before)
            results = results.filter((e) => e.timestamp < opts.before);
        results.sort((a, b) => a.timestamp - b.timestamp);
        if (opts?.limit)
            results = results.slice(0, opts.limit);
        return results.map((e) => JSON.parse(JSON.stringify(e)));
    }
    async pruneEpisodic(olderThan) {
        let count = 0;
        for (const [id, e] of this.episodic) {
            if (e.timestamp < olderThan) {
                this.episodic.delete(id);
                count++;
            }
        }
        return count;
    }
    async putSemantic(fact) {
        this.semantic.set(fact.id, JSON.parse(JSON.stringify(fact)));
    }
    async getSemantic(id) {
        const f = this.semantic.get(id);
        return f ? JSON.parse(JSON.stringify(f)) : null;
    }
    async deleteSemantic(id) {
        return this.semantic.delete(id);
    }
    async findSemantic(entity, attribute) {
        let results = Array.from(this.semantic.values());
        if (attribute) {
            results = results.filter((f) => f.entity === entity && f.attribute === attribute);
        }
        else {
            results = results.filter((f) => f.entity === entity);
        }
        return results.map((f) => JSON.parse(JSON.stringify(f)));
    }
    async updateSemanticConfidence(id, confidence) {
        const f = this.semantic.get(id);
        if (!f)
            return false;
        f.confidence = confidence;
        return true;
    }
    async putLongterm(record) {
        this.longterm.set(record.id, JSON.parse(JSON.stringify(record)));
    }
    async getLongterm(id) {
        const r = this.longterm.get(id);
        return r ? JSON.parse(JSON.stringify(r)) : null;
    }
    async deleteLongterm(id) {
        return this.longterm.delete(id);
    }
    async listLongterm(opts) {
        let results = Array.from(this.longterm.values());
        if (opts?.type)
            results = results.filter((r) => r.type === opts.type);
        if (opts?.tag)
            results = results.filter((r) => r.tags?.includes(opts.tag));
        if (opts?.limit)
            results = results.slice(0, opts.limit);
        return results.map((r) => JSON.parse(JSON.stringify(r)));
    }
    async touchLongterm(id) {
        const r = this.longterm.get(id);
        if (!r)
            return false;
        r.accessCount++;
        r.lastAccessedAt = Date.now();
        return true;
    }
    async putLink(link) {
        this.links.set(this.linkKey(link), JSON.parse(JSON.stringify(link)));
    }
    async deleteLink(fromId, toId, relation) {
        return this.links.delete(`${fromId}|${toId}|${relation}`);
    }
    async outgoingFrom(id) {
        return Array.from(this.links.values())
            .filter((l) => l.fromId === id)
            .map((l) => JSON.parse(JSON.stringify(l)));
    }
    async incomingTo(id) {
        return Array.from(this.links.values())
            .filter((l) => l.toId === id)
            .map((l) => JSON.parse(JSON.stringify(l)));
    }
    async setPermission(perm) {
        this.permissions.set(perm.recordId, JSON.parse(JSON.stringify(perm)));
    }
    async getPermission(recordId) {
        const p = this.permissions.get(recordId);
        return p ? JSON.parse(JSON.stringify(p)) : null;
    }
    async deletePermission(recordId) {
        return this.permissions.delete(recordId);
    }
    async loadSnapshot() {
        return {
            schemaVersion: 1,
            takenAt: new Date().toISOString(),
            working: [],
            episodic: Array.from(this.episodic.values()).map((e) => JSON.parse(JSON.stringify(e))),
            semantic: Array.from(this.semantic.values()).map((f) => JSON.parse(JSON.stringify(f))),
            procedural: [],
            longterm: Array.from(this.longterm.values()).map((r) => JSON.parse(JSON.stringify(r))),
            links: Array.from(this.links.values()).map((l) => JSON.parse(JSON.stringify(l))),
            permissions: Array.from(this.permissions.values()).map((p) => JSON.parse(JSON.stringify(p))),
        };
    }
    async saveSnapshot(snapshot) {
        this.episodic.clear();
        this.semantic.clear();
        this.longterm.clear();
        this.links.clear();
        this.permissions.clear();
        for (const e of snapshot.episodic)
            this.episodic.set(e.id, JSON.parse(JSON.stringify(e)));
        for (const f of snapshot.semantic)
            this.semantic.set(f.id, JSON.parse(JSON.stringify(f)));
        for (const r of snapshot.longterm)
            this.longterm.set(r.id, JSON.parse(JSON.stringify(r)));
        for (const l of snapshot.links)
            this.links.set(this.linkKey(l), JSON.parse(JSON.stringify(l)));
        for (const p of snapshot.permissions)
            this.permissions.set(p.recordId, JSON.parse(JSON.stringify(p)));
    }
}
exports.InMemoryMemoryStore = InMemoryMemoryStore;
//# sourceMappingURL=store.js.map