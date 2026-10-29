/**
 * @manya/council — weighted confidence scoring.
 *
 * Provides three free functions:
 *
 *   - `scoreAnalysis(analysis, specialistWeight)` returns a single weighted
 *     score (`confidence × weight`).
 *   - `aggregateScores(analyses, weights)` returns the weighted mean of all
 *     confidences plus the variance and standard deviation of the raw
 *     confidences (so callers can gauge dispersion).
 *   - `detectOutliers(analyses, threshold)` returns analyses whose confidence
 *     deviates from the median by more than `threshold`.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
import type { Analysis } from '../types.js';
/** A single weighted score. */
export interface WeightedScore {
    /** Id of the analysis this score is for. */
    analysisId: string;
    /** Raw confidence from the analysis. */
    raw: number;
    /** Specialist weight applied. */
    weight: number;
    /** `raw × weight`. */
    weighted: number;
}
/** Result of `aggregateScores`: combined confidence plus dispersion. */
export interface AggregatedScore {
    /** Weighted mean of confidences (`Σ confidence×weight / Σ weight`). */
    combined: number;
    /** Variance of the raw confidences (population variance). */
    variance: number;
    /** Standard deviation of the raw confidences. */
    stddev: number;
    /** Number of analyses aggregated. */
    total: number;
    /** Per-analysis weighted scores (`confidence×weight`), in input order. */
    weighted: number[];
}
/** Default outlier deviation threshold. */
export declare const DEFAULT_OUTLIER_THRESHOLD = 0.25;
/**
 * Returns a single weighted score: `analysis.confidence × specialistWeight`.
 * Throws `ScoringError` when either input is invalid.
 */
export declare function scoreAnalysis(analysis: Analysis, specialistWeight: number): WeightedScore;
/**
 * Aggregates a set of analyses into a combined confidence and dispersion
 * statistics. `weights` is a map of `specialistId → weight`. Throws
 * `ScoringError` when a specialist's weight is missing or invalid.
 *
 * Returns `{ combined: 0, variance: 0, stddev: 0, total: 0, weighted: [] }`
 * when `analyses` is empty.
 */
export declare function aggregateScores(analyses: Analysis[], weights: Record<string, number>): AggregatedScore;
/**
 * Returns analyses whose confidence deviates from the median by more than
 * `threshold` (absolute difference). Returns `[]` when fewer than two
 * analyses are provided. The default threshold is
 * {@link DEFAULT_OUTLIER_THRESHOLD}.
 */
export declare function detectOutliers(analyses: Analysis[], threshold?: number): Analysis[];
//# sourceMappingURL=scoring.d.ts.map