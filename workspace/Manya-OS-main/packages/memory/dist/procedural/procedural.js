"use strict";
/**
 * @manya-os/memory — procedural memory (named skills).
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProceduralMemory = void 0;
const errors_js_1 = require("../errors.js");
const keys_js_1 = require("../longterm/keys.js");
class ProceduralMemory {
    skills = new Map();
    /** Register a skill. Returns the skill id. */
    learn(name, handler, opts) {
        if (!name)
            throw new errors_js_1.ProceduralMemoryError('skill name is required');
        if (typeof handler !== 'function')
            throw new errors_js_1.ProceduralMemoryError('handler must be a function');
        if (this.skills.has(name))
            throw new errors_js_1.ProceduralMemoryError(`skill '${name}' already learned`);
        const id = (0, keys_js_1.randomId)('proc');
        const skill = {
            id, name, handler,
            description: opts?.description,
            arguments: opts?.arguments,
            learnedAt: Date.now(),
            tags: opts?.tags,
        };
        this.skills.set(name, skill);
        return id;
    }
    /** Execute a skill by name. */
    execute(name, ...args) {
        const s = this.skills.get(name);
        if (!s)
            throw new errors_js_1.ProceduralMemoryError(`procedural skill '${name}' not found`);
        if (!s.handler)
            throw new errors_js_1.ProceduralMemoryError(`skill '${name}' has no handler (likely restored from snapshot)`);
        return s.handler(...args);
    }
    /** Get a skill (metadata only — no handler exposed). */
    get(name) {
        return this.skills.get(name);
    }
    /** Forget a skill. */
    forget(name) {
        return this.skills.delete(name);
    }
    /** List all skill names. */
    list() {
        return Array.from(this.skills.keys());
    }
    /** Count skills. */
    count() { return this.skills.size; }
    /** Find skills by tag. */
    findByTag(tag) {
        return Array.from(this.skills.values()).filter(s => s.tags?.includes(tag));
    }
}
exports.ProceduralMemory = ProceduralMemory;
//# sourceMappingURL=procedural.js.map