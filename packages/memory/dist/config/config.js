"use strict";
/**
 * @manya-os/memory — pipeline configuration.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_CONFIG = void 0;
exports.mergeConfig = mergeConfig;
exports.DEFAULT_CONFIG = {
    aging: {
        workingTtlMs: 5 * 60 * 1000,
        episodicMaxCount: 10_000,
        episodicPruneThreshold: 0.3,
        longtermCompressAfterDays: 90,
    },
    rankingWeights: { tfidf: 0.4, importance: 0.3, recency: 0.2, access: 0.1 },
    logLevel: 'info',
};
function mergeConfig(user) {
    return {
        ...exports.DEFAULT_CONFIG,
        ...(user ?? {}),
        aging: { ...exports.DEFAULT_CONFIG.aging, ...(user?.aging ?? {}) },
        rankingWeights: { ...exports.DEFAULT_CONFIG.rankingWeights, ...(user?.rankingWeights ?? {}) },
    };
}
//# sourceMappingURL=config.js.map