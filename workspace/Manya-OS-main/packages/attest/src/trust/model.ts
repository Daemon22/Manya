/**
 * @manya-os/attest — trust model: scores, factors, decision thresholds.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import type { TrustFactors, TrustScore } from '../types.js';
import { TrustEvaluationError } from '../errors.js';

/** Decision threshold: scores at or above this are `trust`. */
export const TRUST_DECISION_THRESHOLD = 0.7;
/** Decision threshold: scores below this are `reject`; in between is `challenge`. */
export const CHALLENGE_DECISION_THRESHOLD = 0.3;

/**
 * Default per-factor weights (must sum to 1.0). These are tunable; callers
 * can override them via {@link import('./evaluator.js').TrustEvaluator} constructor.
 */
export const DEFAULT_FACTOR_WEIGHTS: TrustFactors = {
  fingerprintStability: 0.30,
  hardware: 0.20,
  attestation: 0.30,
  sessionAge: 0.10,
  priorInteractions: 0.10,
};

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
export function computeFactors(inputs: {
  fingerprintDrift: number;
  hardwarePresent: boolean;
  attestationValid: boolean;
  sessionAgeMs: number;
  priorInteractions: number;
}): TrustFactors {
  if (typeof inputs.fingerprintDrift !== 'number' || !Number.isFinite(inputs.fingerprintDrift)) {
    throw new TrustEvaluationError('fingerprintDrift must be a finite number');
  }
  if (inputs.fingerprintDrift < 0 || inputs.fingerprintDrift > 1) {
    throw new TrustEvaluationError(
      `fingerprintDrift must be in [0, 1], got ${inputs.fingerprintDrift}`
    );
  }
  if (!Number.isInteger(inputs.sessionAgeMs) || inputs.sessionAgeMs < 0) {
    throw new TrustEvaluationError('sessionAgeMs must be a non-negative integer');
  }
  if (!Number.isInteger(inputs.priorInteractions) || inputs.priorInteractions < 0) {
    throw new TrustEvaluationError('priorInteractions must be a non-negative integer');
  }
  // fingerprintStability: exact match → 1, full drift → 0.
  const fingerprintStability = Math.max(0, Math.min(1, 1 - inputs.fingerprintDrift));
  // hardware: binary.
  const hardware = inputs.hardwarePresent ? 1 : 0;
  // attestation: binary.
  const attestation = inputs.attestationValid ? 1 : 0;
  // sessionAge: half-life of 1 hour. At age=0, factor=1. At age=1h, factor=0.5.
  // Decays to 0 over 24h.
  const oneHourMs = 60 * 60 * 1000;
  const decay = Math.pow(0.5, inputs.sessionAgeMs / oneHourMs);
  const sessionAge = Math.max(0, Math.min(1, decay));
  // priorInteractions: log-scaled, saturates at ~100.
  // factor = min(1, log10(1 + n) / 2). At n=0 → 0, n=10 → 0.52, n=100 → 1.0.
  const priorInteractions = Math.max(0, Math.min(1, Math.log10(1 + inputs.priorInteractions) / 2));
  return { fingerprintStability, hardware, attestation, sessionAge, priorInteractions };
}

/**
 * Compute the weighted aggregate score from per-factor contributions and
 * a weights vector. The weights MUST sum to 1.0 (we renormalize defensively).
 *
 * @internal
 */
export function aggregateScore(factors: TrustFactors, weights: TrustFactors): number {
  const score =
    factors.fingerprintStability * weights.fingerprintStability +
    factors.hardware * weights.hardware +
    factors.attestation * weights.attestation +
    factors.sessionAge * weights.sessionAge +
    factors.priorInteractions * weights.priorInteractions;
  // Defensive clamp to [0, 1] (rounding may push slightly outside).
  return Math.max(0, Math.min(1, score));
}

/**
 * Decide the trust decision from a score.
 *
 * - `>= 0.7` → `trust`
 * - `>= 0.3` → `challenge`
 * - `< 0.3` → `reject`
 */
export function decideFromScore(score: number): TrustScore['decision'] {
  if (typeof score !== 'number' || !Number.isFinite(score)) {
    throw new TrustEvaluationError('decideFromScore: score must be a finite number');
  }
  if (score >= TRUST_DECISION_THRESHOLD) return 'trust';
  if (score >= CHALLENGE_DECISION_THRESHOLD) return 'challenge';
  return 'reject';
}

/**
 * Construct a {@link TrustScore} from inputs and weights.
 *
 * @internal
 */
export function buildTrustScore(
  inputs: {
    fingerprintDrift: number;
    hardwarePresent: boolean;
    attestationValid: boolean;
    sessionAgeMs: number;
    priorInteractions: number;
  },
  weights: TrustFactors = DEFAULT_FACTOR_WEIGHTS
): TrustScore {
  const factors = computeFactors(inputs);
  const score = aggregateScore(factors, weights);
  const decision = decideFromScore(score);
  return { score, factors, decision };
}
