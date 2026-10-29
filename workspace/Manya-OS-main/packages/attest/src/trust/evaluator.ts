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
import { TrustEvaluationError } from '../errors.js';
import {
  DEFAULT_FACTOR_WEIGHTS,
  aggregateScore,
  buildTrustScore,
  computeFactors,
  decideFromScore,
} from './model.js';

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
export class TrustEvaluator {
  private readonly weights: TrustFactors;
  private readonly grantCheck?: GrantValidityCheck;

  /**
   * @param weights - Per-factor weights. Renormalized to sum to 1.0 if they
   *   don't already (within a small epsilon). Defaults to
   *   {@link DEFAULT_FACTOR_WEIGHTS}.
   * @param grantCheck - Optional callback to check if a capability grant
   *   is valid. When provided, valid grants can upgrade trust decisions.
   */
  constructor(weights: TrustFactors = DEFAULT_FACTOR_WEIGHTS, grantCheck?: GrantValidityCheck) {
    this.weights = normalizeWeights(weights);
    this.grantCheck = grantCheck;
  }

  /**
   * Return the active weights (post-normalization).
   */
  getWeights(): TrustFactors {
    return { ...this.weights };
  }

  /**
   * Evaluate a trust score from raw inputs.
   *
   * @param inputs - The raw trust inputs.
   * @param grantId - Optional capability grant id to check for validity.
   * @param capability - Optional capability string to check against the grant.
   * @returns The computed {@link TrustScore}.
   */
  evaluate(inputs: TrustEvaluationInputs, grantId?: string, capability?: string): TrustScore {
    let score = buildTrustScore(inputs, this.weights);

    // Check grant validity and potentially upgrade the decision.
    if (grantId && capability && this.grantCheck) {
      if (this.grantCheck(grantId, capability)) {
        score = {
          ...score,
          decision: 'trust',
          grantInfluence: grantId,
        };
      }
    }

    return score;
  }

  /**
   * Re-evaluate a trust score from existing factors (skipping the
   * input → factor conversion). Useful for re-deciding an existing score
   * under new weights.
   *
   * @param factors - Pre-computed per-factor contributions.
   * @param grantId - Optional grant id to check.
   * @param capability - Optional capability to check against the grant.
   */
  evaluateFromFactors(factors: TrustFactors, grantId?: string, capability?: string): TrustScore {
    const score = aggregateScore(factors, this.weights);
    let decision = decideFromScore(score);
    let grantInfluence: string | undefined;

    if (grantId && capability && this.grantCheck) {
      if (this.grantCheck(grantId, capability)) {
        decision = 'trust';
        grantInfluence = grantId;
      }
    }

    return { score, factors, decision, grantInfluence };
  }

  /**
   * Compute only the per-factor contributions (without aggregating).
   * Useful for logging / dashboards.
   */
  factorize(inputs: TrustEvaluationInputs): TrustFactors {
    return computeFactors(inputs);
  }
}

/**
 * Renormalize a weights vector to sum to 1.0. Throws if all weights are zero
 * or negative, or if any weight is negative.
 *
 * @internal
 */
function normalizeWeights(weights: TrustFactors): TrustFactors {
  const w: TrustFactors = { ...weights };
  for (const key of Object.keys(w) as (keyof TrustFactors)[]) {
    if (typeof w[key] !== 'number' || !Number.isFinite(w[key]) || w[key] < 0) {
      throw new TrustEvaluationError(
        `normalizeWeights: weight ${key} must be a finite non-negative number`
      );
    }
  }
  const sum =
    w.fingerprintStability +
    w.hardware +
    w.attestation +
    w.sessionAge +
    w.priorInteractions;
  if (sum <= 0) {
    throw new TrustEvaluationError('normalizeWeights: weights must sum to > 0');
  }
  // Skip renormalization if already very close to 1.0.
  if (Math.abs(sum - 1) < 1e-9) return w;
  return {
    fingerprintStability: w.fingerprintStability / sum,
    hardware: w.hardware / sum,
    attestation: w.attestation / sum,
    sessionAge: w.sessionAge / sum,
    priorInteractions: w.priorInteractions / sum,
  };
}

/**
 * Default singleton evaluator with {@link DEFAULT_FACTOR_WEIGHTS}.
 */
export const defaultTrustEvaluator = new TrustEvaluator();
