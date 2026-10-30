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
export declare const DEFAULT_CONFIG: Required<Omit<MemoryConfig, 'logger' | 'store'>>;
export declare function mergeConfig(user?: MemoryConfig): Required<Omit<MemoryConfig, 'logger' | 'store'>> & {
    store?: MemoryStore;
    logger?: Logger;
};
//# sourceMappingURL=config.d.ts.map