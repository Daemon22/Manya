/**
 * @manya-os/attest — trust model: scores, factors, decision thresholds.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
import type { TrustFactors, TrustScore } from '../types.js';
/** Decision threshold: scores at or above this are `trust`. */
export declare const TRUST_DECISION_THRESHOLD = 0.7;
/** Decision threshold: scores below this are `reject`; in between is `challenge`. */
export declare const CHALLENGE_DECISION_THRESHOLD = 0.3;
/**
 * Default per-factor weights (must sum to 1.0). These are tunable; callers
 * can override them via {@link import('./evaluator.js').TrustEvaluator} constructor.
 */
export declare const DEFAULT_FACTOR_WEIGHTS: TrustFactors;
/**
 * Compute a per-factor contribution (0..1) from the raw inputs.
 *
 * - `fingerprintStability`: `1 - fingerprintDrift` (clamped to [0, 1]).
 * - `hardware`: `1` if hardware is present, `0` otherwise.
 * - `attestation`: `1` if attestation is valid, `0` otherwise.
 * - `sessionAge`: decays from 1 → 0 over a 24-hour window (half-life 1 hour).
 * - `priorInteractions`: log-scaled, saturates at ~100 interactions.
 *
 * @internal
 */
export declare function computeFactors(inputs: {
    fingerprintDrift: number;
    hardwarePresent: boolean;
    attestationValid: boolean;
    sessionAgeMs: number;
    priorInteractions: number;
}): TrustFactors;
/**
 * Compute the weighted aggregate score from per-factor contributions and
 * a weights vector. The weights MUST sum to 1.0 (we renormalize defensively).
 *
 * @internal
 */
export declare function aggregateScore(factors: TrustFactors, weights: TrustFactors): number;
/**
 * Decide the trust decision from a score.
 *
 * - `>= 0.7` → `trust`
 * - `>= 0.3` → `challenge`
 * - `< 0.3` → `reject`
 */
export declare function decideFromScore(score: number): TrustScore['decision'];
/**
 * Construct a {@link TrustScore} from inputs and weights.
 *
 * @internal
 */
export declare function buildTrustScore(inputs: {
    fingerprintDrift: number;
    hardwarePresent: boolean;
    attestationValid: boolean;
    sessionAgeMs: number;
    priorInteractions: number;
}, weights?: TrustFactors): TrustScore;
//# sourceMappingURL=model.d.ts.map