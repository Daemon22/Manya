import {
  exportSnapshot, importSnapshot, exportEpisodic, exportSemantic, mergeImport,
} from '@manya-os/memory';
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

describe('import/export', () => {
  describe('exportSnapshot and importSnapshot', () => {
    test('round-trip', () => {
      const snap = makeSnap();
      const json = exportSnapshot(snap);
      const imported = importSnapshot(json);
      expect(imported.schemaVersion).toBe(1);
    });

    test('preserves episodic data', () => {
      const snap = makeSnap({
        episodic: [{ id: 'e1', timestamp: 1, agent: 'a', event: 'x', importance: 0.5 }],
      });
      const json = exportSnapshot(snap);
      const imported = importSnapshot(json);
      expect(imported.episodic).toHaveLength(1);
      expect(imported.episodic[0]!.id).toBe('e1');
    });

    test('preserves semantic data', () => {
      const snap = makeSnap({
        semantic: [{ id: 's1', entity: 'a', attribute: 'b', value: 1, confidence: 1, learnedAt: 1 }],
      });
      const json = exportSnapshot(snap);
      const imported = importSnapshot(json);
      expect(imported.semantic).toHaveLength(1);
    });

    test('importSnapshot throws on invalid JSON', () => {
      expect(() => importSnapshot('{invalid}')).toThrow();
    });

    test('exportSnapshot produces valid JSON', () => {
      const json = exportSnapshot(makeSnap());
      expect(() => JSON.parse(json)).not.toThrow();
    });
  });

  describe('exportEpisodic', () => {
    test('exports only episodic events', () => {
      const snap = makeSnap({
        episodic: [{ id: 'e1', timestamp: 1, agent: 'a', event: 'x', importance: 0.5 }],
        semantic: [{ id: 's1', entity: 'a', attribute: 'b', value: 1, confidence: 1, learnedAt: 1 }],
      });
      const json = exportEpisodic(snap);
      const parsed = JSON.parse(json);
      expect(parsed.type).toBe('episodic');
      expect(parsed.events).toHaveLength(1);
    });
  });

  describe('exportSemantic', () => {
    test('exports only semantic facts', () => {
      const snap = makeSnap({
        episodic: [{ id: 'e1', timestamp: 1, agent: 'a', event: 'x', importance: 0.5 }],
        semantic: [{ id: 's1', entity: 'a', attribute: 'b', value: 1, confidence: 1, learnedAt: 1 }],
      });
      const json = exportSemantic(snap);
      const parsed = JSON.parse(json);
      expect(parsed.type).toBe('semantic');
      expect(parsed.facts).toHaveLength(1);
    });
  });

  describe('mergeImport', () => {
    test('merges episodic import', () => {
      const s = makeSnap({
        episodic: [{ id: 'e1', timestamp: 1, agent: 'a', event: 'x', importance: 0.5 }],
      });
      const json = exportEpisodic(s);
      const merged = mergeImport(makeSnap(), json);
      expect(merged.episodic).toHaveLength(1);
    });

    test('merges semantic import', () => {
      const s = makeSnap({
        semantic: [{ id: 's1', entity: 'a', attribute: 'b', value: 1, confidence: 1, learnedAt: 1 }],
      });
      const json = exportSemantic(s);
      const merged = mergeImport(makeSnap(), json);
      expect(merged.semantic).toHaveLength(1);
    });

    test('deduplicates by id', () => {
      const snap = makeSnap({
        episodic: [{ id: 'e1', timestamp: 1, agent: 'a', event: 'x', importance: 0.5 }],
      });
      const json = exportEpisodic(snap);
      const merged = mergeImport(snap, json);
      expect(merged.episodic).toHaveLength(1);
    });

    test('merges into non-empty base', () => {
      const base = makeSnap({
        episodic: [{ id: 'e1', timestamp: 1, agent: 'a', event: 'x', importance: 0.5 }],
      });
      const importData = makeSnap({
        episodic: [{ id: 'e2', timestamp: 2, agent: 'b', event: 'y', importance: 0.5 }],
      });
      const json = exportEpisodic(importData);
      const merged = mergeImport(base, json);
      expect(merged.episodic).toHaveLength(2);
    });
  });
});
