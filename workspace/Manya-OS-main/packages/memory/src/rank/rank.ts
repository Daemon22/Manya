/**
 * @manya-os/memory — retrieval ranking.
 *
 * Combines TF-IDF score, importance, recency, and link-based boost.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import type { RetrievalResult, LongTermRecord, EpisodicEvent } from '../types.js';
import { ageScore } from '../aging/aging.js';

export interface RankingWeights {
  tfidf: number;
  importance: number;
  recency: number;
  access: number;
}

export const DEFAULT_WEIGHTS: RankingWeights = {
  tfidf: 0.4,
  importance: 0.3,
  recency: 0.2,
  access: 0.1,
};

/** Rank long-term records by combining TF-IDF + metadata. */
export function rankLongTerm(
  tfidfScores: Map<string, number>,
  records: LongTermRecord[],
  weights: RankingWeights = DEFAULT_WEIGHTS,
  now: number = Date.now(),
): RetrievalResult<LongTermRecord>[] {
  const maxTfidf = Math.max(1, ...tfidfScores.values());
  const maxAccess = Math.max(1, ...records.map(r => r.accessCount));
  const out: RetrievalResult<LongTermRecord>[] = [];
  for (const r of records) {
    const tfidf = (tfidfScores.get(r.id) ?? 0) / maxTfidf;
    const importance = r.importance;
    const recency = 1 - ageScore(r.lastAccessedAt, now);
    const access = r.accessCount / maxAccess;
    const score = weights.tfidf * tfidf + weights.importance * importance +
      weights.recency * recency + weights.access * access;
    const matchedBy: string[] = [];
    if (tfidf > 0) matchedBy.push('tfidf');
    if (importance > 0.5) matchedBy.push('importance');
    if (recency > 0.5) matchedBy.push('recency');
    out.push({ record: r, score, matchedBy });
  }
  return out.sort((a, b) => b.score - a.score);
}

/** Rank episodic events by query relevance + importance + recency. */
export function rankEpisodic(
  query: string,
  events: EpisodicEvent[],
  weights: { text: number; importance: number; recency: number } = { text: 0.5, importance: 0.2, recency: 0.3 },
  now: number = Date.now(),
): RetrievalResult<EpisodicEvent>[] {
  const q = query.toLowerCase();
  const tokens = q.split(/\s+/).filter(t => t.length > 0);
  const out: RetrievalResult<EpisodicEvent>[] = [];
  for (const e of events) {
    const text = e.event.toLowerCase();
    let textScore = 0;
    for (const t of tokens) {
      if (text.includes(t)) textScore += 1;
    }
    textScore = tokens.length > 0 ? textScore / tokens.length : 0;
    const importance = e.importance ?? 0.5;
    const recency = 1 - ageScore(e.timestamp, now);
    const score = weights.text * textScore + weights.importance * importance + weights.recency * recency;
    const matchedBy: string[] = [];
    if (textScore > 0) matchedBy.push('text');
    if (importance > 0.5) matchedBy.push('importance');
    if (recency > 0.5) matchedBy.push('recency');
    out.push({ record: e, score, matchedBy });
  }
  return out.sort((a, b) => b.score - a.score);
}
