/**
 * @manya-os/memory — unified memory system.
 *
 * Public API surface for @manya-os/memory. Everything exported here is part
 * of the stable, semver-bound public API.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Conceived, directed, and owned by Uviwe Menyiwe (Azura Daemon), founder
 * of the Manya Hael Foundation.
 *
 * Licensed under the Apache License, Version 2.0.
 */

// ----- types & errors -----
export * from './types.js';
export * from './errors.js';

// ----- logging -----
export {
  Logger, LogLevel, ConsoleLogger, SilentLogger,
  scrubMetadata, shouldScrubField, SCRUBBED_FIELD_NAMES,
} from './logging.js';

// ----- config -----
export { DEFAULT_CONFIG, mergeConfig } from './config/config.js';
export type { MemoryConfig } from './config/config.js';

// ----- subsystems -----
export { WorkingMemory } from './working/working.js';
export { EpisodicMemory } from './episodic/episodic.js';
export { SemanticMemory } from './semantic/semantic.js';
export { ProceduralMemory } from './procedural/procedural.js';
export { LongTermMemory } from './longterm/longterm.js';
export { randomId } from './longterm/keys.js';

// ----- index & links -----
export { InvertedIndex } from './index/index.js';
export { LinkGraph } from './link/link.js';

// ----- permissions -----
export { PermissionModel } from './permissions/permissions.js';

// ----- persistence store -----
export { InMemoryMemoryStore } from './store/store.js';
export type { MemoryStore } from './store/store.js';

// ----- ranking -----
export { rankLongTerm, rankEpisodic, DEFAULT_WEIGHTS } from './rank/rank.js';
export type { RankingWeights } from './rank/rank.js';

// ----- aging -----
export {
  DEFAULT_AGING_POLICY, mergeAgingPolicy, ageScore,
  effectiveImportance, shouldPruneEpisodic, shouldCompressLongTerm,
} from './aging/aging.js';

// ----- compression -----
export { compress, decompress, ratio } from './compress/compress.js';
export type { CompressedPayload } from './compress/compress.js';

// ----- sync -----
export { computeDelta, applyDelta, detectConflicts, resolveConflicts, validateCollaborationPackage } from './sync/sync.js';
export type { SyncDelta } from './sync/sync.js';

// ----- backup -----
export { createBackup, verifyBackup, restoreBackup, serializeBackup, parseBackup } from './backup/backup.js';
export type { Backup } from './backup/backup.js';

// ----- import/export -----
export { exportSnapshot, importSnapshot, exportEpisodic, exportSemantic, mergeImport } from './io/io.js';

// ----- main facade -----
export { MemorySystem } from './memory.js';

// ----- tool-grade facade (composition surface for economy/perception/telepathy/reflection) -----
export {
  memory,
  createMemoryStore,
  remember,
  recallEpisodes,
  verifyEpisodicIntegrity,
  rememberWorking,
  recallWorking,
  forgetWorking,
  learnFact,
  recallFact,
  learnSkill,
  executeSkill,
  archive,
  retrieveArchive,
  shareOn,
  subscribeOn,
} from './facade.js';
export type { FacadeMemoryStore, EpisodicRecord } from './facade.js';
