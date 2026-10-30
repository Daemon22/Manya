import { computeDelta, applyDelta, SyncError } from '@manya-os/memory';
import type { MemorySnapshot } from '@manya-os/memory';

function makeSnap(overrides?: Partial<MemorySnapshot>): MemorySnapshot {
  return {
    schemaVersion: 1 as const,
    takenAt: '',
    working: [],
    episodic: [],
    semantic: [],
    procedural: [],
    longterm: [],
    links: [],
    permissions: [],
    ...overrides,
  };
}

describe('sync', () => {
  describe('computeDelta', () => {
    test('detects added records', () => {
      const local = makeSnap();
      const remote = makeSnap({
        episodic: [{ id: 'e1', timestamp: Date.now(), agent: 'a', event: 'x', importance: 0.5 }],
      });
      const d = computeDelta(local, remote);
      expect(d.addedEpisodic).toEqual(['e1']);
    });

    test('detects added semantic facts', () => {
      const local = makeSnap();
      const remote = makeSnap({
        semantic: [{ id: 's1', entity: 'a', attribute: 'b', value: 1, confidence: 1, learnedAt: 1 }],
      });
      const d = computeDelta(local, remote);
      expect(d.addedSemantic).toEqual(['s1']);
    });

    test('detects added longterm records', () => {
      const local = makeSnap();
      const remote = makeSnap({
        longterm: [{ id: 'lt1', type: 'longterm', payload: 'x', createdAt: 1, lastAccessedAt: 1, accessCount: 0, importance: 0.5 }],
      });
      const d = computeDelta(local, remote);
      expect(d.addedLongTerm).toEqual(['lt1']);
    });

    test('detects added links', () => {
      const local = makeSnap();
      const remote = makeSnap({
        links: [{ fromId: 'a', toId: 'b', relation: 'causes' }],
      });
      const d = computeDelta(local, remote);
      expect(d.addedLinks).toBe(1);
    });

    test('returns empty delta for identical snapshots', () => {
      const snap = makeSnap({
        episodic: [{ id: 'e1', timestamp: 1, agent: 'a', event: 'x', importance: 0.5 }],
      });
      const d = computeDelta(snap, snap);
      expect(d.addedEpisodic).toHaveLength(0);
      expect(d.addedSemantic).toHaveLength(0);
      expect(d.addedLongTerm).toHaveLength(0);
    });

    test('throws on schema mismatch', () => {
      const local = makeSnap();
      const remote = makeSnap({ schemaVersion: 2 as any });
      expect(() => computeDelta(local, remote)).toThrow(SyncError);
    });
  });

  describe('applyDelta', () => {
    test('merges remote into local', () => {
      const local = makeSnap();
      const remote = makeSnap({
        episodic: [{ id: 'e1', timestamp: Date.now(), agent: 'a', event: 'x', importance: 0.5 }],
      });
      const d = computeDelta(local, remote);
      const merged = applyDelta(local, remote, d);
      expect(merged.episodic).toHaveLength(1);
    });

    test('merges semantic facts', () => {
      const local = makeSnap();
      const remote = makeSnap({
        semantic: [{ id: 's1', entity: 'a', attribute: 'b', value: 1, confidence: 1, learnedAt: 1 }],
      });
      const d = computeDelta(local, remote);
      const merged = applyDelta(local, remote, d);
      expect(merged.semantic).toHaveLength(1);
    });

    test('does not duplicate existing records', () => {
      const snap = makeSnap({
        episodic: [{ id: 'e1', timestamp: 1, agent: 'a', event: 'x', importance: 0.5 }],
      });
      const d = computeDelta(snap, snap);
      const merged = applyDelta(snap, snap, d);
      expect(merged.episodic).toHaveLength(1);
    });
  });
});
