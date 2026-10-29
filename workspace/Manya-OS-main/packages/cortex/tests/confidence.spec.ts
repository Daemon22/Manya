/**
 * @manya-os/cortex — confidence estimation tests.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import { ConfidenceEstimator, ConfidenceError, DEFAULT_WEIGHTS } from '../src';

describe('ConfidenceEstimator', () => {
  test('estimate combines factors', () => {
    const e = new ConfidenceEstimator();
    const r = e.estimate({
      planConfidence: 0.8,
      toolReliability: 0.9,
      evidenceCount: 5,
      agreementRate: 0.85,
      domainFamiliarity: 0.7,
    });
    expect(r.confidence).toBeGreaterThan(0.7);
    expect(r.factors).toHaveLength(5);
  });

  test('throws on no factors', () => {
    const e = new ConfidenceEstimator();
    expect(() => e.estimate({})).toThrow(ConfidenceError);
  });

  test('handles partial factors', () => {
    const e = new ConfidenceEstimator();
    const r = e.estimate({ planConfidence: 0.8 });
    expect(r.confidence).toBeGreaterThan(0);
    expect(r.factors).toHaveLength(1);
  });

  test('evidenceCount uses diminishing returns', () => {
    const e = new ConfidenceEstimator();
    const r1 = e.estimate({ evidenceCount: 1 });
    const r2 = e.estimate({ evidenceCount: 100 });
    expect(r2.confidence).toBeGreaterThanOrEqual(r1.confidence);
  });

  test('confidence is capped at 1', () => {
    const e = new ConfidenceEstimator();
    const r = e.estimate({
      planConfidence: 1,
      toolReliability: 1,
      evidenceCount: 100,
      agreementRate: 1,
      domainFamiliarity: 1,
    });
    expect(r.confidence).toBeLessThanOrEqual(1);
  });

  test('confidence is at least 0', () => {
    const e = new ConfidenceEstimator();
    const r = e.estimate({ planConfidence: 0 });
    expect(r.confidence).toBeGreaterThanOrEqual(0);
  });

  test('recordOutcome and pastSuccessRate', () => {
    const e = new ConfidenceEstimator();
    e.recordOutcome('fetch data', true);
    e.recordOutcome('fetch data', false);
    e.recordOutcome('fetch data', true);
    expect(e.pastSuccessRate('fetch data')).toBeCloseTo(2 / 3, 1);
  });

  test('unknown task returns 0.5', () => {
    const e = new ConfidenceEstimator();
    expect(e.pastSuccessRate('never-seen')).toBe(0.5);
  });

  test('pastSuccessRate matches substring', () => {
    const e = new ConfidenceEstimator();
    e.recordOutcome('fetch user data', true);
    e.recordOutcome('fetch user data', true);
    expect(e.pastSuccessRate('fetch')).toBe(1);
  });

  test('pastSuccessRate returns 1 for all successes', () => {
    const e = new ConfidenceEstimator();
    e.recordOutcome('task', true);
    e.recordOutcome('task', true);
    expect(e.pastSuccessRate('task')).toBe(1);
  });

  test('pastSuccessRate returns 0 for all failures', () => {
    const e = new ConfidenceEstimator();
    e.recordOutcome('task', false);
    e.recordOutcome('task', false);
    expect(e.pastSuccessRate('task')).toBe(0);
  });

  test('reasoning string is populated', () => {
    const e = new ConfidenceEstimator();
    const r = e.estimate({ planConfidence: 0.5 });
    expect(r.reasoning).toContain('planConfidence');
    expect(r.reasoning).toContain('Weighted sum');
  });
});

describe('DEFAULT_WEIGHTS', () => {
  test('sum to 1', () => {
    const sum = Object.values(DEFAULT_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 1);
  });

  test('has expected keys', () => {
    expect(DEFAULT_WEIGHTS).toHaveProperty('planConfidence');
    expect(DEFAULT_WEIGHTS).toHaveProperty('toolReliability');
    expect(DEFAULT_WEIGHTS).toHaveProperty('evidenceCount');
    expect(DEFAULT_WEIGHTS).toHaveProperty('agreementRate');
    expect(DEFAULT_WEIGHTS).toHaveProperty('domainFamiliarity');
  });
});
