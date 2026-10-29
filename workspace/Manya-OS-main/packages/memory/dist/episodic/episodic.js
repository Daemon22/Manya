"use strict";
/**
 * @manya-os/memory — episodic memory (timestamped events).
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EpisodicMemory = void 0;
const errors_js_1 = require("../errors.js");
const keys_js_1 = require("../longterm/keys.js");
class EpisodicMemory {
    events = [];
    maxCount;
    constructor(maxCount = 10_000) {
        if (maxCount < 1)
            throw new errors_js_1.EpisodicMemoryError('maxCount must be positive');
        this.maxCount = maxCount;
    }
    /** Record an event. Returns the event id. */
    record(agent, event, context, opts) {
        if (!agent)
            throw new errors_js_1.EpisodicMemoryError('agent is required');
        if (!event)
            throw new errors_js_1.EpisodicMemoryError('event is required');
        const id = opts?.id ?? (0, keys_js_1.randomId)('ep');
        const e = {
            id, timestamp: opts?.timestamp ?? Date.now(), agent, event,
            context, importance: opts?.importance ?? 0.5,
            tags: opts?.tags, source: opts?.source,
        };
        // If id already exists, replace; otherwise push.
        const existingIdx = this.events.findIndex(ev => ev.id === id);
        if (existingIdx >= 0)
            this.events[existingIdx] = e;
        else {
            this.events.push(e);
            if (this.events.length > this.maxCount)
                this.events.shift();
        }
        return id;
    }
    /** Recall the last N events. */
    recall(limit = 10, agentFilter) {
        const filtered = agentFilter ? this.events.filter(e => e.agent === agentFilter) : this.events;
        return filtered.slice(-limit);
    }
    /** Recall events in a time range. */
    recallRange(startMs, endMs, limit = 100) {
        return this.events.filter(e => e.timestamp >= startMs && e.timestamp <= endMs).slice(-limit);
    }
    /** Find events matching a substring (case-insensitive). */
    search(query, limit = 20) {
        const q = query.toLowerCase();
        return this.events.filter(e => e.event.toLowerCase().includes(q) ||
            (e.context && JSON.stringify(e.context).toLowerCase().includes(q)))
            .slice(-limit);
    }
    /** Find by tag. */
    findByTag(tag) {
        return this.events.filter(e => e.tags?.includes(tag));
    }
    /** Find by id. */
    findById(id) {
        return this.events.find(e => e.id === id);
    }
    /** Get all events (read-only). */
    all() {
        return [...this.events];
    }
    /** Count events. */
    count() { return this.events.length; }
    /** Delete events older than cutoff. Returns count removed. */
    pruneOlderThan(cutoffMs) {
        const before = this.events.length;
        const kept = this.events.filter(e => e.timestamp >= cutoffMs);
        const removed = before - kept.length;
        // Mutate in place to preserve array identity for external references.
        this.events.length = 0;
        this.events.push(...kept);
        return removed;
    }
    /** Prune low-importance events when over a count threshold. */
    pruneLowImportance(threshold = 0.3, maxCount) {
        const cap = maxCount ?? this.maxCount;
        if (this.events.length <= cap)
            return 0;
        const before = this.events.length;
        const kept = this.events.filter(e => (e.importance ?? 0) >= threshold);
        // Always keep the most recent 100 regardless of importance.
        const recent = this.events.slice(-100);
        const seen = new Set(recent.map(e => e.id));
        for (const e of kept)
            if (!seen.has(e.id))
                seen.add(e.id);
        const final = this.events.filter(e => seen.has(e.id));
        this.events.length = 0;
        this.events.push(...final);
        return before - this.events.length;
    }
}
exports.EpisodicMemory = EpisodicMemory;
//# sourceMappingURL=episodic.js.map