/**
 * @manya-os/cortex — knowledge registry and differential sync tests.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import { KnowledgeRegistry, KnowledgeError } from '../src';

describe('KnowledgeRegistry', () => {
  test('register and lookup', () => {
    const kr = new KnowledgeRegistry();
    kr.register('user:theme', 'cortex');
    const entry = kr.lookup('user:theme');
    expect(entry).toBeDefined();
    expect(entry!.key).toBe('user:theme');
    expect(entry!.ownerComponentId).toBe('cortex');
  });

  test('register throws on empty key', () => {
    const kr = new KnowledgeRegistry();
    expect(() => kr.register('', 'comp')).toThrow(KnowledgeError);
  });

  test('register throws on empty ownerComponentId', () => {
    const kr = new KnowledgeRegistry();
    expect(() => kr.register('key', '')).toThrow(KnowledgeError);
  });

  test('register throws when key owned by different component', () => {
    const kr = new KnowledgeRegistry();
    kr.register('key1', 'comp-a');
    expect(() => kr.register('key1', 'comp-b')).toThrow(KnowledgeError);
  });

  test('register updates lastUpdated for same owner', () => {
    const kr = new KnowledgeRegistry();
    const e1 = kr.register('key1', 'comp-a');
    const e2 = kr.register('key1', 'comp-a');
    expect(e2.lastUpdated).toBeGreaterThanOrEqual(e1.lastUpdated);
  });

  test('transfer moves ownership', () => {
    const kr = new KnowledgeRegistry();
    kr.register('key1', 'comp-a');
    const transferred = kr.transfer('key1', 'comp-b');
    expect(transferred.ownerComponentId).toBe('comp-b');
    expect(kr.lookup('key1')!.ownerComponentId).toBe('comp-b');
  });

  test('transfer preserves registeredAt', () => {
    const kr = new KnowledgeRegistry();
    const e1 = kr.register('key1', 'comp-a');
    const e2 = kr.transfer('key1', 'comp-b');
    expect(e2.registeredAt).toBe(e1.registeredAt);
  });

  test('has returns true for registered key', () => {
    const kr = new KnowledgeRegistry();
    kr.register('k', 'c');
    expect(kr.has('k')).toBe(true);
  });

  test('has returns false for unknown key', () => {
    const kr = new KnowledgeRegistry();
    expect(kr.has('missing')).toBe(false);
  });

  test('unregister removes key', () => {
    const kr = new KnowledgeRegistry();
    kr.register('k', 'c');
    expect(kr.unregister('k')).toBe(true);
    expect(kr.has('k')).toBe(false);
  });

  test('unregister returns false for unknown key', () => {
    const kr = new KnowledgeRegistry();
    expect(kr.unregister('missing')).toBe(false);
  });

  test('all returns all entries', () => {
    const kr = new KnowledgeRegistry();
    kr.register('a', 'c1');
    kr.register('b', 'c2');
    expect(kr.all()).toHaveLength(2);
  });

  test('byOwner returns entries for a specific component', () => {
    const kr = new KnowledgeRegistry();
    kr.register('a', 'c1');
    kr.register('b', 'c2');
    kr.register('c', 'c1');
    const c1Entries = kr.byOwner('c1');
    expect(c1Entries).toHaveLength(2);
    expect(c1Entries.map(e => e.key)).toContain('a');
    expect(c1Entries.map(e => e.key)).toContain('c');
  });

  test('size returns count', () => {
    const kr = new KnowledgeRegistry();
    expect(kr.size()).toBe(0);
    kr.register('a', 'c');
    expect(kr.size()).toBe(1);
  });

  test('description is stored', () => {
    const kr = new KnowledgeRegistry();
    kr.register('k', 'c', { description: 'test desc' });
    expect(kr.lookup('k')!.description).toBe('test desc');
  });

  test('description is updated on re-register', () => {
    const kr = new KnowledgeRegistry();
    kr.register('k', 'c', { description: 'v1' });
    kr.register('k', 'c', { description: 'v2' });
    expect(kr.lookup('k')!.description).toBe('v2');
  });
});

describe('KnowledgeRegistry — diff', () => {
  test('diff returns no changes when since is after all updates', () => {
    const kr = new KnowledgeRegistry();
    kr.register('a', 'c');
    const future = Date.now() + 10000;
    const result = kr.diff(future);
    expect(result.hasChanges).toBe(false);
    expect(result.delta.added).toHaveLength(0);
    expect(result.delta.changed).toHaveLength(0);
  });

  test('diff returns added for recently registered keys', () => {
    const kr = new KnowledgeRegistry();
    const before = Date.now() - 1;
    kr.register('a', 'c');
    const result = kr.diff(before);
    expect(result.hasChanges).toBe(true);
    expect(result.delta.added).toHaveLength(1);
    expect(result.delta.added[0].key).toBe('a');
  });

  test('diff returns changed for updated keys', async () => {
    const kr = new KnowledgeRegistry();
    kr.register('a', 'c');
    // Wait so the update timestamp differs
    await new Promise(r => setTimeout(r, 20));
    kr.transfer('a', 'c');
    const result = kr.diff(kr.lookup('a')!.registeredAt + 1);
    expect(result.hasChanges).toBe(true);
    expect(result.delta.changed).toHaveLength(1);
  });

  test('diff excludes own component', () => {
    const kr = new KnowledgeRegistry();
    const before = Date.now() - 1;
    kr.register('a', 'comp-a');
    kr.register('b', 'comp-b');
    const result = kr.diffExcluding(before, 'comp-a');
    expect(result.hasChanges).toBe(true);
    expect(result.delta.added).toHaveLength(1);
    expect(result.delta.added[0].key).toBe('b');
  });

  test('diff excludes own component — returns no changes when only own keys', () => {
    const kr = new KnowledgeRegistry();
    const before = Date.now() - 1;
    kr.register('a', 'comp-a');
    const result = kr.diffExcluding(before, 'comp-a');
    expect(result.hasChanges).toBe(false);
  });

  test('diff throws on negative since', () => {
    const kr = new KnowledgeRegistry();
    expect(() => kr.diff(-1)).toThrow(KnowledgeError);
  });

  test('diffExcluding throws on negative since', () => {
    const kr = new KnowledgeRegistry();
    expect(() => kr.diffExcluding(-1, 'c')).toThrow(KnowledgeError);
  });
});
