/**
 * @manya/council — consensus building.
 *
 * The {@link ConsensusBuilder} aggregates a set of analyses (each carrying a
 * polarity inferred from its `content` text and a `confidence` in `[0, 1]`)
 * into a {@link Consensus} decision via weighted voting:
 *
 *   - Each analysis contributes `specialistWeight × confidence` to its
 *     polarity's tally.
 *   - The polarity with the largest tally wins.
 *   - The weighted support ratio is `winnerTally / totalTally`.
 *   - When the ratio is `≥ threshold` (default `0.6`), a {@link Consensus} is
 *     returned; otherwise `null` (no consensus).
 *
 * `conflictsResolved` lists the ids of all conflicts pertaining to the
 * problem; `openIssues` lists high-severity conflicts that remain unresolved.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import type { Analysis, Conflict, Consensus } from '../types.js';
import { ConsensusError } from '../errors.js';
import { polarity } from '../util.js';

/** Default weighted-support threshold for consensus. */
export const DEFAULT_CONSENSUS_THRESHOLD = 0.6;

/** Options accepted by `ConsensusBuilder.build`. */
export interface ConsensusBuildOptions {
  /**
   * Map of `specialistId → weight`. When a specialist's id is not present,
   * weight defaults to `1`. When omitted entirely, every specialist gets
   * weight `1`.
   */
  weights?: Record<string, number>;
  /**
   * Optional list of analyst ids who recorded a minority opinion. These are
   * added to `dissentingAnalystIds` (de-duplicated) so that dissent is
   * reflected even when the analyst's analysis was not strictly opposite in
   * polarity.
   */
  minorityAnalystIds?: string[];
}

/**
 * Consensus builder. Stateless aside from its configured threshold. Safe to
 * reuse across many `build` calls.
 *
 * Usage:
 * ```ts
 * const builder = new ConsensusBuilder(0.6);
 * const consensus = builder.build('p1', analyses, conflicts, {
 *   weights: { sec: 2, fin: 1 },
 * });
 * if (!consensus) console.log('no consensus');
 * ```
 */
export class ConsensusBuilder {
  private readonly threshold: number;

  /**
   * @param threshold Weighted support ratio in `[0, 1]` required to reach
   * consensus. Defaults to {@link DEFAULT_CONSENSUS_THRESHOLD}.
   */
  constructor(threshold: number = DEFAULT_CONSENSUS_THRESHOLD) {
    if (typeof threshold !== 'number' || !Number.isFinite(threshold) ||
        threshold < 0 || threshold > 1) {
      throw new ConsensusError('threshold must be a finite number in [0, 1]');
    }
    this.threshold = threshold;
  }

  /** Returns the configured threshold. */
  getThreshold(): number {
    return this.threshold;
  }

  /**
   * Builds a {@link Consensus} for `problemId` from `analyses` and any
   * detected `conflicts`. Returns `null` when:
   *   - there are no analyses,
   *   - no analysis has a non-`neutral` polarity,
   *   - the weighted support ratio of the winning polarity is below the
   *     configured threshold.
   */
  build(
    problemId: string,
    analyses: Analysis[],
    conflicts: Conflict[] = [],
    options: ConsensusBuildOptions = {},
  ): Consensus | null {
    if (typeof problemId !== 'string' || problemId.length === 0) {
      throw new ConsensusError('problemId must be a non-empty string');
    }
    if (!Array.isArray(analyses)) {
      throw new ConsensusError('analyses must be an array');
    }
    if (!Array.isArray(conflicts)) {
      throw new ConsensusError('conflicts must be an array');
    }
    if (options && typeof options !== 'object') {
      throw new ConsensusError('options must be an object when provided');
    }
    if (analyses.length === 0) return null;

    const weights = options.weights ?? {};
    if (!weights || typeof weights !== 'object') {
      throw new ConsensusError('options.weights must be an object when provided');
    }

    // Filter to analyses with a non-neutral polarity.
    const withPolarity = analyses
      .map((a) => ({ analysis: a, polarity: polarity(a.content) }))
      .filter((x) => x.polarity !== 'neutral');

    if (withPolarity.length === 0) return null;

    // Tally weighted votes per polarity.
    const tally: Record<string, { weight: number; analysts: string[] }> = {};
    let totalWeight = 0;
    for (const { analysis, polarity: pol } of withPolarity) {
      const w = weights[analysis.specialistId];
      if (w !== undefined &&
          (typeof w !== 'number' || !Number.isFinite(w) || w < 0)) {
        throw new ConsensusError(
          `invalid weight for specialist ${analysis.specialistId}`,
        );
      }
      const weight = w ?? 1;
      const contribution = weight * analysis.confidence;
      if (!tally[pol]) tally[pol] = { weight: 0, analysts: [] };
      tally[pol].weight += contribution;
      tally[pol].analysts.push(analysis.specialistId);
      totalWeight += contribution;
    }

    if (totalWeight === 0) return null;

    // Find the winning polarity.
    let winner: 'positive' | 'negative' | null = null;
    let winnerWeight = 0;
    for (const pol of Object.keys(tally) as Array<'positive' | 'negative'>) {
      if (tally[pol].weight > winnerWeight) {
        winnerWeight = tally[pol].weight;
        winner = pol;
      }
    }
    if (!winner) return null;

    const supportRatio = winnerWeight / totalWeight;
    if (supportRatio < this.threshold) return null;

    // Deduplicate analyst ids (a specialist might submit multiple analyses).
    const supportingAnalystIds = Array.from(new Set(tally[winner].analysts));
    const dissentingAnalystIds = Array.from(new Set(
      withPolarity
        .filter((x) => x.polarity !== winner)
        .map((x) => x.analysis.specialistId)
        .concat(options.minorityAnalystIds ?? []),
    ));

    const problemConflicts = conflicts.filter((c) => c.problemId === problemId);
    const conflictsResolved = problemConflicts.map((c) => c.id);
    const openIssues = problemConflicts
      .filter((c) => c.severity === 'high')
      .map((c) => `High-severity conflict ${c.id} remains unresolved: ${c.description}`);

    return {
      problemId,
      decision: winner === 'positive'
        ? `Adopt the proposed action for problem ${problemId}.`
        : `Reject the proposed action for problem ${problemId}.`,
      confidence: supportRatio,
      supportingAnalystIds,
      dissentingAnalystIds,
      conflictsResolved,
      openIssues,
    };
  }
}
