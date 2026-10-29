/**
 * @manya-os/memory — semantic memory (facts about entities).
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import type { SemanticFact } from '../types.js';
import { SemanticMemoryError } from '../errors.js';
import { randomId } from '../longterm/keys.js';

export class SemanticMemory {
  /** Index: entity → attribute → fact. */
  private readonly facts = new Map<string, Map<string, SemanticFact>>();
  /** Reverse index: attribute → entities that have it. */
  private readonly byAttribute = new Map<string, Set<string>>();

  /** Learn (or update) a fact. Returns the fact id. */
  learn(entity: string, attribute: string, value: unknown, confidence: number = 1.0, source?: string): string {
    if (!entity) throw new SemanticMemoryError('entity is required');
    if (!attribute) throw new SemanticMemoryError('attribute is required');
    if (confidence < 0 || confidence > 1) throw new SemanticMemoryError('confidence must be in [0,1]');
    const id = randomId('sem');
    const fact: SemanticFact = {
      id, entity, attribute, value, confidence,
      learnedAt: Date.now(), source,
    };
    if (!this.facts.has(entity)) this.facts.set(entity, new Map());
    this.facts.get(entity)!.set(attribute, fact);
    if (!this.byAttribute.has(attribute)) this.byAttribute.set(attribute, new Set());
    this.byAttribute.get(attribute)!.add(entity);
    return id;
  }

  /** Recall a single fact (entity + attribute). */
  recall(entity: string, attribute: string): SemanticFact | null {
    return this.facts.get(entity)?.get(attribute) ?? null;
  }

  /** Recall all attributes for an entity. */
  recallEntity(entity: string): SemanticFact[] {
    const map = this.facts.get(entity);
    return map ? Array.from(map.values()) : [];
  }

  /** Find entities by attribute. */
  findByAttribute(attribute: string, valueMatch?: unknown): SemanticFact[] {
    const entities = this.byAttribute.get(attribute);
    if (!entities) return [];
    const out: SemanticFact[] = [];
    for (const e of entities) {
      const f = this.facts.get(e)?.get(attribute);
      if (f && (valueMatch === undefined || JSON.stringify(f.value) === JSON.stringify(valueMatch))) {
        out.push(f);
      }
    }
    return out;
  }

  /** Forget a fact. Returns true if it existed. */
  forget(entity: string, attribute: string): boolean {
    const removed = this.facts.get(entity)?.delete(attribute) ?? false;
    if (removed) {
      const set = this.byAttribute.get(attribute);
      if (set) {
        set.delete(entity);
        if (set.size === 0) this.byAttribute.delete(attribute);
      }
      const entMap = this.facts.get(entity);
      if (entMap && entMap.size === 0) this.facts.delete(entity);
    }
    return removed;
  }

  /** Update confidence on a fact. */
  updateConfidence(entity: string, attribute: string, confidence: number): void {
    const f = this.recall(entity, attribute);
    if (!f) throw new SemanticMemoryError(`No fact for ${entity}.${attribute}`);
    if (confidence < 0 || confidence > 1) throw new SemanticMemoryError('confidence must be in [0,1]');
    f.confidence = confidence;
  }

  /** All facts. */
  all(): SemanticFact[] {
    const out: SemanticFact[] = [];
    for (const entMap of this.facts.values()) out.push(...entMap.values());
    return out;
  }

  /** Count facts. */
  count(): number {
    let n = 0;
    for (const m of this.facts.values()) n += m.size;
    return n;
  }
}
