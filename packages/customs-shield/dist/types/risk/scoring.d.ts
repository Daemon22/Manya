/**
 * @manya/customs-shield — risk scoring, cargo risk, vulnerability analysis.
 *
 * Computes a risk score in [0,100] for a shipment based on weighted
 * indicators. Indicators include sanctions hits, embargo violations,
 * license requirements, restricted origins, transshipment through
 * high-risk countries, value/weight anomalies, and documentation gaps.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
import type { Shipment, ShieldFinding } from '../types.js';
/** High-risk transshipment countries (illustrative — production deployments must keep this current). */
export declare const HIGH_RISK_TRANSSHIPMENT: string[];
/** Risk indicator weights (sum ≈ 100). */
export declare const INDICATOR_WEIGHTS: {
    readonly sanctions_country_hit: 45;
    readonly sanctions_hit: 35;
    readonly restriction_violation: 30;
    readonly license_required: 12;
    readonly hs_code_invalid: 10;
    readonly hs_code_mismatch: 6;
    readonly hs_code_suggestion: 2;
    readonly duty_miscalculation: 6;
    readonly documentation_gap: 4;
    readonly vulnerability: 5;
    readonly risk_indicator: 3;
};
/** Detect shipment-level risk indicators (transshipment, value/weight anomalies). */
export declare function detectIndicators(shipment: Shipment): ShieldFinding[];
/** Map a [0,100] score to a band. */
export declare function bandFor(score: number): 'low' | 'moderate' | 'elevated' | 'high' | 'critical';
/** Compute the aggregate risk score from findings. */
export declare function scoreFrom(findings: ShieldFinding[]): {
    score: number;
    band: 'low' | 'moderate' | 'elevated' | 'high' | 'critical';
    holdForReview: boolean;
};
/** Cargo-specific vulnerability analysis. */
export declare function analyzeVulnerabilities(shipment: Shipment): ShieldFinding[];
//# sourceMappingURL=scoring.d.ts.map