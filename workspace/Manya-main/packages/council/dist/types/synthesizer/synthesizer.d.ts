/**
 * @manya/council — final decision synthesis.
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
import type { Analysis, Conflict, Consensus, ConsensusLevel, Decision, MinorityOpinion } from '../types.js';
/** Default threshold for distinguishing `'majority'` from `'split'`. */
export declare const DEFAULT_SYNTHESIS_THRESHOLD = 0.6;
/** Strong-consensus threshold (support ratio at or above this is `'strong'`). */
export declare const STRONG_CONSENSUS_RATIO = 0.8;
/** Options accepted by `synthesize`. */
export interface SynthesizeOptions {
    /** Recorded minority opinions to fold into the rationale. */
    minorityOpinions?: MinorityOpinion[];
    /** Override the consensus-threshold for level classification. */
    threshold?: number;
    /** Override the generated decision id. */
    decisionId?: string;
    /** Override the generated-at timestamp (ISO 8601). */
    generatedAt?: string;
    /** Override the decision text (defaults to the consensus decision, or a no-consensus fallback). */
    decision?: string;
}
/**
 * Computes the {@link ConsensusLevel} for the given consensus and analyses.
 * Returns `'none'` when `consensus` is `null`.
 */
export declare function classifyConsensus(consensus: Consensus | null, threshold?: number): ConsensusLevel;
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
export declare function synthesize(problemId: string, consensus: Consensus | null, analyses: Analysis[], conflicts?: Conflict[], options?: SynthesizeOptions): Decision;
//# sourceMappingURL=synthesizer.d.ts.map