/**
 * @manya-os/cortex — multi-component coordination tests.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import {
  Coordinator,
  ToolRegistry,
  Scheduler,
  ResourceManager,
  ConfidenceEstimator,
  CoordinationError,
} from '../src';
import type { Plan } from '../src';

const makePlan = (overrides?: Partial<Plan>): Plan => ({
  id: 'p1', goalId: 'g1', confidence: 0.8, estimatedCost: 1, estimatedDurationMs: 100,
  strategy: 'sequential', createdAt: 0,
  tasks: [{
    id: 't1', goalId: 'g1', description: 'echo hello', requiredTools: ['echo'],
    status: 'pending', createdAt: 0, estimatedCost: 1, estimatedDurationMs: 100,
  }],
  ...overrides,
});

const silentLogger = { debug() {}, info() {}, warn() {}, error() {} } as any;

describe('Coordinator', () => {
  test('executes a plan and emits events', async () => {
    const tools = new ToolRegistry();
    tools.register({ name: 'echo', description: '', handler: (input) => ({ success: true, output: input }) });
    const scheduler = new Scheduler();
    const resources = new ResourceManager({ maxCost: 100 });
    const confidence = new ConfidenceEstimator();
    const coord = new Coordinator(tools, scheduler, resources, confidence, { logger: silentLogger });
    const result = await coord.execute(makePlan());
    expect(result.tasks[0].status).toBe('completed');
    expect(coord.getEvents().length).toBeGreaterThan(0);
  });

  test('handles task failure', async () => {
    const tools = new ToolRegistry();
    tools.register({ name: 'fail', description: '', handler: () => ({ success: false, error: 'boom' }) });
    const scheduler = new Scheduler();
    const resources = new ResourceManager({ maxCost: 100 });
    const confidence = new ConfidenceEstimator();
    const coord = new Coordinator(tools, scheduler, resources, confidence, { logger: silentLogger });
    const plan = makePlan({
      tasks: [{
        id: 't1', goalId: 'g1', description: 'fail', requiredTools: ['fail'],
        status: 'pending', createdAt: 0, estimatedCost: 1, estimatedDurationMs: 100,
      }],
    });
    const result = await coord.execute(plan);
    expect(result.tasks[0].status).toBe('failed');
    expect(result.tasks[0].error).toContain('boom');
  });

  test('skips tasks without required tools', async () => {
    const tools = new ToolRegistry();
    const scheduler = new Scheduler();
    const resources = new ResourceManager({ maxCost: 100 });
    const confidence = new ConfidenceEstimator();
    const coord = new Coordinator(tools, scheduler, resources, confidence, { logger: silentLogger });
    const plan = makePlan({
      tasks: [{
        id: 't1', goalId: 'g1', description: 'no tool', requiredTools: ['nonexistent'],
        status: 'pending', createdAt: 0, estimatedCost: 1, estimatedDurationMs: 100,
      }],
    });
    const result = await coord.execute(plan);
    expect(result.tasks[0].status).toBe('completed');
  });

  test('skips tasks that exceed resource budget', async () => {
    const tools = new ToolRegistry();
    tools.register({ name: 'echo', description: '', handler: () => ({ success: true }) });
    const scheduler = new Scheduler();
    const resources = new ResourceManager({ maxCost: 1 });
    const confidence = new ConfidenceEstimator();
    const coord = new Coordinator(tools, scheduler, resources, confidence, { logger: silentLogger });
    const plan = makePlan({
      tasks: [{
        id: 't1', goalId: 'g1', description: 'expensive', requiredTools: ['echo'],
        status: 'pending', createdAt: 0, estimatedCost: 100, estimatedDurationMs: 100,
      }],
    });
    const result = await coord.execute(plan);
    expect(result.tasks[0].status).toBe('skipped');
  });

  test('skips already-skipped tasks', async () => {
    const tools = new ToolRegistry();
    const scheduler = new Scheduler();
    const resources = new ResourceManager({ maxCost: 100 });
    const confidence = new ConfidenceEstimator();
    const coord = new Coordinator(tools, scheduler, resources, confidence, { logger: silentLogger });
    const plan = makePlan({
      tasks: [{
        id: 't1', goalId: 'g1', description: 'skipped', status: 'skipped',
        createdAt: 0,
      }],
    });
    const result = await coord.execute(plan);
    expect(result.tasks[0].status).toBe('skipped');
  });

  test('throws on null plan', async () => {
    const tools = new ToolRegistry();
    const scheduler = new Scheduler();
    const resources = new ResourceManager();
    const confidence = new ConfidenceEstimator();
    const coord = new Coordinator(tools, scheduler, resources, confidence, { logger: silentLogger });
    await expect(coord.execute(null as any)).rejects.toThrow(CoordinationError);
  });

  test('getEvents returns events', async () => {
    const tools = new ToolRegistry();
    tools.register({ name: 'echo', description: '', handler: () => ({ success: true }) });
    const scheduler = new Scheduler();
    const resources = new ResourceManager({ maxCost: 100 });
    const confidence = new ConfidenceEstimator();
    const coord = new Coordinator(tools, scheduler, resources, confidence, { logger: silentLogger });
    await coord.execute(makePlan());
    const events = coord.getEvents();
    expect(events.length).toBeGreaterThan(0);
    expect(events[0].id).toBeDefined();
    expect(events[0].timestamp).toBeGreaterThan(0);
  });

  test('handles task that throws during execution', async () => {
    const tools = new ToolRegistry();
    tools.register({ name: 'throw', description: '', handler: () => { throw new Error('crash'); } });
    const scheduler = new Scheduler();
    const resources = new ResourceManager({ maxCost: 100 });
    const confidence = new ConfidenceEstimator();
    const coord = new Coordinator(tools, scheduler, resources, confidence, { logger: silentLogger });
    const plan = makePlan({
      tasks: [{
        id: 't1', goalId: 'g1', description: 'throw', requiredTools: ['throw'],
        status: 'pending', createdAt: 0, estimatedCost: 1, estimatedDurationMs: 100,
      }],
    });
    const result = await coord.execute(plan);
    expect(result.tasks[0].status).toBe('failed');
    expect(result.tasks[0].error).toContain('crash');
  });

  test('events include task_scheduled', async () => {
    const tools = new ToolRegistry();
    tools.register({ name: 'echo', description: '', handler: () => ({ success: true }) });
    const scheduler = new Scheduler();
    const resources = new ResourceManager({ maxCost: 100 });
    const confidence = new ConfidenceEstimator();
    const coord = new Coordinator(tools, scheduler, resources, confidence, { logger: silentLogger });
    await coord.execute(makePlan());
    const events = coord.getEvents();
    const scheduled = events.filter(e => e.type === 'task_scheduled');
    expect(scheduled.length).toBeGreaterThan(0);
  });

  test('uses custom retry policy', async () => {
    const tools = new ToolRegistry();
    tools.register({ name: 'echo', description: '', handler: () => ({ success: true }) });
    const scheduler = new Scheduler();
    const resources = new ResourceManager({ maxCost: 100 });
    const confidence = new ConfidenceEstimator();
    const coord = new Coordinator(tools, scheduler, resources, confidence, {
      logger: silentLogger,
      retryPolicy: { maxAttempts: 1, backoff: 'fixed', baseDelayMs: 1, maxDelayMs: 1 },
    });
    const result = await coord.execute(makePlan());
    expect(result.tasks[0].status).toBe('completed');
  });
});
