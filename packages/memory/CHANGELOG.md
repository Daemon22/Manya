# Changelog

All notable changes to `@manya-os/memory` are documented here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Adheres to [SemVer](https://semver.org/).

## [1.1.0] — 2026-08-17
### Added
- Expanded test suite from 80 tests (1 file) to 235 tests (19 files).
- Per-module test coverage: errors, logging, config, working, episodic, semantic, procedural, longterm, longterm-keys, index, link, permissions, rank, aging, compress, sync, backup, io, memory-system.

## [1.0.0] — 2024-01-15
### Added
- Initial release.
- Five memory subsystems: WorkingMemory, EpisodicMemory, SemanticMemory, ProceduralMemory, LongTermMemory.
- InvertedIndex with TF-IDF scoring.
- LinkGraph with BFS traversal.
- PermissionModel with per-record read/write/delete lists.
- Ranking: rankLongTerm, rankEpisodic with configurable weights.
- Aging: ageScore, effectiveImportance, shouldPruneEpisodic, shouldCompressLongTerm.
- Compression: gzip+json with ratio metric.
- Sync: computeDelta, applyDelta with conflict detection.
- Backup: createBackup, verifyBackup, restoreBackup, serializeBackup, parseBackup.
- Import/Export: full snapshot, episodic-only, semantic-only, mergeImport.
- MemorySystem facade with snapshot/restore/synchronize/backup/import/export.
- 80 unit tests covering all subsystems.
