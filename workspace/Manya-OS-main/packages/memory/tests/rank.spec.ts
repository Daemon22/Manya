import {
  rankLongTerm, rankEpisodic, DEFAULT_WEIGHTS,
} from '@manya-os/memory';
import type { LongTermRecord, EpisodicEvent } from '@manya-os/memory';

describe('ranking', () => {
  describe('DEFAULT_WEIGHTS', () => {
    test('has expected values', () => {
      expect(DEFAULT_WEIGHTS).toEqual({
        tfidf: 0.4,
        importance: 0.3,
        recency: 0.2,
        access: 0.1,
      });
    });

    test('weights sum to 1', () => {
      const sum = DEFAULT_WEIGHTS.tfidf + DEFAULT_WEIGHTS.importance + DEFAULT_WEIGHTS.recency + DEFAULT_WEIGHTS.access;
      expect(sum).toBeCloseTo(1.0);
    });
  });

  describe('rankLongTerm', () => {
    test('ranks higher TF-IDF record first', () => {
      const records: LongTermRecord[] = [
        { id: '1', type: 'longterm', payload: 'x', createdAt: Date.now(), lastAccessedAt: Date.now(), accessCount: 10, importance: 0.9 },
        { id: '2', type: 'longterm', payload: 'y', createdAt: 0, lastAccessedAt: 0, accessCount: 0, importance: 0.1 },
      ];
      const tfidf = new Map([['1', 0.8], ['2', 0.1]]);
      const ranked = rankLongTerm(tfidf, records);
      expect(ranked[0].record.id).toBe('1');
    });

    test('returns empty for empty records', () => {
      const tfidf = new Map<string, number>();
      expect(rankLongTerm(tfidf, [])).toHaveLength(0);
    });

    test('ranks by combined score', () => {
      const now = Date.now();
      const records: LongTermRecord[] = [
        { id: '1', type: 'longterm', payload: 'a', createdAt: now, lastAccessedAt: now, accessCount: 100, importance: 0.9 },
        { id: '2', type: 'longterm', payload: 'b', createdAt: 0, lastAccessedAt: 0, accessCount: 0, importance: 0.1 },
      ];
      const tfidf = new Map([['1', 0.5], ['2', 0.5]]);
      const ranked = rankLongTerm(tfidf, records);
      expect(ranked[0].record.id).toBe('1');
    });

    test('accepts custom weights', () => {
      const records: LongTermRecord[] = [
        { id: '1', type: 'longterm', payload: 'a', createdAt: 0, lastAccessedAt: 0, accessCount: 0, importance: 1.0 },
        { id: '2', type: 'longterm', payload: 'b', createdAt: Date.now(), lastAccessedAt: Date.now(), accessCount: 10, importance: 0.1 },
      ];
      const tfidf = new Map([['1', 0.0], ['2', 0.0]]);
      const ranked = rankLongTerm(tfidf, records, { tfidf: 0, importance: 1.0, recency: 0, access: 0 });
      expect(ranked[0].record.id).toBe('1');
    });
  });

  describe('rankEpisodic', () => {
    test('rankEpisodic by query', () => {
      const events: EpisodicEvent[] = [
        { id: '1', timestamp: Date.now(), agent: 'a', event: 'user logged in', importance: 0.5 },
        { id: '2', timestamp: Date.now(), agent: 'a', event: 'system started', importance: 0.5 },
      ];
      const ranked = rankEpisodic('user', events);
      expect(ranked[0].record.id).toBe('1');
    });

    test('returns empty for empty events', () => {
      expect(rankEpisodic('query', [])).toHaveLength(0);
    });

    test('ranks by combined score', () => {
      const now = Date.now();
      const events: EpisodicEvent[] = [
        { id: '1', timestamp: now, agent: 'a', event: 'user login', importance: 0.9 },
        { id: '2', timestamp: 0, agent: 'a', event: 'user logout', importance: 0.1 },
      ];
      const ranked = rankEpisodic('user', events);
      expect(ranked[0].record.id).toBe('1');
    });
  });
});
