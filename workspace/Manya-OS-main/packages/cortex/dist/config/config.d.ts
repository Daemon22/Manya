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
export declare const DEFAULT_CONFIG: Required<Omit<CortexConfig, 'logger'>>;
export declare function mergeConfig(user?: CortexConfig): Required<Omit<CortexConfig, 'logger'>> & {
    logger?: Logger;
};
//# sourceMappingURL=config.d.ts.map