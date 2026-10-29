# @manya-os/memory

> Unified memory system — working, episodic, semantic, procedural, long-term storage, indexing, linking, aging, compression, retrieval ranking, access permissions, synchronization, backup, and import/export for the MANYA Intelligence OS.

`@manya-os/memory` is the cognitive substrate of the **MANYA Intelligence OS** — a sovereign, modular, local-first intelligence operating system conceived, directed, and owned by **Uviwe Menyiwe (Azura Daemon)**, founder of the **Manya Hael Foundation**.

The package provides five memory subsystems (working, episodic, semantic, procedural, long-term), an inverted index for fast retrieval, a knowledge-graph link layer, TF-IDF + importance + recency ranking, age-decayed importance scores, gzip+json payload compression, role-based access permissions, snapshot synchronization with conflict detection, SHA-256-verified backups, and JSON import/export.

---

## Vision

The Manya Hael Foundation stewards the MANYA Intelligence OS as a long-horizon, mission-driven project. `@manya-os/memory` is the keystone of cognition: **your experiences, your knowledge, your skills — yours alone.**

- **Sovereign.** All memory is local. No cloud calls, no telemetry.
- **Unified.** Five memory types behind one facade, with cross-type indexing and linking.
- **Ranked.** TF-IDF + importance + recency + access frequency combine into a single retrieval score.
- **Aging.** Importance decays with age; access frequency boosts retention. Low-importance events are pruned.
- **Reproducible.** Snapshots, backups, and sync deltas are deterministic and hash-verified.

---

## Features

| Area | What you get |
| --- | --- |
| **Working memory** | Short-TTL scratchpad with auto-sweep (default 5 min). Tagged entries. |
| **Episodic memory** | Timestamped events with importance, tags, source. Time-range recall, substring search, pruning. |
| **Semantic memory** | Entity-attribute-value facts with confidence. Reverse index by attribute. |
| **Procedural memory** | Named skills with function handlers. Tagged. |
| **Long-term memory** | Durable records with access stats, importance, tags. Aging decay for low-access records. |
| **Indexing** | Inverted index with TF-IDF scoring. Fast token-based retrieval. |
| **Linking** | Knowledge graph with relation types. BFS traversal to N hops. |
| **Ranking** | Weighted combination of TF-IDF, importance, recency, access count. Configurable weights. |
| **Aging** | Exponential decay of importance with age. Auto-prune low-importance episodic events. |
| **Compression** | gzip+json compression for long-term payloads. |
| **Permissions** | Per-record read/write/delete lists. Wildcard support. Auto-cleanup. |
| **Sync** | Snapshot delta computation with conflict detection. Apply delta merges. |
| **Backup** | SHA-256-verified backups. Serialize/parse round-trip. |
| **Import/Export** | Full snapshot or partial (episodic-only, semantic-only) JSON. Merge into base. |
| **Logging** | `Logger` interface, `ConsoleLogger` with secret-scrubbing, `SilentLogger`. |

---

## Install

```bash
npm install @manya-os/memory
```

Requires Node.js 18+.

---

## Quick start

### 1. Create a memory system and remember events

```ts
import { MemorySystem } from '@manya-os/memory';

const memory = new MemorySystem({ logLevel: 'silent' });

memory.remember('agent1', 'User logged in', { ip: '10.0.0.1' }, { importance: 0.7 });
memory.remember('agent1', 'User changed password', undefined, { importance: 0.9 });

// Recall by query
const results = memory.recall('user login', 5);
console.log(results[0].record.event);
```

### 2. Learn semantic facts

```ts
memory.learn('alice', 'role', 'admin', 0.95, 'directory');
memory.learn('alice', 'department', 'engineering');

console.log(memory.semantic.recall('alice', 'role')?.value); // 'admin'
console.log(memory.semantic.recallEntity('alice').length);   // 2
```

### 3. Store long-term records and search

```ts
const id = memory.store(
  { title: 'Design Doc', content: 'Cortex planning notes...' },
  { importance: 0.8, tags: ['design', 'cortex'] },
);

const hits = memory.search('cortex design');
console.log(hits[0].record.payload); // the design doc
```

### 4. Link records and traverse

```ts
const id1 = memory.store('cause event');
const id2 = memory.store('effect event');
memory.link(id1, id2, 'causes');

const related = memory.related(id1);
console.log(related); // [id2]
```

### 5. Backup and restore

```ts
const backup = memory.backup();
// ... transmit or persist ...
const newMemory = new MemorySystem({ logLevel: 'silent' });
newMemory.restoreFromBackup(backup);
console.log(newMemory.episodic.count()); // same as original
```

### 6. Synchronize across instances

```ts
const remote = new MemorySystem({ logLevel: 'silent' });
remote.remember('remote-agent', 'remote event');

const delta = memory.synchronize(remote.snapshot());
console.log(delta.addedEpisodic); // ['ep_...']
```

---

## Configuration

```ts
export interface MemoryConfig {
  aging?: {
    workingTtlMs?: number;                  // default 5 min
    episodicMaxCount?: number;              // default 10_000
    episodicPruneThreshold?: number;        // default 0.3
    longtermCompressAfterDays?: number;     // default 90
  };
  rankingWeights?: {
    tfidf: number;        // default 0.4
    importance: number;   // default 0.3
    recency: number;      // default 0.2
    access: number;       // default 0.1
  };
  logLevel?: LogLevel;    // default 'info'
  logger?: Logger;
}
```

---

## Security notes

- **Local-only.** No network calls. All memory lives in-process.
- **No secrets in logs.** `secret`, `token`, `apiKey`, `password`, `privateKey` are scrubbed.
- **Per-record permissions.** Use `permissions.set()` to restrict read/write/delete access.
- **Backup integrity.** SHA-256 hash verification prevents tampering.

For threat models, see [SECURITY.md](./SECURITY.md) and the root [SECURITY.md](../../SECURITY.md).

---

## Documentation

- [docs/API.md](./docs/API.md) — full TypeScript API reference.
- [CHANGELOG.md](./CHANGELOG.md) — release history.
- [CONTRIBUTING.md](./CONTRIBUTING.md) — package-specific contributor notes.
- [SECURITY.md](./SECURITY.md) — package-specific security surface.
- [LICENSE](./LICENSE) — Apache-2.0.

---

## License

Apache-2.0. Copyright 2024 Manya Hael Foundation. All rights reserved.

Conceived, directed, and owned by **Uviwe Menyiwe (Azura Daemon)**, founder of the Manya Hael Foundation.
