/**
 * @manya/customs-shield — pipeline configuration.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
import type { Logger, LogLevel } from '../logging.js';
export interface ShieldConfig {
    /** Sanctions matching threshold in [0,1]. */
    sanctionsThreshold?: number;
    /** Hold-for-review score threshold. */
    holdThreshold?: number;
    /** Whether to compute duty recalculation. */
    computeDuty?: boolean;
    /** Logger level. */
    logLevel?: LogLevel;
    /** Logger instance (overrides logLevel). */
    logger?: Logger;
}
export declare const DEFAULT_CONFIG: Required<Omit<ShieldConfig, 'logger'>>;
export declare function mergeConfig(user?: ShieldConfig): Required<Omit<ShieldConfig, 'logger'>> & {
    logger?: Logger;
};
//# sourceMappingURL=config.d.ts.map