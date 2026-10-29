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
export * from './types.js';
export * from './errors.js';
export { Logger, LogLevel, ConsoleLogger, SilentLogger, scrubMetadata, shouldScrubField, SCRUBBED_FIELD_NAMES, } from './logging.js';
export { DEFAULT_CONFIG, mergeConfig } from './config/config.js';
export type { MemoryConfig } from './config/config.js';
export { WorkingMemory } from './working/working.js';
export { EpisodicMemory } from './episodic/episodic.js';
export { SemanticMemory } from './semantic/semantic.js';
export { ProceduralMemory } from './procedural/procedural.js';
export { LongTermMemory } from './longterm/longterm.js';
export { randomId } from './longterm/keys.js';
export { InvertedIndex } from './index/index.js';
export { LinkGraph } from './link/link.js';
export { PermissionModel } from './permissions/permissions.js';
export { InMemoryMemoryStore } from './store/store.js';
export type { MemoryStore } from './store/store.js';
export { rankLongTerm, rankEpisodic, DEFAULT_WEIGHTS } from './rank/rank.js';
export type { RankingWeights } from './rank/rank.js';
export { DEFAULT_AGING_POLICY, mergeAgingPolicy, ageScore, effectiveImportance, shouldPruneEpisodic, shouldCompressLongTerm, } from './aging/aging.js';
export { compress, decompress, ratio } from './compress/compress.js';
export type { CompressedPayload } from './compress/compress.js';
export { computeDelta, applyDelta, detectConflicts, resolveConflicts, validateCollaborationPackage } from './sync/sync.js';
export type { SyncDelta } from './sync/sync.js';
export { createBackup, verifyBackup, restoreBackup, serializeBackup, parseBackup } from './backup/backup.js';
export type { Backup } from './backup/backup.js';
export { exportSnapshot, importSnapshot, exportEpisodic, exportSemantic, mergeImport } from './io/io.js';
export { MemorySystem } from './memory.js';
export { memory, createMemoryStore, remember, recallEpisodes, verifyEpisodicIntegrity, rememberWorking, recallWorking, forgetWorking, learnFact, recallFact, learnSkill, executeSkill, archive, retrieveArchive, shareOn, subscribeOn, } from './facade.js';
export type { FacadeMemoryStore, EpisodicRecord } from './facade.js';
//# sourceMappingURL=index.d.ts.map