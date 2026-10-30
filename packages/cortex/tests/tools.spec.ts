/**
 * @manya-os/cortex — tool registry and selection tests.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import { ToolRegistry, ToolError } from '../src';
import type { Tool } from '../src';

describe('ToolRegistry', () => {
  const echoTool: Tool = {
    name: 'echo',
    description: 'echoes input',
    async: false,
    handler: (input) => ({ success: true, output: input }),
  };

  test('register and get', () => {
    const r = new ToolRegistry();
    r.register(echoTool);
    expect(r.get('echo')?.name).toBe('echo');
  });

  test('duplicate register throws', () => {
    const r = new ToolRegistry();
    r.register(echoTool);
    expect(() => r.register(echoTool)).toThrow(ToolError);
  });

  test('register without handler throws', () => {
    const r = new ToolRegistry();
    expect(() => r.register({ name: 'bad', description: '', handler: 'not a fn' as any })).toThrow(ToolError);
  });

  test('register without name throws', () => {
    const r = new ToolRegistry();
    expect(() => r.register({ name: '', description: '', handler: () => ({ success: true }) })).toThrow(ToolError);
  });

  test('invoke returns result', async () => {
    const r = new ToolRegistry();
    r.register(echoTool);
    const result = await r.invoke('echo', 'hello');
    expect(result.success).toBe(true);
    expect(result.output).toBe('hello');
  });

  test('invoke includes durationMs', async () => {
    const r = new ToolRegistry();
    r.register(echoTool);
    const result = await r.invoke('echo', 'hello');
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  test('invoke missing tool throws', async () => {
    const r = new ToolRegistry();
    await expect(r.invoke('missing', null)).rejects.toThrow(ToolError);
  });

  test('invoke catches handler errors', async () => {
    const r = new ToolRegistry();
    r.register({
      name: 'fail',
      description: 'fails',
      handler: () => { throw new Error('boom'); },
    });
    const result = await r.invoke('fail', null);
    expect(result.success).toBe(false);
    expect(result.error).toContain('boom');
  });

  test('invoke works with async handler', async () => {
    const r = new ToolRegistry();
    r.register({
      name: 'async',
      description: 'async',
      handler: async () => ({ success: true, output: 'done' }),
    });
    const result = await r.invoke('async', null);
    expect(result.success).toBe(true);
    expect(result.output).toBe('done');
  });

  test('unregister removes tool', () => {
    const r = new ToolRegistry();
    r.register(echoTool);
    expect(r.unregister('echo')).toBe(true);
    expect(r.get('echo')).toBeUndefined();
  });

  test('unregister returns false for unknown tool', () => {
    const r = new ToolRegistry();
    expect(r.unregister('missing')).toBe(false);
  });

  test('list returns all tool names', () => {
    const r = new ToolRegistry();
    r.register(echoTool);
    r.register({ name: 'fs', description: '', handler: () => ({ success: true }) });
    expect(r.list()).toContain('echo');
    expect(r.list()).toContain('fs');
    expect(r.list()).toHaveLength(2);
  });

  test('list returns empty array for empty registry', () => {
    const r = new ToolRegistry();
    expect(r.list()).toEqual([]);
  });

  test('select by required tools', () => {
    const r = new ToolRegistry();
    r.register(echoTool);
    r.register({ name: 'fs', description: '', tags: ['io'], handler: () => ({ success: true }) });
    const t = r.select(['fs', 'echo']);
    expect(t?.name).toBe('fs');
  });

  test('select by preferred tags', () => {
    const r = new ToolRegistry();
    r.register(echoTool);
    r.register({ name: 'fs', description: '', tags: ['io'], handler: () => ({ success: true }) });
    const t = r.select(undefined, ['io']);
    expect(t?.name).toBe('fs');
  });

  test('select returns undefined when no match', () => {
    const r = new ToolRegistry();
    r.register(echoTool);
    expect(r.select(['nonexistent'])).toBeUndefined();
    expect(r.select(undefined, ['nonexistent'])).toBeUndefined();
  });

  test('findByTag', () => {
    const r = new ToolRegistry();
    r.register({ name: 'a', description: '', tags: ['x'], handler: () => ({ success: true }) });
    r.register({ name: 'b', description: '', tags: ['y'], handler: () => ({ success: true }) });
    expect(r.findByTag('x')).toHaveLength(1);
    expect(r.findByTag('x')[0].name).toBe('a');
  });

  test('findByTag returns empty for no match', () => {
    const r = new ToolRegistry();
    r.register(echoTool);
    expect(r.findByTag('nonexistent')).toHaveLength(0);
  });

  test('newId generates unique ids', () => {
    const r = new ToolRegistry();
    const id1 = r.newId();
    const id2 = r.newId();
    expect(id1).not.toBe(id2);
  });

  test('newId uses custom prefix', () => {
    const r = new ToolRegistry();
    const id = r.newId('call');
    expect(id.startsWith('call_')).toBe(true);
  });

  test('get returns undefined for unknown tool', () => {
    const r = new ToolRegistry();
    expect(r.get('missing')).toBeUndefined();
  });
});
