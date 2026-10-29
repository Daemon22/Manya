/**
 * @manya-os/anonymize — pipeline configuration.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import type { RedactionStrategy } from '../types.js';
import type { Logger, LogLevel } from '../logging.js';

export interface AnonymizerConfig {
  /** Minimum confidence for a finding to be considered. */
  minConfidence?: number;
  /** Default redaction strategy. */
  defaultStrategy?: RedactionStrategy;
  /** Per-category overrides. */
  strategyByCategory?: Partial<Record<string, RedactionStrategy>>;
  /** Detectors to disable. */
  disabledDetectors?: string[];
  /** Whether to validate output. */
  validateOutput?: boolean;
  /** Max residual risk threshold. */
  maxResidualRisk?: number;
  /** Logger level. */
  logLevel?: LogLevel;
  /** Logger instance (overrides logLevel). */
  logger?: Logger;
}

export const DEFAULT_CONFIG: Required<Omit<AnonymizerConfig, 'logger'>> = {
  minConfidence: 0.5,
  defaultStrategy: 'mask',
  strategyByCategory: {
    credit_card: 'redact',
    national_id: 'redact',
    password: 'redact',
    api_key: 'redact',
    jwt_token: 'redact',
    bank_account: 'redact',
  },
  disabledDetectors: [],
  validateOutput: true,
  maxResidualRisk: 0.05,
  logLevel: 'info',
};

export function mergeConfig(user?: AnonymizerConfig): Required<Omit<AnonymizerConfig, 'logger'>> & { logger?: Logger } {
  return {
    ...DEFAULT_CONFIG,
    ...(user ?? {}),
    strategyByCategory: {
      ...DEFAULT_CONFIG.strategyByCategory,
      ...(user?.strategyByCategory ?? {}),
    },
  };
}
