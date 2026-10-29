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

import type {
  Analysis, Conflict, Consensus, ConsensusLevel, Decision, MinorityOpinion,
} from '../types.js';
import { SynthesisError } from '../errors.js';

/** Default threshold for distinguishing `'majority'` from `'split'`. */
export const DEFAULT_SYNTHESIS_THRESHOLD = 0.6;

/** Strong-consensus threshold (support ratio at or above this is `'strong'`). */
export const STRONG_CONSENSUS_RATIO = 0.8;

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
export function classifyConsensus(
  consensus: Consensus | null,
  threshold: number = DEFAULT_SYNTHESIS_THRESHOLD,
): ConsensusLevel {
  if (!consensus) return 'none';
  if (consensus.dissentingAnalystIds.length === 0) return 'unanimous';
  if (consensus.confidence >= STRONG_CONSENSUS_RATIO) return 'strong';
  if (consensus.confidence >= threshold) return 'majority';
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
export function synthesize(
  problemId: string,
  consensus: Consensus | null,
  analyses: Analysis[],
  conflicts: Conflict[] = [],
  options: SynthesizeOptions = {},
): Decision {
  if (typeof problemId !== 'string' || problemId.length === 0) {
    throw new SynthesisError('problemId must be a non-empty string');
  }
  if (!Array.isArray(analyses)) {
    throw new SynthesisError('analyses must be an array');
  }
  if (!Array.isArray(conflicts)) {
    throw new SynthesisError('conflicts must be an array');
  }
  if (consensus !== null && (!consensus || typeof consensus !== 'object')) {
    throw new SynthesisError('consensus must be an object or null');
  }
  const threshold = options.threshold ?? DEFAULT_SYNTHESIS_THRESHOLD;
  if (typeof threshold !== 'number' || !Number.isFinite(threshold) ||
      threshold < 0 || threshold > 1) {
    throw new SynthesisError('threshold must be a finite number in [0, 1]');
  }
  const minorityOpinions = Array.isArray(options.minorityOpinions)
    ? options.minorityOpinions : [];

  const level = classifyConsensus(consensus, threshold);
  const participants = Array.from(new Set(analyses.map((a) => a.specialistId)));
  const decisionText = options.decision ??
    consensus?.decision ??
    `No actionable decision for problem ${problemId}; insufficient consensus.`;
  const confidence = consensus?.confidence ?? 0;

  const rationaleParts: string[] = [];
  if (consensus) {
    rationaleParts.push(
      `Consensus reached with ${consensus.supportingAnalystIds.length} supporting ` +
      `and ${consensus.dissentingAnalystIds.length} dissenting ` +
      `(weighted support ${(consensus.confidence * 100).toFixed(1)}%, level: ${level}).`,
    );
    if (consensus.conflictsResolved.length > 0) {
      rationaleParts.push(
        `${consensus.conflictsResolved.length} conflict${consensus.conflictsResolved.length === 1 ? '' : 's'} considered.`,
      );
    }
    if (consensus.openIssues.length > 0) {
      rationaleParts.push(
        `Open issues: ${consensus.openIssues.join('; ')}`,
      );
    }
  } else {
    rationaleParts.push(
      `No consensus was reached across ${analyses.length} ` +
      `analysis${analyses.length === 1 ? '' : 'ies'}.`,
    );
  }
  if (conflicts.length > 0) {
    rationaleParts.push(
      `${conflicts.length} conflict${conflicts.length === 1 ? '' : 's'} taken into account.`,
    );
  }
  if (minorityOpinions.length > 0) {
    rationaleParts.push(
      `${minorityOpinions.length} minority opinion${minorityOpinions.length === 1 ? '' : 's'} preserved on record.`,
    );
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
