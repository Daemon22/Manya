"use strict";
/**
 * @manya-os/cortex — pipeline configuration.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_CONFIG = void 0;
exports.mergeConfig = mergeConfig;
exports.DEFAULT_CONFIG = {
    defaultStrategy: 'adaptive',
    retryPolicy: {
        maxAttempts: 3,
        backoff: 'exponential',
        baseDelayMs: 100,
        maxDelayMs: 5_000,
        retryableErrors: ['timeout', 'transient', 'busy', 'unavailable'],
    },
    resourceBudget: {
        maxCost: 1000,
        maxParallel: 4,
        maxDurationMs: 60_000,
        spentCost: 0,
        activeWorkers: 0,
        elapsedMs: 0,
    },
    logLevel: 'info',
};
function mergeConfig(user) {
    return {
        ...exports.DEFAULT_CONFIG,
        ...(user ?? {}),
        retryPolicy: { ...exports.DEFAULT_CONFIG.retryPolicy, ...(user?.retryPolicy ?? {}) },
        resourceBudget: { ...exports.DEFAULT_CONFIG.resourceBudget, ...(user?.resourceBudget ?? {}) },
    };
}
//# sourceMappingURL=config.js.map