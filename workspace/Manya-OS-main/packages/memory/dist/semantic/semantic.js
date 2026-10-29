"use strict";
/**
 * @manya-os/memory — semantic memory (facts about entities).
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SemanticMemory = void 0;
const errors_js_1 = require("../errors.js");
const keys_js_1 = require("../longterm/keys.js");
class SemanticMemory {
    /** Index: entity → attribute → fact. */
    facts = new Map();
    /** Reverse index: attribute → entities that have it. */
    byAttribute = new Map();
    /** Learn (or update) a fact. Returns the fact id. */
    learn(entity, attribute, value, confidence = 1.0, source) {
        if (!entity)
            throw new errors_js_1.SemanticMemoryError('entity is required');
        if (!attribute)
            throw new errors_js_1.SemanticMemoryError('attribute is required');
        if (confidence < 0 || confidence > 1)
            throw new errors_js_1.SemanticMemoryError('confidence must be in [0,1]');
        const id = (0, keys_js_1.randomId)('sem');
        const fact = {
            id, entity, attribute, value, confidence,
            learnedAt: Date.now(), source,
        };
        if (!this.facts.has(entity))
            this.facts.set(entity, new Map());
        this.facts.get(entity).set(attribute, fact);
        if (!this.byAttribute.has(attribute))
            this.byAttribute.set(attribute, new Set());
        this.byAttribute.get(attribute).add(entity);
        return id;
    }
    /** Recall a single fact (entity + attribute). */
    recall(entity, attribute) {
        return this.facts.get(entity)?.get(attribute) ?? null;
    }
    /** Recall all attributes for an entity. */
    recallEntity(entity) {
        const map = this.facts.get(entity);
        return map ? Array.from(map.values()) : [];
    }
    /** Find entities by attribute. */
    findByAttribute(attribute, valueMatch) {
        const entities = this.byAttribute.get(attribute);
        if (!entities)
            return [];
        const out = [];
        for (const e of entities) {
            const f = this.facts.get(e)?.get(attribute);
            if (f && (valueMatch === undefined || JSON.stringify(f.value) === JSON.stringify(valueMatch))) {
                out.push(f);
            }
        }
        return out;
    }
    /** Forget a fact. Returns true if it existed. */
    forget(entity, attribute) {
        const removed = this.facts.get(entity)?.delete(attribute) ?? false;
        if (removed) {
            const set = this.byAttribute.get(attribute);
            if (set) {
                set.delete(entity);
                if (set.size === 0)
                    this.byAttribute.delete(attribute);
            }
            const entMap = this.facts.get(entity);
            if (entMap && entMap.size === 0)
                this.facts.delete(entity);
        }
        return removed;
    }
    /** Update confidence on a fact. */
    updateConfidence(entity, attribute, confidence) {
        const f = this.recall(entity, attribute);
        if (!f)
            throw new errors_js_1.SemanticMemoryError(`No fact for ${entity}.${attribute}`);
        if (confidence < 0 || confidence > 1)
            throw new errors_js_1.SemanticMemoryError('confidence must be in [0,1]');
        f.confidence = confidence;
    }
    /** All facts. */
    all() {
        const out = [];
        for (const entMap of this.facts.values())
            out.push(...entMap.values());
        return out;
    }
    /** Count facts. */
    count() {
        let n = 0;
        for (const m of this.facts.values())
            n += m.size;
        return n;
    }
}
exports.SemanticMemory = SemanticMemory;
//# sourceMappingURL=semantic.js.map