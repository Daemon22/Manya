/**
 * @manya-os/memory — semantic memory (facts about entities).
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
import type { SemanticFact } from '../types.js';
export declare class SemanticMemory {
    /** Index: entity → attribute → fact. */
    private readonly facts;
    /** Reverse index: attribute → entities that have it. */
    private readonly byAttribute;
    /** Learn (or update) a fact. Returns the fact id. */
    learn(entity: string, attribute: string, value: unknown, confidence?: number, source?: string): string;
    /** Recall a single fact (entity + attribute). */
    recall(entity: string, attribute: string): SemanticFact | null;
    /** Recall all attributes for an entity. */
    recallEntity(entity: string): SemanticFact[];
    /** Find entities by attribute. */
    findByAttribute(attribute: string, valueMatch?: unknown): SemanticFact[];
    /** Forget a fact. Returns true if it existed. */
    forget(entity: string, attribute: string): boolean;
    /** Update confidence on a fact. */
    updateConfidence(entity: string, attribute: string, confidence: number): void;
    /** All facts. */
    all(): SemanticFact[];
    /** Count facts. */
    count(): number;
}
//# sourceMappingURL=semantic.d.ts.map