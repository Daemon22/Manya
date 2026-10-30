"use strict";
/**
 * @manya-os/council — final decision synthesis.
 *
 * The {@link synthesize} function takes the {@link Consensus} (if any), the
 * underlying analyses, the detected conflicts, and (optionally) the recorded
 * minority opinions, and produces a {@link Decision} with an explicit
 * confidence and rationale. The decision's `consensusLevel` summarizes the
 * strength of the consensus:
 *
 *   - `'unanimous'` — no dissent at all,
 *   - `'strong'`    — weighted support ≥ 0.8,
 *   - `'majority'`  — weighted support ≥ the threshold (default 0.6),
 *   - `'split'`     — consensus exists but support is weak (below threshold),
 *   - `'none'`      — no consensus was reached.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.STRONG_CONSENSUS_RATIO = exports.DEFAULT_SYNTHESIS_THRESHOLD = void 0;
exports.classifyConsensus = classifyConsensus;
exports.synthesize = synthesize;
const errors_js_1 = require("../errors.js");
/** Default threshold for distinguishing `'majority'` from `'split'`. */
exports.DEFAULT_SYNTHESIS_THRESHOLD = 0.6;
/** Strong-consensus threshold (support ratio at or above this is `'strong'`). */
exports.STRONG_CONSENSUS_RATIO = 0.8;
/**
 * Computes the {@link ConsensusLevel} for the given consensus and analyses.
 * Returns `'none'` when `consensus` is `null`.
 */
function classifyConsensus(consensus, threshold = exports.DEFAULT_SYNTHESIS_THRESHOLD) {
    if (!consensus)
        return 'none';
    if (consensus.dissentingAnalystIds.length === 0)
        return 'unanimous';
    if (consensus.confidence >= exports.STRONG_CONSENSUS_RATIO)
        return 'strong';
    if (consensus.confidence >= threshold)
        return 'majority';
    return 'split';
}
/**
 * Synthesizes a {@link Decision} from the consensus, analyses, conflicts, and
 * (optionally) minority opinions. Throws `SynthesisError` on invalid inputs.
 *
 * Usage:
 * ```ts
 * const decision = synthesize('p1', consensus, analyses, conflicts, {
 *   minorityOpinions: tracker.getForProblem('p1'),
 * });
 * ```
 */
function synthesize(problemId, consensus, analyses, conflicts = [], options = {}) {
    if (typeof problemId !== 'string' || problemId.length === 0) {
        throw new errors_js_1.SynthesisError('problemId must be a non-empty string');
    }
    if (!Array.isArray(analyses)) {
        throw new errors_js_1.SynthesisError('analyses must be an array');
    }
    if (!Array.isArray(conflicts)) {
        throw new errors_js_1.SynthesisError('conflicts must be an array');
    }
    if (consensus !== null && (!consensus || typeof consensus !== 'object')) {
        throw new errors_js_1.SynthesisError('consensus must be an object or null');
    }
    const threshold = options.threshold ?? exports.DEFAULT_SYNTHESIS_THRESHOLD;
    if (typeof threshold !== 'number' || !Number.isFinite(threshold) ||
        threshold < 0 || threshold > 1) {
        throw new errors_js_1.SynthesisError('threshold must be a finite number in [0, 1]');
    }
    const minorityOpinions = Array.isArray(options.minorityOpinions)
        ? options.minorityOpinions : [];
    const level = classifyConsensus(consensus, threshold);
    const participants = Array.from(new Set(analyses.map((a) => a.specialistId)));
    const decisionText = options.decision ??
        consensus?.decision ??
        `No actionable decision for problem ${problemId}; insufficient consensus.`;
    const confidence = consensus?.confidence ?? 0;
    const rationaleParts = [];
    if (consensus) {
        rationaleParts.push(`Consensus reached with ${consensus.supportingAnalystIds.length} supporting ` +
            `and ${consensus.dissentingAnalystIds.length} dissenting ` +
            `(weighted support ${(consensus.confidence * 100).toFixed(1)}%, level: ${level}).`);
        if (consensus.conflictsResolved.length > 0) {
            rationaleParts.push(`${consensus.conflictsResolved.length} conflict${consensus.conflictsResolved.length === 1 ? '' : 's'} considered.`);
        }
        if (consensus.openIssues.length > 0) {
            rationaleParts.push(`Open issues: ${consensus.openIssues.join('; ')}`);
        }
    }
    else {
        rationaleParts.push(`No consensus was reached across ${analyses.length} ` +
            `analysis${analyses.length === 1 ? '' : 'ies'}.`);
    }
    if (conflicts.length > 0) {
        rationaleParts.push(`${conflicts.length} conflict${conflicts.length === 1 ? '' : 's'} taken into account.`);
    }
    if (minorityOpinions.length > 0) {
        rationaleParts.push(`${minorityOpinions.length} minority opinion${minorityOpinions.length === 1 ? '' : 's'} preserved on record.`);
    }
    const generatedAt = options.generatedAt ?? new Date().toISOString();
    const id = options.decisionId ?? `decision-${problemId}-${generatedAt}`;
    return {
        id,
        problemId,
        decision: decisionText,
        rationale: rationaleParts.join(' '),
        confidence,
        consensusLevel: level,
        participants,
        generatedAt,
    };
}
//# sourceMappingURL=synthesizer.js.map