/**
 * @manya-os/cortex — pipeline configuration tests.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import { DEFAULT_CONFIG, mergeConfig } from '../src';

describe('DEFAULT_CONFIG', () => {
  test('has expected default strategy', () => {
    expect(DEFAULT_CONFIG.defaultStrategy).toBe('adaptive');
  });

  test('has retry policy with maxAttempts 3', () => {
    expect(DEFAULT_CONFIG.retryPolicy.maxAttempts).toBe(3);
  });

  test('has exponential backoff', () => {
    expect(DEFAULT_CONFIG.retryPolicy.backoff).toBe('exponential');
  });

  test('has retryable errors list', () => {
    expect(DEFAULT_CONFIG.retryPolicy.retryableErrors).toContain('timeout');
    expect(DEFAULT_CONFIG.retryPolicy.retryableErrors).toContain('transient');
  });

  test('has resource budget', () => {
    expect(DEFAULT_CONFIG.resourceBudget.maxCost).toBe(1000);
    expect(DEFAULT_CONFIG.resourceBudget.maxParallel).toBe(4);
    expect(DEFAULT_CONFIG.resourceBudget.maxDurationMs).toBe(60_000);
  });

  test('has logLevel info', () => {
    expect(DEFAULT_CONFIG.logLevel).toBe('info');
  });
});

describe('mergeConfig', () => {
  test('returns defaults when no user config', () => {
    const config = mergeConfig();
    expect(config.defaultStrategy).toBe('adaptive');
    expect(config.retryPolicy.maxAttempts).toBe(3);
  });

  test('overrides top-level fields', () => {
    const config = mergeConfig({ defaultStrategy: 'sequential' });
    expect(config.defaultStrategy).toBe('sequential');
  });

  test('shallow-merges retryPolicy', () => {
    const config = mergeConfig({ retryPolicy: { maxAttempts: 5 } as any });
    expect(config.retryPolicy.maxAttempts).toBe(5);
    expect(config.retryPolicy.backoff).toBe('exponential');
  });

  test('shallow-merges resourceBudget', () => {
    const config = mergeConfig({ resourceBudget: { maxCost: 500 } });
    expect(config.resourceBudget.maxCost).toBe(500);
    expect(config.resourceBudget.maxParallel).toBe(4);
  });

  test('preserves logger when provided', () => {
    const logger = { debug() {}, info() {}, warn() {}, error() {} } as any;
    const config = mergeConfig({ logger });
    expect(config.logger).toBe(logger);
  });

  test('returns empty object keys when empty config provided', () => {
    const config = mergeConfig({});
    expect(config.defaultStrategy).toBe('adaptive');
  });
});
