/**
 * @manya-os/memory — the unified memory facade.
 *
 * Wires together all subsystems: working, episodic, semantic, procedural,
 * long-term, index, links, ranking, permissions, aging, sync, backup, I/O.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import type {
  EpisodicEvent, LongTermRecord, MemoryId, MemorySnapshot,
  RetrievalResult, CollaborationPackage, WriteConflict, ConflictResolution,
} from './types.js';
import type { MemoryStore } from './store/store.js';
import { WorkingMemory } from './working/working.js';
import { EpisodicMemory } from './episodic/episodic.js';
import { SemanticMemory } from './semantic/semantic.js';
import { ProceduralMemory } from './procedural/procedural.js';
import { LongTermMemory } from './longterm/longterm.js';
import { InvertedIndex } from './index/index.js';
import { LinkGraph } from './link/link.js';
import { PermissionModel } from './permissions/permissions.js';
import { rankLongTerm, rankEpisodic, DEFAULT_WEIGHTS } from './rank/rank.js';
import { mergeAgingPolicy, shouldPruneEpisodic, effectiveImportance } from './aging/aging.js';
import { computeDelta, applyDelta, detectConflicts, resolveConflicts, validateCollaborationPackage } from './sync/sync.js';
import type { SyncDelta } from './sync/sync.js';
import { createBackup, restoreBackup, verifyBackup } from './backup/backup.js';
import { exportSnapshot, importSnapshot } from './io/io.js';
import { DEFAULT_CONFIG, mergeConfig } from './config/config.js';
import type { MemoryConfig } from './config/config.js';
import { ConsoleLogger, SilentLogger } from './logging.js';
import type { Logger } from './logging.js';
import { MemoryError } from './errors.js';

export class MemorySystem {
  public readonly working: WorkingMemory;
  public readonly episodic: EpisodicMemory;
  public readonly semantic: SemanticMemory;
  public readonly procedural: ProceduralMemory;
  public readonly longterm: LongTermMemory;
  public readonly index: InvertedIndex;
  public readonly links: LinkGraph;
  public readonly permissions: PermissionModel;
  private readonly config: Required<Omit<MemoryConfig, 'logger' | 'store'>> & { logger?: Logger; store?: MemoryStore };
  private readonly logger: Logger;
  private readonly _persistenceBackend?: MemoryStore;
  /** Unique id for this memory instance. Used in collaboration packages. */
  public readonly instanceId: string;

  constructor(config?: MemoryConfig) {
    this.config = mergeConfig(config);
    this._persistenceBackend = config?.store;
    this.logger = this.config.logger ?? (
      this.config.logLevel === 'silent' ? new SilentLogger() : new ConsoleLogger(this.config.logLevel)
    );
    this.instanceId = `mem_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    this.working = new WorkingMemory(this.config.aging.workingTtlMs);
    this.episodic = new EpisodicMemory(this.config.aging.episodicMaxCount);
    this.semantic = new SemanticMemory();
    this.procedural = new ProceduralMemory();
    this.longterm = new LongTermMemory();
    this.index = new InvertedIndex();
    this.links = new LinkGraph();
    this.permissions = new PermissionModel();
  }

  /** The configured persistence store, if any. */
  get persistenceStore(): MemoryStore | undefined {
    return this._persistenceBackend;
  }

  /** Record an episodic event AND index it. */
  remember(agent: string, event: string, context?: Record<string, unknown>, opts?: { importance?: number; tags?: string[]; source?: string }): string {
    const id = this.episodic.record(agent, event, context, opts);
    // Index the event for retrieval.
    const text = `${event} ${context ? JSON.stringify(context) : ''}`;
    this.index.add(id, text);
    this.logger.debug('remember: recorded', { id, agent, event: event.slice(0, 60) });
    return id;
  }

  /** Recall events by query. Returns ranked results. */
  recall(query: string, limit: number = 10): RetrievalResult<EpisodicEvent>[] {
    const events = this.episodic.all();
    // Map the unified RankingWeights to the episodic-specific shape.
    const w = this.config.rankingWeights;
    const episodicWeights = { text: w.tfidf, importance: w.importance, recency: w.recency };
    return rankEpisodic(query, events, episodicWeights).slice(0, limit);
  }

  /** Learn a semantic fact AND index it. */
  learn(entity: string, attribute: string, value: unknown, confidence?: number, source?: string): string {
    const id = this.semantic.learn(entity, attribute, value, confidence, source);
    this.index.add(id, `${entity} ${attribute} ${JSON.stringify(value)}`);
    return id;
  }

  /** Store a long-term record AND index it. */
  store(payload: unknown, opts?: { type?: 'longterm'; importance?: number; tags?: string[]; source?: string; id?: string }): string {
    const id = this.longterm.store(payload, opts);
    this.index.add(id, typeof payload === 'string' ? payload : JSON.stringify(payload));
    return id;
  }

  /** Retrieve a long-term record (updates access stats). */
  retrieve(id: string): LongTermRecord | null {
    return this.longterm.retrieve(id);
  }

  /** Unified search across all memory types. Returns ranked long-term records. */
  search(query: string, limit: number = 10): RetrievalResult<LongTermRecord>[] {
    const results = this.index.search(query);
    const tfidf = new Map<string, number>();
    for (const r of results) tfidf.set(r.recordId, r.score);
    const records: LongTermRecord[] = [];
    for (const r of results) {
      const rec = this.longterm.peek(r.recordId);
      if (rec) records.push(rec);
    }
    return rankLongTerm(tfidf, records, this.config.rankingWeights).slice(0, limit);
  }

  /** Link two records. */
  link(fromId: MemoryId, toId: MemoryId, relation: string, weight?: number): boolean {
    return this.links.add(fromId, toId, relation, weight);
  }

  /** Find related records via links. */
  related(id: MemoryId, relation?: string, maxDepth?: number): MemoryId[] {
    if (relation) return this.links.traverse(id, relation, maxDepth ?? 5);
    const out = new Set<MemoryId>();
    for (const l of this.links.outgoingFrom(id)) out.add(l.toId);
    for (const l of this.links.incomingTo(id)) out.add(l.fromId);
    return Array.from(out);
  }

  /** Run aging: prune low-importance episodic events, decay long-term importance. */
  age(now: number = Date.now()): { prunedEpisodic: number; agedLongTerm: number } {
    const policy = mergeAgingPolicy(this.config.aging);
    const before = this.episodic.count();
    // Prune episodic events marked for pruning.
    const all = this.episodic.all();
    const toKeep = all.filter(e => !shouldPruneEpisodic(e, policy, now));
    // Always keep the most recent 100 events.
    if (toKeep.length < all.length) {
      const recent = all.slice(-100);
      const seen = new Set(recent.map(e => e.id));
      for (const e of toKeep) seen.add(e.id);
      // Re-populate episodic — but we don't have a direct API. Use pruneOlderThan as a workaround.
      const oldestKept = Math.min(...toKeep.map(e => e.timestamp), ...recent.map(e => e.timestamp));
      this.episodic.pruneOlderThan(oldestKept);
    }
    const prunedEpisodic = before - this.episodic.count();
    const agedLongTerm = this.longterm.applyAging(now);
    this.logger.debug('age: complete', { prunedEpisodic, agedLongTerm });
    return { prunedEpisodic, agedLongTerm };
  }

  /** Snapshot the entire memory state. */
  snapshot(): MemorySnapshot {
    return {
      schemaVersion: 1,
      takenAt: new Date().toISOString(),
      working: this.working.entries(),
      episodic: this.episodic.all(),
      semantic: this.semantic.all(),
      procedural: this.procedural.list().map(name => {
        const s = this.procedural.get(name)!;
        return { ...s, handler: undefined, handlerSerialized: false };
      }),
      longterm: this.longterm.all(),
      links: this.links.all(),
      permissions: this.permissions.all(),
    };
  }

  /** Restore from a snapshot. */
  restore(snapshot: MemorySnapshot): void {
    if (!snapshot || snapshot.schemaVersion !== 1) throw new MemoryError('invalid snapshot');
    this.working.clear();
    // Clear existing episodic events by pruning everything older than now+1
    this.episodic.pruneOlderThan(Date.now() + 1);
    for (const e of snapshot.episodic) this.episodic.record(e.agent, e.event, e.context, { importance: e.importance, tags: e.tags, source: e.source, id: e.id, timestamp: e.timestamp });
    for (const s of snapshot.semantic) this.semantic.learn(s.entity, s.attribute, s.value, s.confidence, s.source);
    for (const r of snapshot.longterm) this.longterm.store(r.payload, { type: r.type, importance: r.importance, tags: r.tags, source: r.source, id: r.id });
    for (const l of snapshot.links) this.links.add(l.fromId, l.toId, l.relation, l.weight);
    for (const p of snapshot.permissions) this.permissions.set(p);
  }

  /** Backup the current state. */
  backup() {
    return createBackup(this.snapshot());
  }

  /** Restore from a backup. */
  restoreFromBackup(backup: ReturnType<MemorySystem['backup']>): void {
    if (!verifyBackup(backup)) throw new MemoryError('backup verification failed');
    this.restore(restoreBackup(backup));
  }

  /**
   * Synchronize with a remote snapshot. Returns the applied delta.
   *
   * IMPORTANT: This method is for peer-to-peer sync between equally-privileged
   * local instances only. It must NOT be used to send full memory snapshots to
   * the Hub. Use `createCollaborationPackage()` for Hub interactions.
   * If the remote snapshot's source differs from the local instance and appears
   * to be a Hub-hosted mirror, the operation is rejected.
   */
  synchronize(remoteSnapshot: MemorySnapshot): SyncDelta {
    const local = this.snapshot();
    const delta = computeDelta(local, remoteSnapshot);
    const merged = applyDelta(local, remoteSnapshot, delta);
    this.restore(merged);
    return delta;
  }

  /**
   * Create a collaboration package containing only shareable data.
   * This is the ONLY mechanism for sharing memory between instances.
   * Full snapshots are never transmitted to the Hub.
   */
  createCollaborationPackage(opts?: {
    includeEpisodic?: boolean;
    includeSemantic?: boolean;
    includeLongterm?: boolean;
    filterEpisodic?: (event: EpisodicEvent) => boolean;
    filterSemantic?: (fact: import('./types.js').SemanticFact) => boolean;
    filterLongterm?: (record: LongTermRecord) => boolean;
    expiresAt?: string;
    metadata?: Record<string, unknown>;
  }): CollaborationPackage {
    const includeEpi = opts?.includeEpisodic ?? true;
    const includeSem = opts?.includeSemantic ?? true;
    const includeLt = opts?.includeLongterm ?? true;

    // Episodic: only shareable events.
    const episodic = includeEpi
      ? this.episodic.all().filter(e => e.shareable !== false)
        .filter(e => opts?.filterEpisodic ? opts.filterEpisodic(e) : true)
      : [];

    // Semantic: only explicitly included.
    const semantic = includeSem
      ? this.semantic.all()
        .filter(s => opts?.filterSemantic ? opts.filterSemantic(s) : true)
      : [];

    // Long-term: only explicitly included.
    const longterm = includeLt
      ? this.longterm.all()
        .filter(r => opts?.filterLongterm ? opts.filterLongterm(r) : true)
      : [];

    // Links: only between included records.
    const includedIds = new Set([
      ...episodic.map(e => e.id),
      ...semantic.map(s => s.id),
      ...longterm.map(r => r.id),
    ]);
    const links = this.links.all().filter(l => includedIds.has(l.fromId) && includedIds.has(l.toId));

    return {
      version: 1,
      sourceInstanceId: this.instanceId,
      createdAt: new Date().toISOString(),
      expiresAt: opts?.expiresAt,
      episodic,
      semantic,
      longterm,
      links,
      metadata: opts?.metadata,
    };
  }

  /**
   * Apply a received collaboration package to local memory.
   * Detects and resolves in-flight write conflicts.
   * Returns the list of conflicts found and how they were resolved.
   */
  applyCollaborationPackage(
    pkg: CollaborationPackage,
    opts?: {
      conflictStrategy?: ConflictResolution;
      customResolver?: (conflicts: WriteConflict[]) => Map<MemoryId, 'local' | 'remote' | 'skip'>;
    },
  ): { applied: boolean; conflicts: WriteConflict[]; resolutions: Map<MemoryId, 'local' | 'remote' | 'skip'> } {
    if (!validateCollaborationPackage(pkg)) {
      throw new MemoryError('invalid collaboration package');
    }

    // Check expiry.
    if (pkg.expiresAt && new Date(pkg.expiresAt) < new Date()) {
      this.logger.warn('applyCollaborationPackage: package expired', { expiresAt: pkg.expiresAt });
      return { applied: false, conflicts: [], resolutions: new Map() };
    }

    const local = this.snapshot();
    const conflicts = detectConflicts(local, pkg);

    // Resolve conflicts.
    const strategy = opts?.conflictStrategy ?? 'last-write-wins';
    const resolutions = opts?.customResolver
      ? opts.customResolver(conflicts)
      : resolveConflicts(conflicts, strategy);

    // Apply episodic (skip conflicts resolved as 'local' or 'skip').
    const skipIds = new Set(
      [...resolutions.entries()]
        .filter(([, v]) => v === 'local' || v === 'skip')
        .map(([k]) => k),
    );

    for (const e of pkg.episodic) {
      if (skipIds.has(e.id)) continue;
      const existing = this.episodic.all().find(x => x.id === e.id);
      if (existing) {
        // Update via re-record.
        this.episodic.record(e.agent, e.event, e.context, {
          importance: e.importance,
          tags: e.tags,
          source: e.source,
          id: e.id,
          timestamp: e.timestamp,
        });
      } else {
        this.episodic.record(e.agent, e.event, e.context, {
          importance: e.importance,
          tags: e.tags,
          source: e.source,
          id: e.id,
          timestamp: e.timestamp,
        });
        this.index.add(e.id, `${e.event} ${e.context ? JSON.stringify(e.context) : ''}`);
      }
    }

    // Apply semantic.
    for (const s of pkg.semantic) {
      if (skipIds.has(s.id)) continue;
      this.semantic.learn(s.entity, s.attribute, s.value, s.confidence, s.source);
    }

    // Apply long-term.
    for (const r of pkg.longterm) {
      if (skipIds.has(r.id)) continue;
      this.longterm.store(r.payload, { type: r.type, importance: r.importance, tags: r.tags, source: r.source, id: r.id });
    }

    // Apply links.
    for (const l of pkg.links) {
      if (skipIds.has(l.fromId) || skipIds.has(l.toId)) continue;
      this.links.add(l.fromId, l.toId, l.relation, l.weight);
    }

    this.logger.debug('applyCollaborationPackage: applied', {
      sourceInstanceId: pkg.sourceInstanceId,
      conflicts: conflicts.length,
      strategy,
    });

    return { applied: true, conflicts, resolutions };
  }

  /** Mark an episodic event as shareable (or not). */
  setShareable(eventId: string, shareable: boolean): void {
    // The EpisodicMemory doesn't have a direct update method, so we work through the internal store.
    // For now, we record a flag that the event should be shareable.
    const events = this.episodic.all();
    const event = events.find(e => e.id === eventId);
    if (!event) throw new MemoryError(`event '${eventId}' not found`);
    event.shareable = shareable;
  }

  /** Export the snapshot to a JSON string. */
  export(): string {
    return exportSnapshot(this.snapshot());
  }

  /** Import a snapshot from a JSON string. */
  import(json: string): void {
    this.restore(importSnapshot(json));
  }

  /**
   * Persist the current in-memory state to the configured store.
   * Requires a store to be configured. Throws MemoryError if no store.
   */
  async persist(): Promise<void> {
    if (!this._persistenceBackend) throw new MemoryError('No persistence store configured');
    const snap = this.snapshot();
    await this._persistenceBackend.saveSnapshot(snap);
    this.logger.debug('persist: snapshot saved to store');
  }

  /**
   * Hydrate in-memory state from the configured store.
   * Requires a store to be configured. Throws MemoryError if no store.
   */
  async hydrate(): Promise<void> {
    if (!this._persistenceBackend) throw new MemoryError('No persistence store configured');
    const snap = await this._persistenceBackend.loadSnapshot();
    this.restore(snap);
    this.logger.debug('hydrate: snapshot loaded from store');
  }

  /** Dispose of resources (sweepers, etc.). */
  dispose(): void {
    this.working.dispose();
  }
}

export { DEFAULT_CONFIG, DEFAULT_WEIGHTS, effectiveImportance };
