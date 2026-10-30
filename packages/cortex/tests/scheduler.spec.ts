/**
 * @manya-os/cortex — task scheduler tests.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import { Scheduler, SchedulerError } from '../src';
import type { Task } from '../src';

describe('Scheduler', () => {
  const makeTask = (id: string, overrides?: Partial<Task>): Task => ({
    id, goalId: 'g', description: 'x', status: 'pending', createdAt: 0, ...overrides,
  });

  test('schedule and popNext', () => {
    const s = new Scheduler();
    s.schedule(makeTask('t1'), 'worker1');
    expect(s.size()).toBe(1);
    const next = s.popNext();
    expect(next?.taskId).toBe('t1');
    expect(s.size()).toBe(0);
  });

  test('schedule respects priority ordering', () => {
    const s = new Scheduler();
    s.schedule(makeTask('t1'), 'w', { priority: 0.3 });
    s.schedule(makeTask('t2'), 'w', { priority: 0.9 });
    expect(s.popNext()?.taskId).toBe('t2');
  });

  test('schedule enforces dependency ordering', () => {
    const s = new Scheduler();
    const t2 = makeTask('t2', { dependsOn: ['t1'] });
    expect(() => s.schedule(t2, 'w')).toThrow(SchedulerError);
  });

  test('cancel removes from queue', () => {
    const s = new Scheduler();
    s.schedule(makeTask('t1'), 'w');
    expect(s.cancel('t1')).toBe(true);
    expect(s.size()).toBe(0);
  });

  test('cancel returns false for unknown task', () => {
    const s = new Scheduler();
    expect(s.cancel('missing')).toBe(false);
  });

  test('resource budget check - cost exceeded', () => {
    const s = new Scheduler();
    const t = makeTask('t1', { estimatedCost: 1000 });
    const budget = { maxCost: 100, maxParallel: 4, maxDurationMs: 60000, spentCost: 0, activeWorkers: 0, elapsedMs: 0 };
    expect(() => s.schedule(t, 'w', { budget })).toThrow(SchedulerError);
  });

  test('resource budget check - parallel exceeded', () => {
    const s = new Scheduler();
    const t = makeTask('t1');
    const budget = { maxCost: 1000, maxParallel: 0, maxDurationMs: 60000, spentCost: 0, activeWorkers: 0, elapsedMs: 0 };
    expect(() => s.schedule(t, 'w', { budget })).toThrow(SchedulerError);
  });

  test('schedule throws on null task', () => {
    const s = new Scheduler();
    expect(() => s.schedule(null as any, 'w')).toThrow(SchedulerError);
  });

  test('schedule throws on empty worker', () => {
    const s = new Scheduler();
    expect(() => s.schedule(makeTask('t1'), '')).toThrow(SchedulerError);
  });

  test('all returns all scheduled tasks', () => {
    const s = new Scheduler();
    s.schedule(makeTask('t1'), 'w');
    s.schedule(makeTask('t2'), 'w');
    expect(s.all()).toHaveLength(2);
  });

  test('all returns empty array for empty scheduler', () => {
    const s = new Scheduler();
    expect(s.all()).toEqual([]);
  });

  test('next returns first schedulable task', () => {
    const s = new Scheduler();
    s.schedule(makeTask('t1'), 'w');
    const next = s.next(new Set());
    expect(next?.taskId).toBe('t1');
  });

  test('next returns undefined for empty queue', () => {
    const s = new Scheduler();
    expect(s.next(new Set())).toBeUndefined();
  });

  test('popNext returns undefined for empty queue', () => {
    const s = new Scheduler();
    expect(s.popNext()).toBeUndefined();
  });

  test('clear empties the queue', () => {
    const s = new Scheduler();
    s.schedule(makeTask('t1'), 'w');
    s.schedule(makeTask('t2'), 'w');
    s.clear();
    expect(s.size()).toBe(0);
  });

  test('size returns 0 for empty scheduler', () => {
    const s = new Scheduler();
    expect(s.size()).toBe(0);
  });

  test('schedule with custom at time', () => {
    const s = new Scheduler();
    const st = s.schedule(makeTask('t1'), 'w', { at: 5000 });
    expect(st.scheduledAt).toBe(5000);
  });

  test('schedule defaults priority to 0.5', () => {
    const s = new Scheduler();
    const st = s.schedule(makeTask('t1'), 'w');
    expect(st.priority).toBe(0.5);
  });

  test('schedule with satisfied dependency succeeds', () => {
    const s = new Scheduler();
    s.schedule(makeTask('t1'), 'w');
    const t2 = makeTask('t2', { dependsOn: ['t1'] });
    expect(() => s.schedule(t2, 'w')).not.toThrow();
  });
});
