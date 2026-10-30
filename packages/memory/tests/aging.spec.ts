import {
  DEFAULT_AGING_POLICY, mergeAgingPolicy, ageScore,
  effectiveImportance, shouldPruneEpisodic, shouldCompressLongTerm,
} from '@manya-os/memory';
import type { EpisodicEvent, LongTermRecord } from '@manya-os/memory';

describe('aging', () => {
  describe('DEFAULT_AGING_POLICY', () => {
    test('has expected defaults', () => {
      expect(DEFAULT_AGING_POLICY.workingTtlMs).toBe(5 * 60_000);
      expect(DEFAULT_AGING_POLICY.episodicMaxCount).toBe(10_000);
      expect(DEFAULT_AGING_POLICY.episodicPruneThreshold).toBe(0.3);
      expect(DEFAULT_AGING_POLICY.longtermCompressAfterDays).toBe(90);
    });
  });

  describe('mergeAgingPolicy', () => {
    test('returns defaults when no input', () => {
      const result = mergeAgingPolicy();
      expect(result.workingTtlMs).toBe(5 * 60_000);
      expect(result.episodicMaxCount).toBe(10_000);
    });

    test('merges partial policy', () => {
      const result = mergeAgingPolicy({ episodicMaxCount: 500 });
      expect(result.episodicMaxCount).toBe(500);
      expect(result.workingTtlMs).toBe(5 * 60_000);
    });
  });

  describe('ageScore', () => {
    test('ageScore near 0 for fresh', () => {
      expect(ageScore(Date.now())).toBeLessThan(0.1);
    });

    test('ageScore high for ancient', () => {
      expect(ageScore(0)).toBeGreaterThan(0.9);
    });

    test('ageScore is monotonically increasing', () => {
      const now = Date.now();
      const s1 = ageScore(now);
      const s2 = ageScore(now - 86_400_000 * 30);
      const s3 = ageScore(now - 86_400_000 * 90);
      expect(s1).toBeLessThan(s2);
      expect(s2).toBeLessThan(s3);
    });
  });

  describe('effectiveImportance', () => {
    test('decays with age', () => {
      const fresh = { importance: 1.0, createdAt: Date.now(), accessCount: 0 };
      const old = { importance: 1.0, createdAt: 0, accessCount: 0 };
      expect(effectiveImportance(fresh)).toBeGreaterThan(effectiveImportance(old));
    });

    test('boosts with access', () => {
      const low = { importance: 0.5, createdAt: Date.now(), accessCount: 0 };
      const high = { importance: 0.5, createdAt: Date.now(), accessCount: 100 };
      expect(effectiveImportance(high)).toBeGreaterThanOrEqual(effectiveImportance(low));
    });

    test('result is in [0,1]', () => {
      const r = { importance: 0.8, createdAt: 0, accessCount: 5 };
      expect(effectiveImportance(r)).toBeGreaterThanOrEqual(0);
      expect(effectiveImportance(r)).toBeLessThanOrEqual(1);
    });
  });

  describe('shouldPruneEpisodic', () => {
    test('returns true for ancient low-importance event', () => {
      const e: EpisodicEvent = { id: '1', timestamp: 0, agent: 'a', event: 'x', importance: 0.1 };
      expect(shouldPruneEpisodic(e, { workingTtlMs: 0, episodicMaxCount: 1000, episodicPruneThreshold: 0.3, longtermCompressAfterDays: 90 })).toBe(true);
    });

    test('returns false for recent event', () => {
      const e: EpisodicEvent = { id: '1', timestamp: Date.now(), agent: 'a', event: 'x', importance: 0.1 };
      expect(shouldPruneEpisodic(e, { workingTtlMs: 0, episodicMaxCount: 1000, episodicPruneThreshold: 0.3, longtermCompressAfterDays: 90 })).toBe(false);
    });

    test('returns false for high-importance event', () => {
      const e: EpisodicEvent = { id: '1', timestamp: 0, agent: 'a', event: 'x', importance: 0.9 };
      expect(shouldPruneEpisodic(e, { workingTtlMs: 0, episodicMaxCount: 1000, episodicPruneThreshold: 0.3, longtermCompressAfterDays: 90 })).toBe(false);
    });
  });

  describe('shouldCompressLongTerm', () => {
    test('returns true for old low-access record', () => {
      const r: LongTermRecord = {
        id: '1', type: 'longterm', payload: 'x',
        createdAt: Date.now() - 100 * 86_400_000,
        lastAccessedAt: Date.now() - 100 * 86_400_000,
        accessCount: 1, importance: 0.5,
      };
      expect(shouldCompressLongTerm(r, { workingTtlMs: 5 * 60_000, episodicMaxCount: 10_000, episodicPruneThreshold: 0.3, longtermCompressAfterDays: 90 })).toBe(true);
    });

    test('returns false for recent record', () => {
      const r: LongTermRecord = {
        id: '1', type: 'longterm', payload: 'x',
        createdAt: Date.now(),
        lastAccessedAt: Date.now(),
        accessCount: 0, importance: 0.5,
      };
      expect(shouldCompressLongTerm(r, { workingTtlMs: 5 * 60_000, episodicMaxCount: 10_000, episodicPruneThreshold: 0.3, longtermCompressAfterDays: 90 })).toBe(false);
    });

    test('returns false for high-access record', () => {
      const r: LongTermRecord = {
        id: '1', type: 'longterm', payload: 'x',
        createdAt: Date.now() - 100 * 86_400_000,
        lastAccessedAt: Date.now(),
        accessCount: 10, importance: 0.5,
      };
      expect(shouldCompressLongTerm(r, { workingTtlMs: 5 * 60_000, episodicMaxCount: 10_000, episodicPruneThreshold: 0.3, longtermCompressAfterDays: 90 })).toBe(false);
    });
  });
});
