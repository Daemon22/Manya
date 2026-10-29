import {
  createBackup, verifyBackup, restoreBackup, serializeBackup, parseBackup,
  BackupError,
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

describe('backup', () => {
  describe('createBackup and verifyBackup', () => {
    test('creates and verifies backup', () => {
      const snap = makeSnap();
      const b = createBackup(snap);
      expect(verifyBackup(b)).toBe(true);
    });

    test('backup has correct schema version', () => {
      const b = createBackup(makeSnap());
      expect(b.schemaVersion).toBe(1);
    });

    test('backup has a hash string', () => {
      const b = createBackup(makeSnap());
      expect(typeof b.hash).toBe('string');
      expect(b.hash.length).toBeGreaterThan(0);
    });

    test('backup has takenAt timestamp', () => {
      const b = createBackup(makeSnap());
      expect(typeof b.takenAt).toBe('string');
    });
  });

  describe('verifyBackup', () => {
    test('verifyBackup fails on tampering', () => {
      const b = createBackup(makeSnap());
      b.snapshot.takenAt = 'tampered';
      expect(verifyBackup(b)).toBe(false);
    });

    test('verifyBackup fails on tampered hash', () => {
      const b = createBackup(makeSnap());
      b.hash = 'tampered_hash';
      expect(verifyBackup(b)).toBe(false);
    });
  });

  describe('restoreBackup', () => {
    test('restoreBackup returns snapshot', () => {
      const b = createBackup(makeSnap());
      const restored = restoreBackup(b);
      expect(restored.schemaVersion).toBe(1);
    });

    test('restoreBackup returns deep clone', () => {
      const snap = makeSnap({
        episodic: [{ id: 'e1', timestamp: 1, agent: 'a', event: 'x', importance: 0.5 }],
      });
      const b = createBackup(snap);
      const restored = restoreBackup(b);
      restored.episodic[0]!.event = 'modified';
      expect(b.snapshot.episodic[0]!.event).toBe('x');
    });
  });

  describe('serializeBackup and parseBackup', () => {
    test('round-trip', () => {
      const b = createBackup(makeSnap());
      const json = serializeBackup(b);
      const parsed = parseBackup(json);
      expect(parsed.hash).toBe(b.hash);
      expect(parsed.schemaVersion).toBe(1);
    });

    test('serialize produces valid JSON', () => {
      const b = createBackup(makeSnap());
      const json = serializeBackup(b);
      expect(() => JSON.parse(json)).not.toThrow();
    });

    test('parseBackup throws on invalid JSON', () => {
      expect(() => parseBackup('{invalid}')).toThrow();
    });
  });
});
