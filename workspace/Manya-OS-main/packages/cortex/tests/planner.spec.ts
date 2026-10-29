/**
 * @manya-os/cortex — planner and topological sort tests.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import { Planner, topoSort, PlanningError } from '../src';
import type { Goal, Task } from '../src';

describe('Planner', () => {
  const goal: Goal = {
    id: 'g1', description: 'fetch data and parse it', priority: 0.7,
    status: 'active', createdAt: Date.now(),
  };

  test('plan decomposes and orders', () => {
    const p = new Planner();
    const plan = p.plan(goal);
    expect(plan.tasks.length).toBeGreaterThan(0);
    expect(plan.goalId).toBe('g1');
    expect(plan.confidence).toBeGreaterThan(0);
    expect(plan.confidence).toBeLessThanOrEqual(1);
  });

  test('plan with sequential strategy returns single task', () => {
    const p = new Planner();
    const plan = p.plan(goal, 'sequential');
    expect(plan.tasks).toHaveLength(1);
  });

  test('plan with parallel strategy', () => {
    const p = new Planner();
    const plan = p.plan(goal, 'parallel');
    expect(plan.tasks.length).toBeGreaterThan(0);
    expect(plan.strategy).toBe('parallel');
  });

  test('plan with decompose-first strategy', () => {
    const p = new Planner();
    const plan = p.plan(goal, 'decompose-first');
    expect(plan.tasks.length).toBeGreaterThan(0);
  });

  test('plan with iterative strategy', () => {
    const p = new Planner();
    const plan = p.plan(goal, 'iterative');
    expect(plan.tasks.length).toBeGreaterThan(0);
    expect(plan.strategy).toBe('iterative');
  });

  test('plan throws on null goal', () => {
    const p = new Planner();
    expect(() => p.plan(null as any)).toThrow(PlanningError);
  });

  test('plan estimates cost and duration', () => {
    const p = new Planner();
    const plan = p.plan(goal);
    expect(plan.estimatedCost).toBeGreaterThan(0);
    expect(plan.estimatedDurationMs).toBeGreaterThan(0);
  });

  test('plan has a unique id', () => {
    const p = new Planner();
    const plan1 = p.plan(goal);
    const plan2 = p.plan(goal);
    expect(plan1.id).not.toBe(plan2.id);
  });

  test('replan skips dependents of failed task', () => {
    const p = new Planner();
    const plan = p.plan(goal);
    const firstTaskId = plan.tasks[0].id;
    const r = p.replan(plan, firstTaskId, { retry: false });
    expect(r.tasks.find(t => t.id === firstTaskId)?.status).toBe('skipped');
  });

  test('replan with retry marks task as pending', () => {
    const p = new Planner();
    const plan = p.plan(goal);
    const firstTaskId = plan.tasks[0].id;
    const r = p.replan(plan, firstTaskId, { retry: true });
    expect(r.tasks.find(t => t.id === firstTaskId)?.status).toBe('pending');
  });

  test('replan throws on unknown task id', () => {
    const p = new Planner();
    const plan = p.plan(goal);
    expect(() => p.replan(plan, 'nonexistent', { retry: false })).toThrow(PlanningError);
  });
});

describe('topoSort', () => {
  test('orders by dependencies', () => {
    const tasks: Task[] = [
      { id: 'c', goalId: 'g', description: 'c', status: 'pending', createdAt: 0, dependsOn: ['b'] },
      { id: 'a', goalId: 'g', description: 'a', status: 'pending', createdAt: 0 },
      { id: 'b', goalId: 'g', description: 'b', status: 'pending', createdAt: 0, dependsOn: ['a'] },
    ];
    const sorted = topoSort(tasks);
    expect(sorted.map(t => t.id)).toEqual(['a', 'b', 'c']);
  });

  test('throws on cycle', () => {
    const tasks: Task[] = [
      { id: 'a', goalId: 'g', description: 'a', status: 'pending', createdAt: 0, dependsOn: ['b'] },
      { id: 'b', goalId: 'g', description: 'b', status: 'pending', createdAt: 0, dependsOn: ['a'] },
    ];
    expect(() => topoSort(tasks)).toThrow(PlanningError);
  });

  test('throws on unknown dependency', () => {
    const tasks: Task[] = [
      { id: 'a', goalId: 'g', description: 'a', status: 'pending', createdAt: 0, dependsOn: ['missing'] },
    ];
    expect(() => topoSort(tasks)).toThrow(PlanningError);
  });

  test('handles empty array', () => {
    expect(topoSort([])).toEqual([]);
  });

  test('handles single task with no deps', () => {
    const tasks: Task[] = [
      { id: 'a', goalId: 'g', description: 'a', status: 'pending', createdAt: 0 },
    ];
    expect(topoSort(tasks)).toHaveLength(1);
    expect(topoSort(tasks)[0].id).toBe('a');
  });

  test('preserves task properties', () => {
    const tasks: Task[] = [
      { id: 'a', goalId: 'g', description: 'hello', status: 'completed', createdAt: 123, estimatedCost: 5 },
    ];
    const sorted = topoSort(tasks);
    expect(sorted[0].description).toBe('hello');
    expect(sorted[0].estimatedCost).toBe(5);
  });
});
