"use strict";
/**
 * @manya-os/memory — long-term storage (durable records).
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LongTermMemory = void 0;
const errors_js_1 = require("../errors.js");
const keys_js_1 = require("./keys.js");
class LongTermMemory {
    records = new Map();
    byTag = new Map();
    byType = new Map();
    /** Store a record. Returns its id. */
    store(payload, opts) {
        const id = opts?.id ?? (0, keys_js_1.randomId)('lt');
        if (this.records.has(id))
            throw new errors_js_1.LongTermMemoryError(`record '${id}' already exists`);
        const now = Date.now();
        const rec = {
            id, type: opts?.type ?? 'longterm', payload,
            createdAt: now, lastAccessedAt: now, accessCount: 0,
            importance: opts?.importance ?? 0.5,
            tags: opts?.tags, source: opts?.source,
        };
        this.records.set(id, rec);
        for (const t of rec.tags ?? []) {
            if (!this.byTag.has(t))
                this.byTag.set(t, new Set());
            this.byTag.get(t).add(id);
        }
        if (!this.byType.has(rec.type))
            this.byType.set(rec.type, new Set());
        this.byType.get(rec.type).add(id);
        return id;
    }
    /** Retrieve a record (updates access stats). */
    retrieve(id) {
        const r = this.records.get(id);
        if (!r)
            return null;
        r.lastAccessedAt = Date.now();
        r.accessCount++;
        return r;
    }
    /** Peek without updating access stats. */
    peek(id) {
        return this.records.get(id) ?? null;
    }
    /** Update a record's payload. */
    update(id, payload) {
        const r = this.records.get(id);
        if (!r)
            throw new errors_js_1.LongTermMemoryError(`record '${id}' not found`);
        r.payload = payload;
    }
    /** Delete a record. */
    delete(id) {
        const r = this.records.get(id);
        if (!r)
            return false;
        for (const t of r.tags ?? [])
            this.byTag.get(t)?.delete(id);
        this.byType.get(r.type)?.delete(id);
        return this.records.delete(id);
    }
    /** Find by tag. */
    findByTag(tag) {
        const ids = this.byTag.get(tag);
        if (!ids)
            return [];
        return Array.from(ids).map(id => this.records.get(id)).filter(Boolean);
    }
    /** Find by type. */
    findByType(type) {
        const ids = this.byType.get(type);
        if (!ids)
            return [];
        return Array.from(ids).map(id => this.records.get(id)).filter(Boolean);
    }
    /** All records. */
    all() {
        return Array.from(this.records.values());
    }
    /** Count. */
    count() { return this.records.size; }
    /** Records not accessed since cutoff (candidates for compression/archival). */
    staleSince(cutoffMs) {
        return this.all().filter(r => r.lastAccessedAt < cutoffMs);
    }
    /** Apply an aging policy: mark records as low-importance based on age & access. */
    applyAging(now = Date.now()) {
        let aged = 0;
        for (const r of this.records.values()) {
            const ageDays = (now - r.createdAt) / 86_400_000;
            if (ageDays > 30 && r.accessCount < 3) {
                r.importance = Math.max(0, r.importance - 0.1);
                aged++;
            }
        }
        return aged;
    }
}
exports.LongTermMemory = LongTermMemory;
//# sourceMappingURL=longterm.js.map