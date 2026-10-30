/**
 * @manya-os/cortex — the reasoning orchestration engine facade tests.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import { Cortex, DEFAULT_CONFIG, GoalError } from '../src';
import type { Workflow } from '../src';

describe('Cortex', () => {
  test('reason() sets goal, plans, and executes', async () => {
    const cortex = new Cortex({ logLevel: 'silent' });
    cortex.registerTool({
      name: 'echo', description: '', handler: (input) => ({ success: true, output: input }),
    });
    const { goal, plan, events } = await cortex.reason('do simple task');
    expect(goal.status).toMatch(/active|achieved/);
    expect(plan.tasks.length).toBeGreaterThan(0);
    expect(events.length).toBeGreaterThan(0);
  });

  test('route classifies input', () => {
    const cortex = new Cortex({ logLevel: 'silent' });
    const r = cortex.route('remember the user name');
    expect(r.component).toBe('memory');
  });

  test('registerTool adds to registry', () => {
    const cortex = new Cortex({ logLevel: 'silent' });
    cortex.registerTool({ name: 'custom', description: '', handler: () => ({ success: true }) });
    expect(cortex.tools.list()).toContain('custom');
  });

  test('runWorkflow executes workflow', async () => {
    const cortex = new Cortex({ logLevel: 'silent' });
    cortex.registerTool({ name: 'echo', description: '', handler: (input) => ({ success: true, output: input }) });
    const wf: Workflow = {
      id: 'wf1', name: 'test', initialStep: 's1',
      steps: [{ id: 's1', name: 'step1', tool: 'echo', terminal: true }],
    };
    const exec = await cortex.runWorkflow(wf, 'hello');
    expect(exec.status).toBe('completed');
  });

  test('getEvents after reason()', async () => {
    const cortex = new Cortex({ logLevel: 'silent' });
    await cortex.reason('do something');
    expect(cortex.getEvents().length).toBeGreaterThan(0);
  });

  test('reset clears scheduler and resources', () => {
    const cortex = new Cortex({ logLevel: 'silent' });
    cortex.reset();
    expect(cortex.scheduler.size()).toBe(0);
  });

  test('setGoal creates and activates goal', () => {
    const cortex = new Cortex({ logLevel: 'silent' });
    const goal = cortex.setGoal('do something');
    expect(goal.id).toBeDefined();
    expect(cortex.goals.get(goal.id)?.status).toBe('active');
  });

  test('setGoal with options', () => {
    const cortex = new Cortex({ logLevel: 'silent' });
    const goal = cortex.setGoal('do something', { priority: 0.9, deadline: 5000 });
    expect(goal.priority).toBe(0.9);
    expect(goal.deadline).toBe(5000);
  });

  test('planGoal creates a plan', () => {
    const cortex = new Cortex({ logLevel: 'silent' });
    const goal = cortex.setGoal('fetch data and parse it');
    const plan = cortex.planGoal(goal);
    expect(plan.tasks.length).toBeGreaterThan(0);
    expect(plan.goalId).toBe(goal.id);
  });

  test('executePlan runs a plan', async () => {
    const cortex = new Cortex({ logLevel: 'silent' });
    cortex.registerTool({ name: 'echo', description: '', handler: (input) => ({ success: true, output: input }) });
    const goal = cortex.setGoal('echo hello');
    const plan = cortex.planGoal(goal);
    const result = await cortex.executePlan(plan);
    expect(result.tasks.length).toBeGreaterThan(0);
  });

  test('exposes public subcomponents', () => {
    const cortex = new Cortex({ logLevel: 'silent' });
    expect(cortex.goals).toBeDefined();
    expect(cortex.planner).toBeDefined();
    expect(cortex.tools).toBeDefined();
    expect(cortex.router).toBeDefined();
    expect(cortex.scheduler).toBeDefined();
    expect(cortex.confidence).toBeDefined();
    expect(cortex.resources).toBeDefined();
    expect(cortex.workflows).toBeDefined();
    expect(cortex.coordinator).toBeDefined();
  });

  test('getEvents returns empty array before reason()', () => {
    const cortex = new Cortex({ logLevel: 'silent' });
    expect(cortex.getEvents()).toEqual([]);
  });

  test('reason() transitions goal to achieved when all tasks complete', async () => {
    const cortex = new Cortex({ logLevel: 'silent' });
    cortex.registerTool({ name: 'echo', description: '', handler: () => ({ success: true }) });
    const { goal } = await cortex.reason('echo hello');
    expect(goal.status).toBe('achieved');
  });

  test('reason() throws GoalError when tasks fail (active→active transition)', async () => {
    const cortex = new Cortex({ logLevel: 'silent' });
    cortex.registerTool({ name: 'validate', description: '', handler: () => ({ success: false, error: 'no' }) });
    cortex.registerTool({ name: 'verify', description: '', handler: () => ({ success: false, error: 'no' }) });
    await expect(cortex.reason('validate data and verify results')).rejects.toThrow(GoalError);
  });
});

describe('DEFAULT_CONFIG', () => {
  test('has expected values', () => {
    expect(DEFAULT_CONFIG.defaultStrategy).toBe('adaptive');
    expect(DEFAULT_CONFIG.retryPolicy.maxAttempts).toBe(3);
  });
});
