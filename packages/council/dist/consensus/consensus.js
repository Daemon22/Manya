"use strict";
/**
 * @manya-os/council — consensus building.
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConsensusBuilder = exports.DEFAULT_CONSENSUS_THRESHOLD = void 0;
const errors_js_1 = require("../errors.js");
const util_js_1 = require("../util.js");
/** Default weighted-support threshold for consensus. */
exports.DEFAULT_CONSENSUS_THRESHOLD = 0.6;
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
class ConsensusBuilder {
    threshold;
    /**
     * @param threshold Weighted support ratio in `[0, 1]` required to reach
     * consensus. Defaults to {@link DEFAULT_CONSENSUS_THRESHOLD}.
     */
    constructor(threshold = exports.DEFAULT_CONSENSUS_THRESHOLD) {
        if (typeof threshold !== 'number' || !Number.isFinite(threshold) ||
            threshold < 0 || threshold > 1) {
            throw new errors_js_1.ConsensusError('threshold must be a finite number in [0, 1]');
        }
        this.threshold = threshold;
    }
    /** Returns the configured threshold. */
    getThreshold() {
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
    build(problemId, analyses, conflicts = [], options = {}) {
        if (typeof problemId !== 'string' || problemId.length === 0) {
            throw new errors_js_1.ConsensusError('problemId must be a non-empty string');
        }
        if (!Array.isArray(analyses)) {
            throw new errors_js_1.ConsensusError('analyses must be an array');
        }
        if (!Array.isArray(conflicts)) {
            throw new errors_js_1.ConsensusError('conflicts must be an array');
        }
        if (options && typeof options !== 'object') {
            throw new errors_js_1.ConsensusError('options must be an object when provided');
        }
        if (analyses.length === 0)
            return null;
        const weights = options.weights ?? {};
        if (!weights || typeof weights !== 'object') {
            throw new errors_js_1.ConsensusError('options.weights must be an object when provided');
        }
        // Filter to analyses with a non-neutral polarity.
        const withPolarity = analyses
            .map((a) => ({ analysis: a, polarity: (0, util_js_1.polarity)(a.content) }))
            .filter((x) => x.polarity !== 'neutral');
        if (withPolarity.length === 0)
            return null;
        // Tally weighted votes per polarity.
        const tally = {};
        let totalWeight = 0;
        for (const { analysis, polarity: pol } of withPolarity) {
            const w = weights[analysis.specialistId];
            if (w !== undefined &&
                (typeof w !== 'number' || !Number.isFinite(w) || w < 0)) {
                throw new errors_js_1.ConsensusError(`invalid weight for specialist ${analysis.specialistId}`);
            }
            const weight = w ?? 1;
            const contribution = weight * analysis.confidence;
            if (!tally[pol])
                tally[pol] = { weight: 0, analysts: [] };
            tally[pol].weight += contribution;
            tally[pol].analysts.push(analysis.specialistId);
            totalWeight += contribution;
        }
        if (totalWeight === 0)
            return null;
        // Find the winning polarity.
        let winner = null;
        let winnerWeight = 0;
        for (const pol of Object.keys(tally)) {
            if (tally[pol].weight > winnerWeight) {
                winnerWeight = tally[pol].weight;
                winner = pol;
            }
        }
        if (!winner)
            return null;
        const supportRatio = winnerWeight / totalWeight;
        if (supportRatio < this.threshold)
            return null;
        // Deduplicate analyst ids (a specialist might submit multiple analyses).
        const supportingAnalystIds = Array.from(new Set(tally[winner].analysts));
        const dissentingAnalystIds = Array.from(new Set(withPolarity
            .filter((x) => x.polarity !== winner)
            .map((x) => x.analysis.specialistId)
            .concat(options.minorityAnalystIds ?? [])));
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
exports.ConsensusBuilder = ConsensusBuilder;
//# sourceMappingURL=consensus.js.map