/**
 * @manya-os/cortex — confidence estimation.
 *
 * Combines multiple signals (plan confidence, tool reliability, past success
 * rate, evidence count) into a single confidence estimate.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
import type { ConfidenceEstimate } from '../types.js';
export interface ConfidenceFactors {
    /** Plan-level confidence in [0,1]. */
    planConfidence?: number;
    /** Tool reliability in [0,1] (e.g. past success rate). */
    toolReliability?: number;
    /** Number of independent evidence sources. */
    evidenceCount?: number;
    /** Cross-validation rate in [0,1] (fraction of sources that agree). */
    agreementRate?: number;
    /** Domain familiarity in [0,1] (how well-trodden is this kind of task). */
    domainFamiliarity?: number;
}
export declare const DEFAULT_WEIGHTS: {
    planConfidence: number;
    toolReliability: number;
    evidenceCount: number;
    agreementRate: number;
    domainFamiliarity: number;
};
export declare class ConfidenceEstimator {
    private readonly history;
    /** Estimate confidence from factors. */
    estimate(factors: ConfidenceFactors): ConfidenceEstimate;
    /** Record a task outcome (for past-success-rate calibration). */
    recordOutcome(task: string, success: boolean): void;
    /** Past success rate for tasks matching a substring. */
    pastSuccessRate(taskSubstring: string): number;
}
//# sourceMappingURL=confidence.d.ts.map