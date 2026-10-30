/**
 * @manya-os/cortex — resource management tests.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import { ResourceManager, ResourceError } from '../src';
import type { Task } from '../src';

describe('ResourceManager', () => {
  const makeTask = (id: string, overrides?: Partial<Task>): Task => ({
    id, goalId: 'g', description: 'x', status: 'pending', createdAt: 0, ...overrides,
  });

  test('canAdmit within budget', () => {
    const r = new ResourceManager({ maxCost: 100 });
    const t = makeTask('t1', { estimatedCost: 50 });
    expect(r.canAdmit(t).admit).toBe(true);
  });

  test('canAdmit exceeds cost', () => {
    const r = new ResourceManager({ maxCost: 100, spentCost: 80 });
    const t = makeTask('t1', { estimatedCost: 50 });
    expect(r.canAdmit(t).admit).toBe(false);
  });

  test('canAdmit exceeds parallel', () => {
    const r = new ResourceManager({ maxParallel: 2, activeWorkers: 2 });
    const t = makeTask('t1');
    expect(r.canAdmit(t).admit).toBe(false);
  });

  test('canAdmit exceeds duration', () => {
    const r = new ResourceManager({ maxDurationMs: 100, elapsedMs: 90 });
    const t = makeTask('t1', { estimatedDurationMs: 20 });
    expect(r.canAdmit(t).admit).toBe(false);
  });

  test('canAdmit returns reason string', () => {
    const r = new ResourceManager({ maxCost: 10 });
    const t = makeTask('t1', { estimatedCost: 100 });
    const result = r.canAdmit(t);
    expect(result.reason).toContain('cost');
  });

  test('reserve increments counters', () => {
    const r = new ResourceManager({ maxCost: 100, maxParallel: 4 });
    const t = makeTask('t1', { estimatedCost: 30 });
    r.reserve(t);
    expect(r.snapshot().spentCost).toBe(30);
    expect(r.snapshot().activeWorkers).toBe(1);
  });

  test('release decrements active workers', () => {
    const r = new ResourceManager({ maxParallel: 4 });
    const t = makeTask('t1');
    r.reserve(t);
    r.release(t, 1000);
    expect(r.snapshot().activeWorkers).toBe(0);
    expect(r.snapshot().elapsedMs).toBe(1000);
  });

  test('release uses estimatedDurationMs when actual not provided', () => {
    const r = new ResourceManager({ maxParallel: 4 });
    const t = makeTask('t1', { estimatedDurationMs: 500 });
    r.reserve(t);
    r.release(t);
    expect(r.snapshot().elapsedMs).toBe(500);
  });

  test('reserve throws on insufficient budget', () => {
    const r = new ResourceManager({ maxCost: 10 });
    const t = makeTask('t1', { estimatedCost: 100 });
    expect(() => r.reserve(t)).toThrow(ResourceError);
  });

  test('utilization ratios', () => {
    const r = new ResourceManager({ maxCost: 100, maxParallel: 4, maxDurationMs: 1000, spentCost: 50, activeWorkers: 2, elapsedMs: 200 });
    const u = r.utilization();
    expect(u.cost).toBe(0.5);
    expect(u.parallel).toBe(0.5);
    expect(u.duration).toBe(0.2);
  });

  test('reset clears counters', () => {
    const r = new ResourceManager({ maxCost: 100, maxParallel: 4 });
    const t = makeTask('t1', { estimatedCost: 30 });
    r.reserve(t);
    r.reset();
    expect(r.snapshot().spentCost).toBe(0);
    expect(r.snapshot().activeWorkers).toBe(0);
    expect(r.snapshot().elapsedMs).toBe(0);
  });

  test('setCaps updates budget caps', () => {
    const r = new ResourceManager({ maxCost: 100 });
    r.setCaps({ maxCost: 500, maxParallel: 8 });
    const s = r.snapshot();
    expect(s.maxCost).toBe(500);
    expect(s.maxParallel).toBe(8);
  });

  test('snapshot returns a copy', () => {
    const r = new ResourceManager({ maxCost: 100 });
    const s1 = r.snapshot();
    const s2 = r.snapshot();
    expect(s1).not.toBe(s2);
    expect(s1).toEqual(s2);
  });

  test('defaults when no initial provided', () => {
    const r = new ResourceManager();
    const s = r.snapshot();
    expect(s.maxCost).toBe(1000);
    expect(s.maxParallel).toBe(4);
    expect(s.maxDurationMs).toBe(60_000);
    expect(s.spentCost).toBe(0);
    expect(s.activeWorkers).toBe(0);
    expect(s.elapsedMs).toBe(0);
  });

  test('canAdmit returns true for zero-cost task', () => {
    const r = new ResourceManager({ maxCost: 100 });
    const t = makeTask('t1');
    expect(r.canAdmit(t).admit).toBe(true);
  });
});
