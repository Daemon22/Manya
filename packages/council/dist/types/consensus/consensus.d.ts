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
/** Default weighted-support threshold for consensus. */
export declare const DEFAULT_CONSENSUS_THRESHOLD = 0.6;
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
export declare class ConsensusBuilder {
    private readonly threshold;
    /**
     * @param threshold Weighted support ratio in `[0, 1]` required to reach
     * consensus. Defaults to {@link DEFAULT_CONSENSUS_THRESHOLD}.
     */
    constructor(threshold?: number);
    /** Returns the configured threshold. */
    getThreshold(): number;
    /**
     * Builds a {@link Consensus} for `problemId` from `analyses` and any
     * detected `conflicts`. Returns `null` when:
     *   - there are no analyses,
     *   - no analysis has a non-`neutral` polarity,
     *   - the weighted support ratio of the winning polarity is below the
     *     configured threshold.
     */
    build(problemId: string, analyses: Analysis[], conflicts?: Conflict[], options?: ConsensusBuildOptions): Consensus | null;
}
//# sourceMappingURL=consensus.d.ts.map