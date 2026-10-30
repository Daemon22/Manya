/**
 * @manya-os/attest — trust evaluator.
 *
 * Combines multiple signals — fingerprint stability, hardware presence,
 * attestation validity, session age, prior interactions — into a single
 * trust score in `[0, 1]` with a per-factor breakdown and an overall
 * decision (`trust` / `challenge` / `reject`).
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
import type { TrustEvaluationInputs, TrustFactors, TrustScore, GrantValidityCheck } from '../types.js';
/**
 * Pluggable trust evaluator.
 *
 * Construct with custom {@link TrustFactors} weights to tune the relative
 * importance of each signal. Default weights are {@link DEFAULT_FACTOR_WEIGHTS}.
 *
 * Optionally provide a {@link GrantValidityCheck} callback to allow active
 * capability grants to influence the trust decision. When a valid grant is
 * found, the trust decision is upgraded to 'trust' regardless of the raw score.
 */
export declare class TrustEvaluator {
    private readonly weights;
    private readonly grantCheck?;
    /**
     * @param weights - Per-factor weights. Renormalized to sum to 1.0 if they
     *   don't already (within a small epsilon). Defaults to
     *   {@link DEFAULT_FACTOR_WEIGHTS}.
     * @param grantCheck - Optional callback to check if a capability grant
     *   is valid. When provided, valid grants can upgrade trust decisions.
     */
    constructor(weights?: TrustFactors, grantCheck?: GrantValidityCheck);
    /**
     * Return the active weights (post-normalization).
     */
    getWeights(): TrustFactors;
    /**
     * Evaluate a trust score from raw inputs.
     *
     * @param inputs - The raw trust inputs.
     * @param grantId - Optional capability grant id to check for validity.
     * @param capability - Optional capability string to check against the grant.
     * @returns The computed {@link TrustScore}.
     */
    evaluate(inputs: TrustEvaluationInputs, grantId?: string, capability?: string): TrustScore;
    /**
     * Re-evaluate a trust score from existing factors (skipping the
     * input → factor conversion). Useful for re-deciding an existing score
     * under new weights.
     *
     * @param factors - Pre-computed per-factor contributions.
     * @param grantId - Optional grant id to check.
     * @param capability - Optional capability to check against the grant.
     */
    evaluateFromFactors(factors: TrustFactors, grantId?: string, capability?: string): TrustScore;
    /**
     * Compute only the per-factor contributions (without aggregating).
     * Useful for logging / dashboards.
     */
    factorize(inputs: TrustEvaluationInputs): TrustFactors;
}
/**
 * Default singleton evaluator with {@link DEFAULT_FACTOR_WEIGHTS}.
 */
export declare const defaultTrustEvaluator: TrustEvaluator;
//# sourceMappingURL=evaluator.d.ts.map