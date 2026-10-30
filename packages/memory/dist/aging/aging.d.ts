/**
 * @manya-os/memory — aging policies.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
import type { AgingPolicy, EpisodicEvent, LongTermRecord } from '../types.js';
export declare const DEFAULT_AGING_POLICY: Required<AgingPolicy>;
export declare function mergeAgingPolicy(p?: AgingPolicy): Required<AgingPolicy>;
/** Compute a memory's age score in [0,1] — 0 = fresh, 1 = ancient.
 * Uses an exponential decay: at age 0 → 0, at age 90 days → ~0.63, at age 365 days → ~0.98. */
export declare function ageScore(createdAt: number, now?: number): number;
/** Effective importance after aging decay. */
export declare function effectiveImportance(record: {
    importance: number;
    createdAt: number;
    accessCount: number;
}, now?: number): number;
/** Should an episodic event be pruned? */
export declare function shouldPruneEpisodic(event: EpisodicEvent, policy: Required<AgingPolicy>, now?: number): boolean;
/** Should a long-term record be compressed? */
export declare function shouldCompressLongTerm(record: LongTermRecord, policy: Required<AgingPolicy>, now?: number): boolean;
//# sourceMappingURL=aging.d.ts.map