/**
 * @manya-os/memory — pipeline configuration.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import type { AgingPolicy } from '../types.js';
import type { Logger, LogLevel } from '../logging.js';
import type { RankingWeights } from '../rank/rank.js';
import type { MemoryStore } from '../store/store.js';

export interface MemoryConfig {
  aging?: AgingPolicy;
  rankingWeights?: RankingWeights;
  /** Optional persistence backend. When absent, everything is in-memory. */
  store?: MemoryStore;
  logLevel?: LogLevel;
  logger?: Logger;
}

export const DEFAULT_CONFIG: Required<Omit<MemoryConfig, 'logger' | 'store'>> = {
  aging: {
    workingTtlMs: 5 * 60 * 1000,
    episodicMaxCount: 10_000,
    episodicPruneThreshold: 0.3,
    longtermCompressAfterDays: 90,
  },
  rankingWeights: { tfidf: 0.4, importance: 0.3, recency: 0.2, access: 0.1 },
  logLevel: 'info',
};

export function mergeConfig(user?: MemoryConfig): Required<Omit<MemoryConfig, 'logger' | 'store'>> & { store?: MemoryStore; logger?: Logger } {
  return {
    ...DEFAULT_CONFIG,
    ...(user ?? {}),
    aging: { ...DEFAULT_CONFIG.aging, ...(user?.aging ?? {}) },
    rankingWeights: { ...DEFAULT_CONFIG.rankingWeights, ...(user?.rankingWeights ?? {}) },
  };
}
