/**
 * @manya-os/cortex — workflow engine tests.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import { WorkflowEngine, ToolRegistry, WorkflowError } from '../src';
import type { Workflow } from '../src';

describe('WorkflowEngine', () => {
  const makeTools = (): ToolRegistry => {
    const tools = new ToolRegistry();
    tools.register({ name: 'echo', description: '', handler: (input) => ({ success: true, output: input }) });
    tools.register({ name: 'fail', description: '', handler: () => ({ success: false, error: 'oops' }) });
    return tools;
  };

  test('executes a simple workflow', async () => {
    const tools = makeTools();
    const wf: Workflow = {
      id: 'wf1', name: 'echo-wf', initialStep: 's1',
      steps: [
        { id: 's1', name: 'step1', tool: 'echo', nextOnSuccess: 's2' },
        { id: 's2', name: 'step2', tool: 'echo', terminal: true },
      ],
    };
    const e = new WorkflowEngine(tools);
    const exec = await e.execute(wf, 'hello');
    expect(exec.status).toBe('completed');
    expect(exec.visitedSteps).toEqual(['s1', 's2']);
  });

  test('workflow handles failure', async () => {
    const tools = makeTools();
    const wf: Workflow = {
      id: 'wf1', name: 'fail-wf', initialStep: 's1',
      steps: [
        { id: 's1', name: 'step1', tool: 'fail', nextOnSuccess: 's2' },
        { id: 's2', name: 'step2', terminal: true },
      ],
    };
    const e = new WorkflowEngine(tools);
    const exec = await e.execute(wf);
    expect(exec.status).toBe('failed');
    expect(exec.error).toContain('oops');
  });

  test('no-op step (passthrough)', async () => {
    const tools = makeTools();
    const wf: Workflow = {
      id: 'wf1', name: 'noop-wf', initialStep: 's1',
      steps: [
        { id: 's1', name: 'step1', terminal: true },
      ],
    };
    const e = new WorkflowEngine(tools);
    const exec = await e.execute(wf, 'input');
    expect(exec.status).toBe('completed');
  });

  test('throws on null workflow', async () => {
    const tools = makeTools();
    const e = new WorkflowEngine(tools);
    await expect(e.execute(null as any)).rejects.toThrow(WorkflowError);
  });

  test('throws on missing initial step', async () => {
    const tools = makeTools();
    const wf: Workflow = {
      id: 'wf1', name: 'bad', initialStep: 'nonexistent',
      steps: [{ id: 's1', name: 'step1', terminal: true }],
    };
    const e = new WorkflowEngine(tools);
    await expect(e.execute(wf)).rejects.toThrow(WorkflowError);
  });

  test('fails when next step not found', async () => {
    const tools = makeTools();
    const wf: Workflow = {
      id: 'wf1', name: 'bad', initialStep: 's1',
      steps: [
        { id: 's1', name: 'step1', tool: 'echo', nextOnSuccess: 'missing' },
      ],
    };
    const e = new WorkflowEngine(tools);
    const exec = await e.execute(wf);
    expect(exec.status).toBe('failed');
    expect(exec.error).toContain('not found');
  });

  test('workflow with no next on success completes', async () => {
    const tools = makeTools();
    const wf: Workflow = {
      id: 'wf1', name: 'no-next', initialStep: 's1',
      steps: [
        { id: 's1', name: 'step1', tool: 'echo' },
      ],
    };
    const e = new WorkflowEngine(tools);
    const exec = await e.execute(wf);
    expect(exec.status).toBe('completed');
  });

  test('executes step with explicit input', async () => {
    const tools = makeTools();
    const wf: Workflow = {
      id: 'wf1', name: 'explicit', initialStep: 's1',
      steps: [
        { id: 's1', name: 'step1', tool: 'echo', input: 'explicit-input', nextOnSuccess: 's2' },
        { id: 's2', name: 'step2', terminal: true },
      ],
    };
    const e = new WorkflowEngine(tools);
    const exec = await e.execute(wf, 'ignored');
    expect(exec.outputs['s1']).toBe('explicit-input');
  });

  test('abort stops running execution', async () => {
    const tools = makeTools();
    const wf: Workflow = {
      id: 'wf1', name: 'abort', initialStep: 's1',
      steps: [
        { id: 's1', name: 'step1', tool: 'echo', terminal: true },
      ],
    };
    const e = new WorkflowEngine(tools);
    const exec = await e.execute(wf);
    exec.status = 'running';
    const aborted = e.abort(exec);
    expect(aborted.status).toBe('aborted');
    expect(aborted.endedAt).toBeGreaterThan(0);
  });

  test('abort is no-op for non-running execution', async () => {
    const tools = makeTools();
    const wf: Workflow = {
      id: 'wf1', name: 'abort', initialStep: 's1',
      steps: [
        { id: 's1', name: 'step1', tool: 'echo', terminal: true },
      ],
    };
    const e = new WorkflowEngine(tools);
    const exec = await e.execute(wf);
    expect(exec.status).toBe('completed');
    const result = e.abort(exec);
    expect(result.status).toBe('completed');
  });

  test('execution has id and workflowId', async () => {
    const tools = makeTools();
    const wf: Workflow = {
      id: 'wf1', name: 'ids', initialStep: 's1',
      steps: [{ id: 's1', name: 'step1', terminal: true }],
    };
    const e = new WorkflowEngine(tools);
    const exec = await e.execute(wf);
    expect(exec.id).toBeDefined();
    expect(exec.workflowId).toBe('wf1');
  });

  test('execution records outputs per step', async () => {
    const tools = makeTools();
    const wf: Workflow = {
      id: 'wf1', name: 'outputs', initialStep: 's1',
      steps: [
        { id: 's1', name: 'step1', tool: 'echo', nextOnSuccess: 's2' },
        { id: 's2', name: 'step2', tool: 'echo', nextOnSuccess: 's3' },
        { id: 's3', name: 'step3', terminal: true },
      ],
    };
    const e = new WorkflowEngine(tools);
    const exec = await e.execute(wf, 'data');
    expect(exec.outputs['s1']).toBe('data');
    expect(exec.outputs['s2']).toBe('data');
  });
});
