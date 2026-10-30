/**
 * @manya-os/cortex — pipeline configuration.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import type { RetryPolicy, PlanStrategy, ResourceBudget } from '../types.js';
import type { Logger, LogLevel } from '../logging.js';

export interface CortexConfig {
  defaultStrategy?: PlanStrategy;
  retryPolicy?: RetryPolicy;
  resourceBudget?: Partial<ResourceBudget>;
  logLevel?: LogLevel;
  logger?: Logger;
}

export const DEFAULT_CONFIG: Required<Omit<CortexConfig, 'logger'>> = {
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

export function mergeConfig(user?: CortexConfig): Required<Omit<CortexConfig, 'logger'>> & { logger?: Logger } {
  return {
    ...DEFAULT_CONFIG,
    ...(user ?? {}),
    retryPolicy: { ...DEFAULT_CONFIG.retryPolicy, ...(user?.retryPolicy ?? {}) },
    resourceBudget: { ...DEFAULT_CONFIG.resourceBudget, ...(user?.resourceBudget ?? {}) },
  };
}
