/**
 * @manya/council — conflict detection.
 *
 * The {@link ConflictDetector} scans a set of {@link Analysis} objects (grouped
 * by `problemId`) and detects three kinds of pairwise conflict:
 *
 *   1. `opposing_conclusion`  — both analyses have confidence > 0.6 and
 *      opposite polarities (positive vs negative) inferred from their
 *      `content` text.
 *   2. `factual_contradiction` — analyses whose `content` overlaps
 *      substantially (Jaccard ≥ 0.3) AND have opposite polarities, regardless
 *      of confidence.
 *   3. `divergent_reasoning`  — analyses with the SAME polarity but whose
 *      `reasoning` texts overlap very little (Jaccard < 0.2), suggesting the
 *      same conclusion was reached via different paths.
 *
 * Severity is `high` when 3+ analyses are involved or the confidence gap is
 * ≥ 0.5; `medium` when the confidence gap is ≥ 0.2; `low` otherwise. Pairwise
 * conflicts always involve exactly 2 analyses, so the 3+ rule is reserved for
 * future expansion.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import type { Analysis, Conflict, ConflictSeverity, ConflictType } from '../types.js';
import { ConflictError } from '../errors.js';
import { jaccard, polarity, tokenSet } from '../util.js';

/** All valid conflict types. */
export const CONFLICT_TYPES: ReadonlyArray<ConflictType> = [
  'opposing_conclusion', 'factual_contradiction', 'divergent_reasoning',
];

/** All valid conflict severities, least-to-most severe. */
export const CONFLICT_SEVERITIES: ReadonlyArray<ConflictSeverity> = [
  'low', 'medium', 'high',
];

/** Minimum confidence (exclusive) for both analyses in an `opposing_conclusion` conflict. */
export const OPPOSING_CONFIDENCE_THRESHOLD = 0.6;

/** Minimum content-overlap Jaccard for a `factual_contradiction` conflict. */
export const FACTUAL_OVERLAP_THRESHOLD = 0.3;

/** Maximum reasoning-overlap Jaccard for a `divergent_reasoning` conflict. */
export const DIVERGENT_REASONING_MAX_OVERLAP = 0.2;

/** Minimum content-overlap Jaccard for a `divergent_reasoning` conflict. */
export const DIVERGENT_CONTENT_MIN_OVERLAP = 0.1;

/** Confidence-gap thresholds used to compute severity. */
export const SEVERITY_HIGH_GAP = 0.5;
export const SEVERITY_MEDIUM_GAP = 0.2;

/**
 * Computes the severity of a conflict based on the number of analyses involved
 * and the confidence gap between them.
 */
export function severityFor(numAnalyses: number, confidenceGap: number): ConflictSeverity {
  if (numAnalyses >= 3 || confidenceGap >= SEVERITY_HIGH_GAP) return 'high';
  if (confidenceGap >= SEVERITY_MEDIUM_GAP) return 'medium';
  return 'low';
}

/**
 * Conflict detector. Stateless; safe to reuse across many `detect` calls.
 *
 * Usage:
 * ```ts
 * const detector = new ConflictDetector();
 * const conflicts = detector.detect(analyses);
 * ```
 */
export class ConflictDetector {
  /**
   * Scans `analyses` and returns every detected conflict. Conflicts are
   * pairwise and tagged by `type`. The returned array is sorted by type then
   * by the ids of the analyses involved for deterministic output.
   */
  detect(analyses: Analysis[]): Conflict[] {
    if (!Array.isArray(analyses)) {
      throw new ConflictError('analyses must be an array');
    }
    for (const a of analyses) {
      if (!a || typeof a !== 'object') {
        throw new ConflictError('each analysis must be an object');
      }
      if (typeof a.id !== 'string' || a.id.length === 0) {
        throw new ConflictError('each analysis.id must be a non-empty string');
      }
    }
    const conflicts: Conflict[] = [];
    if (analyses.length < 2) return conflicts;

    // Group analyses by problemId so that cross-problem pairs are not compared.
    const byProblem = new Map<string, Analysis[]>();
    for (const a of analyses) {
      if (!byProblem.has(a.problemId)) byProblem.set(a.problemId, []);
      byProblem.get(a.problemId)!.push(a);
    }

    for (const [problemId, group] of byProblem) {
      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          const a = group[i];
          const b = group[j];
          const pa = polarity(a.content);
          const pb = polarity(b.content);
          const contentOverlap = jaccard(tokenSet(a.content), tokenSet(b.content));
          const reasoningOverlap = jaccard(tokenSet(a.reasoning), tokenSet(b.reasoning));
          const confidenceGap = Math.abs(a.confidence - b.confidence);

          // (a) Opposing conclusions: both > 0.6, opposite polarities.
          if (
            a.confidence > OPPOSING_CONFIDENCE_THRESHOLD &&
            b.confidence > OPPOSING_CONFIDENCE_THRESHOLD &&
            pa !== 'neutral' && pb !== 'neutral' && pa !== pb
          ) {
            conflicts.push({
              id: `conflict-opposing-${a.id}-${b.id}`,
              problemId,
              analysisIds: [a.id, b.id],
              description:
                `Analyses ${a.id} and ${b.id} reach opposing conclusions ` +
                `(${pa} vs ${pb}) with high confidence (> ${OPPOSING_CONFIDENCE_THRESHOLD}).`,
              severity: severityFor(2, confidenceGap),
              type: 'opposing_conclusion',
            });
          }

          // (b) Factual contradiction: substantial content overlap + opposite polarity.
          if (
            contentOverlap >= FACTUAL_OVERLAP_THRESHOLD &&
            pa !== 'neutral' && pb !== 'neutral' && pa !== pb
          ) {
            conflicts.push({
              id: `conflict-factual-${a.id}-${b.id}`,
              problemId,
              analysisIds: [a.id, b.id],
              description:
                `Analyses ${a.id} and ${b.id} make contradictory factual claims ` +
                `about the same subject (content overlap ${contentOverlap.toFixed(2)}).`,
              severity: severityFor(2, confidenceGap),
              type: 'factual_contradiction',
            });
          }

          // (c) Divergent reasoning: same polarity, low reasoning overlap, some content overlap.
          if (
            pa !== 'neutral' && pa === pb &&
            reasoningOverlap < DIVERGENT_REASONING_MAX_OVERLAP &&
            contentOverlap > DIVERGENT_CONTENT_MIN_OVERLAP
          ) {
            conflicts.push({
              id: `conflict-reasoning-${a.id}-${b.id}`,
              problemId,
              analysisIds: [a.id, b.id],
              description:
                `Analyses ${a.id} and ${b.id} reach the same conclusion (${pa}) ` +
                `via divergent reasoning (reasoning overlap ${reasoningOverlap.toFixed(2)}).`,
              severity: severityFor(2, confidenceGap),
              type: 'divergent_reasoning',
            });
          }
        }
      }
    }

    // Deterministic ordering: by type then by id.
    conflicts.sort((x, y) => {
      if (x.type !== y.type) return x.type.localeCompare(y.type);
      return x.id.localeCompare(y.id);
    });
    return conflicts;
  }
}
