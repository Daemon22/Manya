/**
 * @manya-os/memory — retrieval ranking.
 *
 * Combines TF-IDF score, importance, recency, and link-based boost.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
import type { RetrievalResult, LongTermRecord, EpisodicEvent } from '../types.js';
export interface RankingWeights {
    tfidf: number;
    importance: number;
    recency: number;
    access: number;
}
export declare const DEFAULT_WEIGHTS: RankingWeights;
/** Rank long-term records by combining TF-IDF + metadata. */
export declare function rankLongTerm(tfidfScores: Map<string, number>, records: LongTermRecord[], weights?: RankingWeights, now?: number): RetrievalResult<LongTermRecord>[];
/** Rank episodic events by query relevance + importance + recency. */
export declare function rankEpisodic(query: string, events: EpisodicEvent[], weights?: {
    text: number;
    importance: number;
    recency: number;
}, now?: number): RetrievalResult<EpisodicEvent>[];
//# sourceMappingURL=rank.d.ts.map