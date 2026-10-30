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

import type {
  EpisodicEvent,
  LongTermRecord,
  MemoryId,
  MemoryLink,
  MemoryPermission,
  MemorySnapshot,
  MemoryType,
  SemanticFact,
} from '../types.js';

/**
 * Persistence backend for the memory system.
 *
 * All methods are async to support network-backed stores (databases, APIs).
 * The default in-memory implementation is provided by {@link InMemoryMemoryStore}.
 */
export interface MemoryStore {
  // ----- Episodic -----

  /** Persist a single episodic event. */
  putEpisodic(event: EpisodicEvent): Promise<void>;
  /** Retrieve an episodic event by ID, or null if absent. */
  getEpisodic(id: string): Promise<EpisodicEvent | null>;
  /** Delete an episodic event by ID. Returns true if deleted. */
  deleteEpisodic(id: string): Promise<boolean>;
  /** List episodic events with optional filters. */
  listEpisodic(opts?: { agent?: string; limit?: number; before?: number }): Promise<EpisodicEvent[]>;
  /** Prune episodic events older than the given timestamp. Returns count removed. */
  pruneEpisodic(olderThan: number): Promise<number>;

  // ----- Semantic -----

  /** Persist a semantic fact (upsert by ID). */
  putSemantic(fact: SemanticFact): Promise<void>;
  /** Retrieve a semantic fact by ID, or null if absent. */
  getSemantic(id: string): Promise<SemanticFact | null>;
  /** Delete a semantic fact by ID. Returns true if deleted. */
  deleteSemantic(id: string): Promise<boolean>;
  /** Find semantic facts by entity and optionally attribute. */
  findSemantic(entity: string, attribute?: string): Promise<SemanticFact[]>;
  /** Update the confidence of a semantic fact. Returns true if updated. */
  updateSemanticConfidence(id: string, confidence: number): Promise<boolean>;

  // ----- Long-term -----

  /** Persist a long-term record (upsert by ID). */
  putLongterm(record: LongTermRecord): Promise<void>;
  /** Retrieve a long-term record by ID, or null if absent. */
  getLongterm(id: string): Promise<LongTermRecord | null>;
  /** Delete a long-term record by ID. Returns true if deleted. */
  deleteLongterm(id: string): Promise<boolean>;
  /** List long-term records with optional filters. */
  listLongterm(opts?: { type?: MemoryType; tag?: string; limit?: number }): Promise<LongTermRecord[]>;
  /** Touch a long-term record: increment accessCount and update lastAccessedAt. */
  touchLongterm(id: string): Promise<boolean>;

  // ----- Links -----

  /** Add a link between two records (upsert). */
  putLink(link: MemoryLink): Promise<void>;
  /** Delete a specific link. Returns true if deleted. */
  deleteLink(fromId: string, toId: string, relation: string): Promise<boolean>;
  /** Get all outgoing links from a record. */
  outgoingFrom(id: string): Promise<MemoryLink[]>;
  /** Get all incoming links to a record. */
  incomingTo(id: string): Promise<MemoryLink[]>;

  // ----- Permissions -----

  /** Set permissions for a record (upsert). */
  setPermission(perm: MemoryPermission): Promise<void>;
  /** Get permissions for a record, or null if absent. */
  getPermission(recordId: string): Promise<MemoryPermission | null>;
  /** Delete permissions for a record. Returns true if deleted. */
  deletePermission(recordId: string): Promise<boolean>;

  // ----- Bulk operations -----

  /** Load the full snapshot from the store. */
  loadSnapshot(): Promise<MemorySnapshot>;
  /** Save a full snapshot to the store (replaces all data). */
  saveSnapshot(snapshot: MemorySnapshot): Promise<void>;
}

/**
 * In-memory implementation of {@link MemoryStore}.
 * Delegates to plain Maps — identical to the current MemorySystem behavior.
 */
export class InMemoryMemoryStore implements MemoryStore {
  private readonly episodic = new Map<string, EpisodicEvent>();
  private readonly semantic = new Map<string, SemanticFact>();
  private readonly longterm = new Map<string, LongTermRecord>();
  private readonly links = new Map<string, MemoryLink>();
  private readonly permissions = new Map<string, MemoryPermission>();

  private linkKey(l: MemoryLink): string {
    return `${l.fromId}|${l.toId}|${l.relation}`;
  }

  async putEpisodic(event: EpisodicEvent): Promise<void> {
    this.episodic.set(event.id, JSON.parse(JSON.stringify(event)));
  }

  async getEpisodic(id: string): Promise<EpisodicEvent | null> {
    const e = this.episodic.get(id);
    return e ? JSON.parse(JSON.stringify(e)) : null;
  }

  async deleteEpisodic(id: string): Promise<boolean> {
    return this.episodic.delete(id);
  }

