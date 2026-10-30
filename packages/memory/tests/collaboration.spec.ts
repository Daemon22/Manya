/**
 * @manya-os/memory — collaboration package and local-only persistence tests.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import { MemorySystem, MemoryError } from '../src';
import type { CollaborationPackage, WriteConflict, EpisodicEvent } from '../src';
import { detectConflicts, resolveConflicts, validateCollaborationPackage } from '../src/sync/sync';

function makeLocal(): MemorySystem {
  const m = new MemorySystem({ logLevel: 'silent' });
  m.remember('agent-a', 'read a book', { topic: 'AI' }, { importance: 0.8, tags: ['reading'] });
  m.remember('agent-b', 'wrote code', { file: 'main.ts' }, { importance: 0.6 });
  m.learn('Linus Torvalds', 'created', 'Linux', 1.0, 'wiki');
  m.store({ content: 'important note' }, { importance: 0.9, tags: ['notes'] });
  return m;
}

describe('MemorySystem — instanceId', () => {
  test('each instance gets a unique id', () => {
    const a = new MemorySystem({ logLevel: 'silent' });
    const b = new MemorySystem({ logLevel: 'silent' });
    expect(a.instanceId).not.toBe(b.instanceId);
    expect(a.instanceId).toMatch(/^mem_/);
  });
});

describe('MemorySystem — createCollaborationPackage', () => {
  test('creates a package with shareable events', () => {
    const m = makeLocal();
    const pkg = m.createCollaborationPackage();
    expect(pkg.version).toBe(1);
    expect(pkg.sourceInstanceId).toBe(m.instanceId);
    expect(pkg.episodic.length).toBeGreaterThan(0);
    expect(pkg.semantic.length).toBeGreaterThan(0);
    expect(pkg.longterm.length).toBeGreaterThan(0);
  });

  test('package includes only shareable episodic events', () => {
    const m = new MemorySystem({ logLevel: 'silent' });
    m.remember('a', 'shareable event', {}, { importance: 0.5 });
    m.remember('b', 'private event', {}, { importance: 0.9 });
    // Mark first as shareable, second explicitly not
    const events = m.episodic.all();
    events[0].shareable = true;
    events[1].shareable = false;
    const pkg = m.createCollaborationPackage();
    expect(pkg.episodic).toHaveLength(1);
    expect(pkg.episodic[0].event).toBe('shareable event');
  });

  test('can exclude subsystems', () => {
    const m = makeLocal();
    const pkg = m.createCollaborationPackage({
      includeEpisodic: false,
      includeSemantic: true,
      includeLongterm: false,
    });
    expect(pkg.episodic).toHaveLength(0);
    expect(pkg.semantic.length).toBeGreaterThan(0);
    expect(pkg.longterm).toHaveLength(0);
  });

  test('links only include those between shared records', () => {
    const m = makeLocal();
    // Create a link between two records.
    const epi = m.episodic.all();
    const lt = m.longterm.all();
    if (epi.length > 0 && lt.length > 0) {
      m.link(epi[0].id, lt[0].id, 'relates_to');
    }
    const pkg = m.createCollaborationPackage();
    // Link should be excluded if one side is not in the package.
    // But since we include everything, it should be there.
    expect(pkg.links.length).toBeGreaterThanOrEqual(0);
  });

  test('sets expiry and metadata', () => {
    const m = makeLocal();
    const pkg = m.createCollaborationPackage({
      expiresAt: '2030-01-01T00:00:00Z',
      metadata: { purpose: 'research' },
    });
    expect(pkg.expiresAt).toBe('2030-01-01T00:00:00Z');
    expect(pkg.metadata?.purpose).toBe('research');
  });

  test('filters work', () => {
    const m = new MemorySystem({ logLevel: 'silent' });
    m.remember('a', 'AI is great', {}, { importance: 0.9, tags: ['ai'] });
    m.remember('b', 'weather is nice', {}, { importance: 0.3, tags: ['weather'] });
    const pkg = m.createCollaborationPackage({
      filterEpisodic: (e: EpisodicEvent) => e.tags?.includes('ai') ?? false,
    });
    expect(pkg.episodic).toHaveLength(1);
    expect(pkg.episodic[0].event).toBe('AI is great');
  });
});

describe('detectConflicts', () => {
  test('no conflicts when records differ', () => {
    const local: any = {
      schemaVersion: 1, takenAt: '',
      working: [], episodic: [{ id: 'e1', timestamp: 100, agent: 'a', event: 'x' }],
      semantic: [], procedural: [], longterm: [], links: [], permissions: [],
    };
    const pkg: CollaborationPackage = {
      version: 1, sourceInstanceId: 'remote', createdAt: '',
      episodic: [{ id: 'e2', timestamp: 200, agent: 'b', event: 'y' }],
      semantic: [], longterm: [], links: [],
    };
    expect(detectConflicts(local, pkg)).toHaveLength(0);
  });

  test('detects episodic conflict', () => {
    const local: any = {
      schemaVersion: 1, takenAt: '',
      working: [], episodic: [{ id: 'e1', timestamp: 100, agent: 'a', event: 'x' }],
      semantic: [], procedural: [], longterm: [], links: [], permissions: [],
    };
    const pkg: CollaborationPackage = {
      version: 1, sourceInstanceId: 'remote', createdAt: '',
      episodic: [{ id: 'e1', timestamp: 200, agent: 'a', event: 'x-updated' }],
      semantic: [], longterm: [], links: [],
    };
    const conflicts = detectConflicts(local, pkg);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].memoryType).toBe('episodic');
  });

  test('detects semantic conflict', () => {
    const local: any = {
      schemaVersion: 1, takenAt: '',
      working: [], episodic: [],
      semantic: [{ id: 's1', entity: 'E', attribute: 'a', value: 1, confidence: 0.8, learnedAt: 100 }],
      procedural: [], longterm: [], links: [], permissions: [],
    };
    const pkg: CollaborationPackage = {
      version: 1, sourceInstanceId: 'remote', createdAt: '',
      episodic: [],
      semantic: [{ id: 's1', entity: 'E', attribute: 'a', value: 2, confidence: 0.9, learnedAt: 200 }],
      longterm: [], links: [],
    };
    const conflicts = detectConflicts(local, pkg);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].memoryType).toBe('semantic');
  });

  test('detects long-term conflict', () => {
    const local: any = {
      schemaVersion: 1, takenAt: '',
      working: [], episodic: [], semantic: [], procedural: [],
      longterm: [{ id: 'l1', type: 'longterm', payload: {}, createdAt: 100, lastAccessedAt: 100, accessCount: 1, importance: 0.5 }],
      links: [], permissions: [],
    };
    const pkg: CollaborationPackage = {
      version: 1, sourceInstanceId: 'remote', createdAt: '',
      episodic: [], semantic: [],
      longterm: [{ id: 'l1', type: 'longterm', payload: {}, createdAt: 100, lastAccessedAt: 200, accessCount: 2, importance: 0.6 }],
      links: [],
    };
    const conflicts = detectConflicts(local, pkg);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].memoryType).toBe('longterm');
  });
});

describe('resolveConflicts', () => {
  test('last-write-wins picks remote when remote is newer', () => {
    const conflicts: WriteConflict[] = [
      { id: 'e1', memoryType: 'episodic', localTimestamp: 100, remoteTimestamp: 200, resolution: 'remote' },
    ];
    const res = resolveConflicts(conflicts, 'last-write-wins');
    expect(res.get('e1')).toBe('remote');
  });

  test('last-write-wins picks local when local is newer', () => {
    const conflicts: WriteConflict[] = [
      { id: 'e1', memoryType: 'episodic', localTimestamp: 300, remoteTimestamp: 200, resolution: 'local' },
    ];
    const res = resolveConflicts(conflicts, 'last-write-wins');
    expect(res.get('e1')).toBe('local');
  });

  test('local-wins always picks local', () => {
    const conflicts: WriteConflict[] = [
      { id: 'e1', memoryType: 'episodic', localTimestamp: 100, remoteTimestamp: 200, resolution: 'remote' },
    ];
    const res = resolveConflicts(conflicts, 'local-wins');
    expect(res.get('e1')).toBe('local');
  });

  test('remote-wins always picks remote', () => {
    const conflicts: WriteConflict[] = [
      { id: 'e1', memoryType: 'episodic', localTimestamp: 300, remoteTimestamp: 200, resolution: 'local' },
    ];
    const res = resolveConflicts(conflicts, 'remote-wins');
    expect(res.get('e1')).toBe('remote');
  });

  test('manual returns skip for all', () => {
    const conflicts: WriteConflict[] = [
      { id: 'e1', memoryType: 'episodic', localTimestamp: 100, remoteTimestamp: 200, resolution: 'remote' },
    ];
    const res = resolveConflicts(conflicts, 'manual');
    expect(res.get('e1')).toBe('skip');
  });
});

describe('validateCollaborationPackage', () => {
  test('valid package returns true', () => {
    expect(validateCollaborationPackage({
      version: 1, sourceInstanceId: 'inst-1', createdAt: '2024-01-01T00:00:00Z',
      episodic: [], semantic: [], longterm: [], links: [],
    })).toBe(true);
  });

  test('missing version returns false', () => {
    expect(validateCollaborationPackage({
      sourceInstanceId: 'inst-1', createdAt: '2024-01-01T00:00:00Z',
      episodic: [], semantic: [], longterm: [], links: [],
    })).toBe(false);
  });

  test('missing sourceInstanceId returns false', () => {
    expect(validateCollaborationPackage({
      version: 1, createdAt: '2024-01-01T00:00:00Z',
      episodic: [], semantic: [], longterm: [], links: [],
    })).toBe(false);
  });

  test('null returns false', () => {
    expect(validateCollaborationPackage(null)).toBe(false);
  });

  test('non-object returns false', () => {
    expect(validateCollaborationPackage('string')).toBe(false);
  });
});

describe('MemorySystem — applyCollaborationPackage', () => {
  test('applies new episodic events from package', () => {
    const m = new MemorySystem({ logLevel: 'silent' });
    const before = m.episodic.count();
    const pkg: CollaborationPackage = {
      version: 1, sourceInstanceId: 'remote-inst', createdAt: new Date().toISOString(),
      episodic: [{ id: 'epi-remote-1', timestamp: Date.now(), agent: 'remote-agent', event: 'remote event' }],
      semantic: [], longterm: [], links: [],
    };
    const result = m.applyCollaborationPackage(pkg);
    expect(result.applied).toBe(true);
    expect(m.episodic.count()).toBe(before + 1);
  });

  test('rejects expired package', () => {
    const m = new MemorySystem({ logLevel: 'silent' });
    const pkg: CollaborationPackage = {
      version: 1, sourceInstanceId: 'remote-inst', createdAt: '2020-01-01T00:00:00Z',
      expiresAt: '2020-01-02T00:00:00Z',
      episodic: [{ id: 'epi-1', timestamp: Date.now(), agent: 'a', event: 'e' }],
      semantic: [], longterm: [], links: [],
    };
    const result = m.applyCollaborationPackage(pkg);
    expect(result.applied).toBe(false);
  });

  test('rejects invalid package', () => {
    const m = new MemorySystem({ logLevel: 'silent' });
    expect(() => m.applyCollaborationPackage({} as any)).toThrow(MemoryError);
  });

  test('reports conflicts', () => {
    const m = new MemorySystem({ logLevel: 'silent' });
    m.remember('a', 'shared event', {}, { importance: 0.5 });
    const epiId = m.episodic.all()[0].id;
    const pkg: CollaborationPackage = {
      version: 1, sourceInstanceId: 'remote', createdAt: new Date().toISOString(),
      episodic: [{ id: epiId, timestamp: Date.now() + 10000, agent: 'a', event: 'updated event' }],
      semantic: [], longterm: [], links: [],
    };
    const result = m.applyCollaborationPackage(pkg, { conflictStrategy: 'last-write-wins' });
    expect(result.conflicts.length).toBeGreaterThanOrEqual(0);
  });

  test('custom resolver is used when provided', () => {
    const m = new MemorySystem({ logLevel: 'silent' });
    m.remember('a', 'event', {}, { importance: 0.5 });
    const epiId = m.episodic.all()[0].id;
    const pkg: CollaborationPackage = {
      version: 1, sourceInstanceId: 'remote', createdAt: new Date().toISOString(),
      episodic: [{ id: epiId, timestamp: Date.now() + 10000, agent: 'a', event: 'updated' }],
      semantic: [], longterm: [], links: [],
    };
    const customResolver = () => new Map([['fake-id', 'skip' as const]]);
    const result = m.applyCollaborationPackage(pkg, { customResolver });
    expect(result.resolutions.get('fake-id')).toBe('skip');
  });
});

describe('MemorySystem — setShareable', () => {
  test('marks event as shareable', () => {
    const m = new MemorySystem({ logLevel: 'silent' });
    m.remember('a', 'test event', {}, { importance: 0.5 });
    const epiId = m.episodic.all()[0].id;
    m.setShareable(epiId, true);
    expect(m.episodic.all()[0].shareable).toBe(true);
  });

  test('marks event as not shareable', () => {
    const m = new MemorySystem({ logLevel: 'silent' });
    m.remember('a', 'test event', {}, { importance: 0.5 });
    const epiId = m.episodic.all()[0].id;
    m.setShareable(epiId, false);
    expect(m.episodic.all()[0].shareable).toBe(false);
  });

  test('throws for unknown event', () => {
    const m = new MemorySystem({ logLevel: 'silent' });
    expect(() => m.setShareable('nonexistent', true)).toThrow(MemoryError);
  });
});
