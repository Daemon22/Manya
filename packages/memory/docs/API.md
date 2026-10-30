# @manya-os/memory — API Reference

> Complete TypeScript API reference for `@manya-os/memory` v1.0.0.

## Contents
- [Types](#types)
- [Errors](#errors)
- [MemorySystem](#memorysystem)
- [Working Memory](#working-memory)
- [Episodic Memory](#episodic-memory)
- [Semantic Memory](#semantic-memory)
- [Procedural Memory](#procedural-memory)
- [Long-Term Memory](#long-term-memory)
- [Index](#index)
- [Links](#links)
- [Permissions](#permissions)
- [Ranking](#ranking)
- [Aging](#aging)
- [Compression](#compression)
- [Sync](#sync)
- [Backup](#backup)
- [Import/Export](#importexport)

---

## Types

### `MemoryId`
```ts
type MemoryId = string;
```

### `WorkingMemoryEntry`
```ts
interface WorkingMemoryEntry {
  id: MemoryId;
  key: string;
  value: unknown;
  createdAt: number;
  ttlMs?: number;
  tags?: string[];
}
```

### `EpisodicEvent`
```ts
interface EpisodicEvent {
  id: MemoryId;
  timestamp: number;
  agent: string;
  event: string;
  context?: Record<string, unknown>;
  tags?: string[];
  importance?: number;  // [0,1]
  source?: string;
}
```

### `SemanticFact`
```ts
interface SemanticFact {
  id: MemoryId;
  entity: string;
  attribute: string;
  value: unknown;
  confidence: number;
  learnedAt: number;
  source?: string;
  tags?: string[];
}
```

### `LongTermRecord`
```ts
interface LongTermRecord {
  id: MemoryId;
  type: 'working' | 'episodic' | 'semantic' | 'procedural' | 'longterm';
  payload: unknown;
  createdAt: number;
  lastAccessedAt: number;
  accessCount: number;
  importance: number;
  tags?: string[];
  source?: string;
}
```

### `MemoryLink`
```ts
interface MemoryLink {
  fromId: MemoryId;
  toId: MemoryId;
  relation: string;
  weight?: number;
}
```

### `RetrievalResult`
```ts
interface RetrievalResult<T = unknown> {
  record: T;
  score: number;
  matchedBy: string[];
}
```

### `MemorySnapshot`
```ts
interface MemorySnapshot {
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
```

---

## Errors

All errors extend `MemoryError` and carry a stable `code` string.

| Class | Code |
| --- | --- |
| `MemoryError` | `MEMORY_ERROR` |
| `WorkingMemoryError` | `WORKING_MEMORY_ERROR` |
| `EpisodicMemoryError` | `EPISODIC_MEMORY_ERROR` |
| `SemanticMemoryError` | `SEMANTIC_MEMORY_ERROR` |
| `ProceduralMemoryError` | `PROCEDURAL_MEMORY_ERROR` |
| `LongTermMemoryError` | `LONGTERM_MEMORY_ERROR` |
| `IndexError` | `INDEX_ERROR` |
| `PermissionError` | `PERMISSION_ERROR` |
| `SyncError` | `SYNC_ERROR` |
| `BackupError` | `BACKUP_ERROR` |

---

## MemorySystem

### `class MemorySystem`
```ts
new MemorySystem(config?: MemoryConfig)
```

Public fields: `working`, `episodic`, `semantic`, `procedural`, `longterm`, `index`, `links`, `permissions`.

Methods:
- `remember(agent, event, context?, opts?)` — record + index an episodic event.
- `recall(query, limit?)` — ranked episodic retrieval.
- `learn(entity, attribute, value, confidence?, source?)` — semantic fact + index.
- `store(payload, opts?)` — long-term record + index.
- `retrieve(id)` — long-term retrieval (updates access stats).
- `search(query, limit?)` — unified ranked search.
- `link(fromId, toId, relation, weight?)` — create a link.
- `related(id, relation?, maxDepth?)` — find related records.
- `age(now?)` — run aging policy.
- `snapshot()` — full state snapshot.
- `restore(snapshot)` — restore from snapshot.
- `backup()` — create verified backup.
- `restoreFromBackup(backup)` — restore from backup.
- `synchronize(remoteSnapshot)` — merge remote, return delta.
- `export()` / `import(json)` — JSON serialization.
- `dispose()` — release resources.

---

## Working Memory

### `class WorkingMemory`
```ts
new WorkingMemory(defaultTtlMs?: number)  // default 5 min
```
Methods: `set`, `get`, `getEntry`, `has`, `delete`, `clear`, `size`, `entries`, `findByTag`, `sweep`, `dispose`.

---

## Episodic Memory

### `class EpisodicMemory`
```ts
new EpisodicMemory(maxCount?: number)  // default 10_000
```
Methods: `record`, `recall`, `recallRange`, `search`, `findByTag`, `findById`, `all`, `count`, `pruneOlderThan`, `pruneLowImportance`.

---

## Semantic Memory

### `class SemanticMemory`
Methods: `learn`, `recall`, `recallEntity`, `findByAttribute`, `forget`, `updateConfidence`, `all`, `count`.

---

## Procedural Memory

### `class ProceduralMemory`
Methods: `learn`, `execute`, `get`, `forget`, `list`, `count`, `findByTag`.

---

## Long-Term Memory

### `class LongTermMemory`
Methods: `store`, `retrieve`, `peek`, `update`, `delete`, `findByTag`, `findByType`, `all`, `count`, `staleSince`, `applyAging`.

---

## Index

### `class InvertedIndex`
Static: `tokenize(text)`.

Methods: `add(recordId, text)`, `remove(recordId)`, `lookup(token)`, `search(query)`, `size`, `entries`.

---

## Links

### `class LinkGraph`
Methods: `add`, `remove`, `outgoingFrom`, `incomingTo`, `byRelation`, `traverse(start, relation, maxDepth?)`, `all`, `size`.

---

## Permissions

### `class PermissionModel`
Methods: `set`, `get`, `canRead`, `canWrite`, `canDelete`, `grant`, `revoke`, `clear`, `all`, `assertRead`, `assertWrite`.

---

## Ranking

### `rankLongTerm(tfidfScores, records, weights?)`
Returns `RetrievalResult<LongTermRecord>[]` sorted by combined score.

### `rankEpisodic(query, events, weights?)`
Returns `RetrievalResult<EpisodicEvent>[]` sorted by combined score.

### `DEFAULT_WEIGHTS`
```ts
{ tfidf: 0.4, importance: 0.3, recency: 0.2, access: 0.1 }
```

---

## Aging

### `ageScore(createdAt, now?)`
Returns `[0,1]` — 0 = fresh, 1 = ancient. Exponential decay over 90 days.

### `effectiveImportance(record, now?)`
Returns `[0,1]` — importance after aging decay + access boost.

### `shouldPruneEpisodic(event, policy, now?)`
Boolean — should the event be pruned per policy.

### `shouldCompressLongTerm(record, policy, now?)`
Boolean — should the record be compressed per policy.

---

## Compression

### `compress(payload)`
Returns `CompressedPayload` with `algorithm: 'gzip+json'`, base64 data, original/compressed lengths.

### `decompress<T>(c)`
Reverse of `compress`.

### `ratio(c)`
Returns `compressedLength / originalLength` in `[0, ∞)`.

---

## Sync

### `computeDelta(local, remote)`
Returns `SyncDelta` with `addedEpisodic`, `updatedEpisodic`, `addedSemantic`, `addedLongTerm`, `updatedLongTerm`, `addedLinks`, `conflicts`.

### `applyDelta(local, remote, delta)`
Merges remote into local (mutates local). Returns the merged snapshot.

---

## Backup

### `createBackup(snapshot)`
Returns `Backup` with `schemaVersion`, `takenAt`, `snapshot`, `hash` (SHA-256).

### `verifyBackup(backup)`
Boolean — recomputes hash and compares.

### `restoreBackup(backup)`
Returns the snapshot. Throws if verification fails.

### `serializeBackup(backup)` / `parseBackup(json)`
JSON round-trip.

---

## Import/Export

### `exportSnapshot(snapshot)` / `importSnapshot(json)`
Full snapshot JSON round-trip.

### `exportEpisodic(snapshot)` / `exportSemantic(snapshot)`
Partial exports.

### `mergeImport(base, json)`
Merge a partial import into a base snapshot. Mutates and returns base.
