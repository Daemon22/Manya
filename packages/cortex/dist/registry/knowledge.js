"use strict";
/**
 * @manya-os/cortex — knowledge registry and differential sync.
 *
 * Tracks which component owns each knowledge key and computes
 * differential payloads for efficient inter-component sync.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.KnowledgeRegistry = void 0;
const errors_js_1 = require("../errors.js");
class KnowledgeRegistry {
    entries = new Map();
    /**
     * Register a knowledge key with an owning component.
     * Throws if the key is already owned by a different component.
     */
    register(key, ownerComponentId, opts) {
        if (!key)
            throw new errors_js_1.KnowledgeError('key is required');
        if (!ownerComponentId)
            throw new errors_js_1.KnowledgeError('ownerComponentId is required');
        const now = Date.now();
        const existing = this.entries.get(key);
        if (existing) {
            if (existing.ownerComponentId !== ownerComponentId) {
                throw new errors_js_1.KnowledgeError(`key '${key}' is already owned by '${existing.ownerComponentId}'`);
            }
            // Update existing entry owned by the same component.
            existing.lastUpdated = now;
            if (opts?.description !== undefined)
                existing.description = opts.description;
            return existing;
        }
        const entry = {
            key,
            ownerComponentId,
            registeredAt: now,
            lastUpdated: now,
            description: opts?.description,
        };
        this.entries.set(key, entry);
        return entry;
    }
    /**
     * Register or transfer a knowledge key. If the key is owned by a different
     * component, the ownership is transferred (previous entry is overwritten).
     * This is the non-throwing variant for use during sync.
     */
    transfer(key, newOwnerComponentId, opts) {
        if (!key)
            throw new errors_js_1.KnowledgeError('key is required');
        if (!newOwnerComponentId)
            throw new errors_js_1.KnowledgeError('newOwnerComponentId is required');
        const now = Date.now();
        const existing = this.entries.get(key);
        if (existing && existing.ownerComponentId === newOwnerComponentId) {
            // Same owner — just update.
            existing.lastUpdated = now;
            if (opts?.description !== undefined)
                existing.description = opts.description;
            return existing;
        }
        const entry = {
            key,
            ownerComponentId: newOwnerComponentId,
            registeredAt: existing?.registeredAt ?? now,
            lastUpdated: now,
            description: opts?.description ?? existing?.description,
        };
        this.entries.set(key, entry);
        return entry;
    }
    /** Look up the owning component for a key. */
    lookup(key) {
        return this.entries.get(key);
    }
    /** Check if a key is registered. */
    has(key) {
        return this.entries.has(key);
    }
    /** Remove a key. Returns true if it was present. */
    unregister(key) {
        return this.entries.delete(key);
    }
    /** Get all entries. */
    all() {
        return Array.from(this.entries.values());
    }
    /** Get all keys owned by a given component. */
    byOwner(ownerComponentId) {
        return this.all().filter(e => e.ownerComponentId === ownerComponentId);
    }
    /** Number of registered keys. */
    size() {
        return this.entries.size;
    }
    /**
     * Compute the differential (delta) of knowledge changes since a given
     * timestamp. Used for efficient inter-component sync: only changed data
     * is transferred.
     *
     * @param since - Epoch ms. Only entries with `lastUpdated > since` are included.
     */
    diff(since) {
        if (since < 0)
            throw new errors_js_1.KnowledgeError('since must be non-negative');
        const added = [];
        const changed = [];
        for (const entry of this.entries.values()) {
            if (entry.lastUpdated <= since)
                continue;
            if (entry.registeredAt > since) {
                added.push(entry);
            }
            else {
                changed.push(entry);
            }
        }
        const delta = { added, changed, derived: [] };
        return {
            hasChanges: added.length > 0 || changed.length > 0,
            delta,
            queriedAt: Date.now(),
        };
    }
    /**
     * Compute diff excluding keys owned by a specific component.
     * Useful when a component wants to see changes from *other* components only.
     */
    diffExcluding(since, excludeComponentId) {
        if (since < 0)
            throw new errors_js_1.KnowledgeError('since must be non-negative');
        const added = [];
        const changed = [];
        for (const entry of this.entries.values()) {
            if (entry.ownerComponentId === excludeComponentId)
                continue;
            if (entry.lastUpdated <= since)
                continue;
            if (entry.registeredAt > since) {
                added.push(entry);
            }
            else {
                changed.push(entry);
            }
        }
        const delta = { added, changed, derived: [] };
        return {
            hasChanges: added.length > 0 || changed.length > 0,
            delta,
            queriedAt: Date.now(),
        };
    }
}
exports.KnowledgeRegistry = KnowledgeRegistry;
//# sourceMappingURL=knowledge.js.map