  async listEpisodic(opts?: { agent?: string; limit?: number; before?: number }): Promise<EpisodicEvent[]> {
    let results = Array.from(this.episodic.values());
    if (opts?.agent) results = results.filter((e) => e.agent === opts.agent);
    if (opts?.before) results = results.filter((e) => e.timestamp < opts.before!);
    results.sort((a, b) => a.timestamp - b.timestamp);
    if (opts?.limit) results = results.slice(0, opts.limit);
    return results.map((e) => JSON.parse(JSON.stringify(e)));
  }

  async pruneEpisodic(olderThan: number): Promise<number> {
    let count = 0;
    for (const [id, e] of this.episodic) {
      if (e.timestamp < olderThan) {
        this.episodic.delete(id);
        count++;
      }
    }
    return count;
  }

  async putSemantic(fact: SemanticFact): Promise<void> {
    this.semantic.set(fact.id, JSON.parse(JSON.stringify(fact)));
  }

  async getSemantic(id: string): Promise<SemanticFact | null> {
    const f = this.semantic.get(id);
    return f ? JSON.parse(JSON.stringify(f)) : null;
  }

  async deleteSemantic(id: string): Promise<boolean> {
    return this.semantic.delete(id);
  }

  async findSemantic(entity: string, attribute?: string): Promise<SemanticFact[]> {
    let results = Array.from(this.semantic.values());
    if (attribute) {
      results = results.filter((f) => f.entity === entity && f.attribute === attribute);
    } else {
      results = results.filter((f) => f.entity === entity);
    }
    return results.map((f) => JSON.parse(JSON.stringify(f)));
  }

  async updateSemanticConfidence(id: string, confidence: number): Promise<boolean> {
    const f = this.semantic.get(id);
    if (!f) return false;
    f.confidence = confidence;
    return true;
  }

  async putLongterm(record: LongTermRecord): Promise<void> {
    this.longterm.set(record.id, JSON.parse(JSON.stringify(record)));
  }

  async getLongterm(id: string): Promise<LongTermRecord | null> {
    const r = this.longterm.get(id);
    return r ? JSON.parse(JSON.stringify(r)) : null;
  }

  async deleteLongterm(id: string): Promise<boolean> {
    return this.longterm.delete(id);
  }

  async listLongterm(opts?: { type?: MemoryType; tag?: string; limit?: number }): Promise<LongTermRecord[]> {
    let results = Array.from(this.longterm.values());
    if (opts?.type) results = results.filter((r) => r.type === opts.type);
    if (opts?.tag) results = results.filter((r) => r.tags?.includes(opts.tag!));
    if (opts?.limit) results = results.slice(0, opts.limit);
    return results.map((r) => JSON.parse(JSON.stringify(r)));
  }

  async touchLongterm(id: string): Promise<boolean> {
    const r = this.longterm.get(id);
    if (!r) return false;
    r.accessCount++;
    r.lastAccessedAt = Date.now();
    return true;
  }

  async putLink(link: MemoryLink): Promise<void> {
    this.links.set(this.linkKey(link), JSON.parse(JSON.stringify(link)));
  }

  async deleteLink(fromId: string, toId: string, relation: string): Promise<boolean> {
    return this.links.delete(`${fromId}|${toId}|${relation}`);
  }

  async outgoingFrom(id: string): Promise<MemoryLink[]> {
    return Array.from(this.links.values())
      .filter((l) => l.fromId === id)
      .map((l) => JSON.parse(JSON.stringify(l)));
  }

  async incomingTo(id: string): Promise<MemoryLink[]> {
    return Array.from(this.links.values())
      .filter((l) => l.toId === id)
      .map((l) => JSON.parse(JSON.stringify(l)));
  }

  async setPermission(perm: MemoryPermission): Promise<void> {
    this.permissions.set(perm.recordId, JSON.parse(JSON.stringify(perm)));
  }

  async getPermission(recordId: string): Promise<MemoryPermission | null> {
    const p = this.permissions.get(recordId);
    return p ? JSON.parse(JSON.stringify(p)) : null;
  }

  async deletePermission(recordId: string): Promise<boolean> {
    return this.permissions.delete(recordId);
  }

  async loadSnapshot(): Promise<MemorySnapshot> {
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

  async saveSnapshot(snapshot: MemorySnapshot): Promise<void> {
    this.episodic.clear();
    this.semantic.clear();
    this.longterm.clear();
    this.links.clear();
    this.permissions.clear();

    for (const e of snapshot.episodic) this.episodic.set(e.id, JSON.parse(JSON.stringify(e)));
    for (const f of snapshot.semantic) this.semantic.set(f.id, JSON.parse(JSON.stringify(f)));
    for (const r of snapshot.longterm) this.longterm.set(r.id, JSON.parse(JSON.stringify(r)));
    for (const l of snapshot.links) this.links.set(this.linkKey(l), JSON.parse(JSON.stringify(l)));
    for (const p of snapshot.permissions) this.permissions.set(p.recordId, JSON.parse(JSON.stringify(p)));
  }
}
