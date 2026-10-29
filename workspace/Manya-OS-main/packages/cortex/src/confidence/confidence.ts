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
import { ConfidenceError } from '../errors.js';

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

export const DEFAULT_WEIGHTS = {
  planConfidence: 0.25,
  toolReliability: 0.25,
  evidenceCount: 0.15,
  agreementRate: 0.25,
  domainFamiliarity: 0.10,
};

export class ConfidenceEstimator {
  private readonly history: Array<{ task: string; success: boolean }> = [];

  /** Estimate confidence from factors. */
  estimate(factors: ConfidenceFactors): ConfidenceEstimate {
    const w = DEFAULT_WEIGHTS;
    const contributions: ConfidenceEstimate['factors'] = [];
    let confidence = 0;
    let totalWeight = 0;

    if (factors.planConfidence !== undefined) {
      const c = factors.planConfidence * w.planConfidence;
      confidence += c;
      totalWeight += w.planConfidence;
      contributions.push({ name: 'planConfidence', weight: w.planConfidence, contribution: c });
    }
    if (factors.toolReliability !== undefined) {
      const c = factors.toolReliability * w.toolReliability;
      confidence += c;
      totalWeight += w.toolReliability;
      contributions.push({ name: 'toolReliability', weight: w.toolReliability, contribution: c });
    }
    if (factors.evidenceCount !== undefined) {
      // Diminishing returns: log2(N+1) / 4 caps at ~1 around 15 sources.
      const norm = Math.min(1, Math.log2((factors.evidenceCount || 0) + 1) / 4);
      const c = norm * w.evidenceCount;
      confidence += c;
      totalWeight += w.evidenceCount;
      contributions.push({ name: 'evidenceCount', weight: w.evidenceCount, contribution: c });
    }
    if (factors.agreementRate !== undefined) {
      const c = factors.agreementRate * w.agreementRate;
      confidence += c;
      totalWeight += w.agreementRate;
      contributions.push({ name: 'agreementRate', weight: w.agreementRate, contribution: c });
    }
    if (factors.domainFamiliarity !== undefined) {
      const c = factors.domainFamiliarity * w.domainFamiliarity;
      confidence += c;
      totalWeight += w.domainFamiliarity;
      contributions.push({ name: 'domainFamiliarity', weight: w.domainFamiliarity, contribution: c });
    }

    if (totalWeight === 0) throw new ConfidenceError('at least one factor is required');
    const final = confidence / totalWeight;
    const reasoning = contributions.map(c => `${c.name}=${c.contribution.toFixed(3)}`).join(', ');
    return {
      confidence: Math.max(0, Math.min(1, final)),
      reasoning: `Weighted sum: ${reasoning} (total weight ${totalWeight.toFixed(2)})`,
      factors: contributions,
    };
  }

  /** Record a task outcome (for past-success-rate calibration). */
  recordOutcome(task: string, success: boolean): void {
    this.history.push({ task, success });
  }

  /** Past success rate for tasks matching a substring. */
  pastSuccessRate(taskSubstring: string): number {
    const matching = this.history.filter(h => h.task.includes(taskSubstring));
    if (matching.length === 0) return 0.5; // unknown → neutral
    return matching.filter(m => m.success).length / matching.length;
  }
}
