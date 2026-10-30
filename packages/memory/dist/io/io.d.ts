/**
 * @manya-os/memory — import/export.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
import type { MemorySnapshot } from '../types.js';
/** Export a snapshot to a JSON string. */
export declare function exportSnapshot(snapshot: MemorySnapshot): string;
/** Import a snapshot from a JSON string. */
export declare function importSnapshot(json: string): MemorySnapshot;
/** Export only episodic events (e.g. for sharing experience logs). */
export declare function exportEpisodic(snapshot: MemorySnapshot): string;
/** Export only semantic facts (e.g. for knowledge transfer). */
export declare function exportSemantic(snapshot: MemorySnapshot): string;
/** Merge an imported partial snapshot (episodic or semantic) into a base snapshot. */
export declare function mergeImport(base: MemorySnapshot, json: string): MemorySnapshot;
//# sourceMappingURL=io.d.ts.map