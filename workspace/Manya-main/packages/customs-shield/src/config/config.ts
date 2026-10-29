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

export const DEFAULT_CONFIG: Required<Omit<ShieldConfig, 'logger'>> = {
  sanctionsThreshold: 0.75,
  holdThreshold: 50,
  computeDuty: true,
  logLevel: 'info',
};

export function mergeConfig(user?: ShieldConfig): Required<Omit<ShieldConfig, 'logger'>> & { logger?: Logger } {
  return { ...DEFAULT_CONFIG, ...(user ?? {}) };
}
