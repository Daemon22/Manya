/**
 * @manya-os/ledger — file-backed ledger store (append-only).
 *
 * Persists events to a single append-only file as JSON-per-line (JSONL).
 * Provides:
 *   - atomic appends via `fs.appendFileSync` (POSIX append is atomic for
 *     writes smaller than `PIPE_BUF`, typically 4 KiB);
 *   - an in-memory index for O(1) `getById` lookups;
 *   - periodic compaction when the file exceeds `compactThresholdBytes`
 *     (rewrites the file with the current in-memory state).
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Conceived, directed, and owned by Uviwe Menyiwe (Azura Daemon), founder
 * of the Manya Hael Foundation.
 *
 * Licensed under the Apache License, Version 2.0.
 */
import type { LedgerEvent } from '../types.js';
import type { LedgerStore } from './store.js';
/** Default compaction threshold (1 MiB). */
export declare const DEFAULT_COMPACT_THRESHOLD_BYTES: number;
/** Options for {@link FileLedgerStore}. */
export interface FileLedgerStoreOptions {
    /**
     * Compaction threshold in bytes. When the data file exceeds this size,
     * `append()` triggers a compaction (rewrite from in-memory state).
     * Defaults to {@link DEFAULT_COMPACT_THRESHOLD_BYTES}.
     */
    compactThresholdBytes?: number;
    /**
     * Whether to load the existing file on construction. Defaults to `true`.
     * Set to `false` for a fresh start (the existing file is OVERWRITTEN on
     * the first append).
     */
    load?: boolean;
}
/**
 * File-backed {@link LedgerStore}.
 *
 * The data file path is `<dir>/<name>.jsonl`. A sidecar index file
 * `<dir>/<name>.idx.json` maps event ids to line numbers for fast `getById`
 * (the index is rebuilt lazily if missing or stale).
 */
export declare class FileLedgerStore implements LedgerStore {
    private readonly events;
    private readonly byId;
    private readonly dataPath;
    private readonly indexPath;
    private readonly compactThreshold;
    /**
     * Open (or create) a file-backed store.
     *
     * @param dir - Directory holding the data + index files.
     * @param name - Base name (without extension).
     * @param opts - Optional parameters.
     */
    constructor(dir: string, name?: string, opts?: FileLedgerStoreOptions);
    /** @inheritdoc */
    append(event: LedgerEvent): void;
    /** @inheritdoc */
    get(seq: number): LedgerEvent | undefined;
    /** @inheritdoc */
    getById(id: string): LedgerEvent | undefined;
    /** @inheritdoc */
    length(): number;
    /** @inheritdoc */
    all(): LedgerEvent[];
    /** @inheritdoc */
    snapshot(): LedgerEvent[];
    /** @inheritdoc */
    restore(events: LedgerEvent[]): void;
    /** Path to the JSONL data file (exposed for tests + tooling). */
    getDataPath(): string;
    /** Path to the sidecar index file (exposed for tests + tooling). */
    getIndexPath(): string;
    /**
     * Rewrite the data file from the in-memory state. Also rewrites the
     * sidecar index. Use after bulk in-memory mutations.
     */
    compact(): void;
    /** Load events from the data file (called by the constructor). */
    private load;
}
//# sourceMappingURL=file.d.ts.map