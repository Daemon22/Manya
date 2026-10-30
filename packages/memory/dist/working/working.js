"use strict";
/**
 * @manya-os/memory — working memory (short-TTL scratchpad).
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkingMemory = void 0;
const errors_js_1 = require("../errors.js");
const keys_js_1 = require("../longterm/keys.js");
class WorkingMemory {
    defaultTtlMs;
    store = new Map();
    sweeper = null;
    constructor(defaultTtlMs = 5 * 60 * 1000) {
        this.defaultTtlMs = defaultTtlMs;
        // Auto-sweep every 30 seconds in Node runtimes.
        if (typeof setInterval === 'function' && typeof process !== 'undefined' && process.versions?.node) {
            this.sweeper = setInterval(() => this.sweep(), 30_000);
            if (this.sweeper && typeof this.sweeper.unref === 'function')
                this.sweeper.unref();
        }
    }
    /** Store a value with optional TTL. Returns the entry id. */
    set(key, value, ttlMs, tags) {
        if (!key || typeof key !== 'string')
            throw new errors_js_1.WorkingMemoryError('key must be non-empty string');
        const id = (0, keys_js_1.randomId)('wk');
        const entry = {
            id, key, value,
            createdAt: Date.now(),
            ttlMs: ttlMs ?? this.defaultTtlMs,
            tags,
        };
        this.store.set(key, entry);
        return id;
    }
    /** Retrieve a value. Returns null if missing or expired. */
    get(key) {
        const e = this.store.get(key);
        if (!e)
            return null;
        if (this.isExpired(e)) {
            this.store.delete(key);
            return null;
        }
        return e.value;
    }
    /** Get the full entry (including metadata). */
    getEntry(key) {
        const e = this.store.get(key);
        if (!e)
            return null;
        if (this.isExpired(e)) {
            this.store.delete(key);
            return null;
        }
        return e;
    }
    /** Check if a key exists (and is not expired). */
    has(key) {
        const e = this.store.get(key);
        if (!e)
            return false;
        if (this.isExpired(e)) {
            this.store.delete(key);
            return false;
        }
        return true;
    }
    /** Delete a key. */
    delete(key) {
        return this.store.delete(key);
    }
    /** Clear all working memory. */
    clear() {
        this.store.clear();
    }
    /** Number of non-expired entries. */
    size() {
        this.sweep();
        return this.store.size;
    }
    /** Iterate non-expired entries. */
    entries() {
        this.sweep();
        return Array.from(this.store.values());
    }
    /** Find entries by tag. */
    findByTag(tag) {
        return this.entries().filter(e => e.tags?.includes(tag));
    }
    /** Stop the sweeper. */
    dispose() {
        if (this.sweeper) {
            clearInterval(this.sweeper);
            this.sweeper = null;
        }
    }
    isExpired(e) {
        if (!e.ttlMs)
            return false;
        return Date.now() - e.createdAt > e.ttlMs;
    }
    /** Remove expired entries. Returns count removed. */
    sweep() {
        let removed = 0;
        for (const [k, e] of this.store) {
            if (this.isExpired(e)) {
                this.store.delete(k);
                removed++;
            }
        }
        return removed;
    }
}
exports.WorkingMemory = WorkingMemory;
//# sourceMappingURL=working.js.map