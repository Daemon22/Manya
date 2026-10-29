/**
 * @manya-os/memory — shared type definitions.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

/** Stable identifier for any memory record. */
export type MemoryId = string;

/** A memory record type. */
export type MemoryType = 'working' | 'episodic' | 'semantic' | 'procedural' | 'longterm';

/** A single working-memory slot (short TTL). */
export interface WorkingMemoryEntry {
  id: MemoryId;
  key: string;
  value: unknown;
  createdAt: number;
  ttlMs?: number;
  tags?: string[];
}

/** A single episodic event (timestamped experience). */
export interface EpisodicEvent {
  id: MemoryId;
  timestamp: number;
  agent: string;
  event: string;
  context?: Record<string, unknown>;
  tags?: string[];
  importance?: number;  // [0,1] — affects aging & ranking
  source?: string;
  /** Whether this event may be included in collaboration packages. */
  shareable?: boolean;
}

/** A semantic fact (entity-attribute-value style). */
export interface SemanticFact {
  id: MemoryId;
  entity: string;
  attribute: string;
  value: unknown;
  confidence: number;
  learnedAt: number;
  source?: string;
  tags?: string[];
}

/** A procedural skill (named function + metadata). */
export interface ProceduralSkill {
  id: MemoryId;
  name: string;
  description?: string;
  arguments?: string[];
  /** The function. May be undefined for skills that cannot be serialized. */
  handler?: (...args: unknown[]) => unknown;
  learnedAt: number;
  tags?: string[];
}

/** A long-term memory record (anything durable). */
export interface LongTermRecord {
  id: MemoryId;
  type: MemoryType;
  payload: unknown;
  createdAt: number;
  lastAccessedAt: number;
  accessCount: number;
  importance: number;
  tags?: string[];
  source?: string;
}

/** A link between two memory records. */
export interface MemoryLink {
  fromId: MemoryId;
  toId: MemoryId;
  /** Relationship type, e.g. 'causes', 'relates_to', 'derived_from'. */
  relation: string;
  weight?: number;
}

/** An index entry mapping a token to record IDs. */
export interface IndexEntry {
  token: string;
  recordIds: MemoryId[];
  /** Term frequency in each record. */
  frequencies: Record<MemoryId, number>;
}

/** A retrieval result with relevance score. */
export interface RetrievalResult<T = unknown> {
  record: T;
  score: number;
  /** Why this record matched (which term / which link). */
  matchedBy: string[];
}

/** Access permission for a memory record. */
export interface MemoryPermission {
  recordId: MemoryId;
  /** Subjects allowed to read. '*' = anyone. */
  readers: string[];
  /** Subjects allowed to write. */
  writers: string[];
  /** Subjects allowed to delete. */
  deleters: string[];
}

/** A memory snapshot for backup/sync. */
export interface MemorySnapshot {
  schemaVersion: 1;
  takenAt: string;
  working: WorkingMemoryEntry[];
  episodic: EpisodicEvent[];
  semantic: SemanticFact[];
  procedural: Array<Omit<ProceduralSkill, 'handler'> & { handlerSerialized?: boolean }>;
  longterm: LongTermRecord[];
  links: MemoryLink[];
  permissions: MemoryPermission[];
}

/** Aging policy. */
export interface AgingPolicy {
  /** Working-memory TTL in ms (default 5 min). */
  workingTtlMs?: number;
  /** Episodic events with importance < threshold get pruned after maxCount. */
  episodicMaxCount?: number;
  /** Episodic importance threshold for pruning. */
  episodicPruneThreshold?: number;
  /** Days after which low-importance long-term records get compressed. */
  longtermCompressAfterDays?: number;
}

// ----- collaboration types -----

/**
 * A narrow, curated subset of memory that may be shared between instances.
 * This is NOT a full snapshot — only data explicitly marked as shareable
 * is included. The Hub never receives full memory snapshots.
 */
export interface CollaborationPackage {
  /** Package format version. */
  version: 1;
  /** Instance id of the source. */
  sourceInstanceId: string;
  /** ISO-8601 timestamp when the package was created. */
  createdAt: string;
  /** ISO-8601 timestamp when the package expires (optional). */
  expiresAt?: string;
  /** Only episodic events marked shareable. */
  episodic: EpisodicEvent[];
  /** Only semantic facts explicitly included. */
  semantic: SemanticFact[];
  /** Only long-term records explicitly included. */
  longterm: LongTermRecord[];
  /** Links between included records only. */
  links: MemoryLink[];
  /** Arbitrary metadata about the collaboration context. */
  metadata?: Record<string, unknown>;
}

/** Conflict resolution strategy for sync. */
export type ConflictResolution = 'last-write-wins' | 'local-wins' | 'remote-wins' | 'manual';

/** A detected in-flight write conflict. */
export interface WriteConflict {
  /** Record id. */
  id: MemoryId;
  /** Memory type. */
  memoryType: MemoryType;
  /** Local version timestamp. */
  localTimestamp: number;
  /** Remote version timestamp. */
  remoteTimestamp: number;
  /** Which side wins. */
  resolution: 'local' | 'remote' | 'manual';
}
