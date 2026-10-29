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
import { ScoringError } from '../errors.js';

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
export const DEFAULT_OUTLIER_THRESHOLD = 0.25;

/**
 * Validates that `analysis` is a valid Analysis object (structurally). Throws
 * `ScoringError` on invalid input.
 */
function assertAnalysis(analysis: unknown): asserts analysis is Analysis {
  if (!analysis || typeof analysis !== 'object') {
    throw new ScoringError('analysis must be an object');
  }
  const a = analysis as Partial<Analysis>;
  if (typeof a.id !== 'string' || a.id.length === 0) {
    throw new ScoringError('analysis.id must be a non-empty string');
  }
  if (typeof a.specialistId !== 'string' || a.specialistId.length === 0) {
    throw new ScoringError('analysis.specialistId must be a non-empty string');
  }
  if (typeof a.confidence !== 'number' || !Number.isFinite(a.confidence) ||
      a.confidence < 0 || a.confidence > 1) {
    throw new ScoringError('analysis.confidence must be a finite number in [0, 1]');
  }
}

/**
 * Returns a single weighted score: `analysis.confidence × specialistWeight`.
 * Throws `ScoringError` when either input is invalid.
 */
export function scoreAnalysis(analysis: Analysis, specialistWeight: number): WeightedScore {
  assertAnalysis(analysis);
  if (typeof specialistWeight !== 'number' || !Number.isFinite(specialistWeight) || specialistWeight < 0) {
    throw new ScoringError('specialistWeight must be a non-negative finite number');
  }
  return {
    analysisId: analysis.id,
    raw: analysis.confidence,
    weight: specialistWeight,
    weighted: analysis.confidence * specialistWeight,
  };
}

/**
 * Aggregates a set of analyses into a combined confidence and dispersion
 * statistics. `weights` is a map of `specialistId → weight`. Throws
 * `ScoringError` when a specialist's weight is missing or invalid.
 *
 * Returns `{ combined: 0, variance: 0, stddev: 0, total: 0, weighted: [] }`
 * when `analyses` is empty.
 */
export function aggregateScores(
  analyses: Analysis[],
  weights: Record<string, number>,
): AggregatedScore {
  if (!Array.isArray(analyses)) throw new ScoringError('analyses must be an array');
  if (!weights || typeof weights !== 'object') {
    throw new ScoringError('weights must be an object');
  }
  if (analyses.length === 0) {
    return { combined: 0, variance: 0, stddev: 0, total: 0, weighted: [] };
  }
  const weighted: number[] = [];
  let totalWeight = 0;
  let weightedSum = 0;
  for (const a of analyses) {
    assertAnalysis(a);
    const w = weights[a.specialistId];
    if (typeof w !== 'number' || !Number.isFinite(w) || w < 0) {
      throw new ScoringError(`missing or invalid weight for specialist ${a.specialistId}`);
    }
    const ws = a.confidence * w;
    weighted.push(ws);
    weightedSum += ws;
    totalWeight += w;
  }
  const combined = totalWeight > 0 ? weightedSum / totalWeight : 0;
  // Population variance of the raw confidences.
  const mean = analyses.reduce((s, a) => s + a.confidence, 0) / analyses.length;
  const variance = analyses.reduce((s, a) => s + (a.confidence - mean) ** 2, 0) / analyses.length;
  return {
    combined,
    variance,
    stddev: Math.sqrt(variance),
    total: analyses.length,
    weighted,
  };
}

/**
 * Returns analyses whose confidence deviates from the median by more than
 * `threshold` (absolute difference). Returns `[]` when fewer than two
 * analyses are provided. The default threshold is
 * {@link DEFAULT_OUTLIER_THRESHOLD}.
 */
export function detectOutliers(
  analyses: Analysis[],
  threshold: number = DEFAULT_OUTLIER_THRESHOLD,
): Analysis[] {
  if (!Array.isArray(analyses)) throw new ScoringError('analyses must be an array');
  if (typeof threshold !== 'number' || !Number.isFinite(threshold) || threshold < 0) {
    throw new ScoringError('threshold must be a non-negative finite number');
  }
  if (analyses.length < 2) return [];
  for (const a of analyses) assertAnalysis(a);
  const sorted = [...analyses].sort((a, b) => a.confidence - b.confidence);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 0
    ? (sorted[mid - 1].confidence + sorted[mid].confidence) / 2
    : sorted[mid].confidence;
  return analyses.filter((a) => Math.abs(a.confidence - median) > threshold);
}
