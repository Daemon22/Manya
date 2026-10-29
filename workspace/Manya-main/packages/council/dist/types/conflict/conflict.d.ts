/**
 * @manya/council — conflict detection.
 *
 * The {@link ConflictDetector} scans a set of {@link Analysis} objects (grouped
 * by `problemId`) and detects three kinds of pairwise conflict:
 *
 *   1. `opposing_conclusion`  — both analyses have confidence > 0.6 and
 *      opposite polarities (positive vs negative) inferred from their
 *      `content` text.
 *   2. `factual_contradiction` — analyses whose `content` overlaps
 *      substantially (Jaccard ≥ 0.3) AND have opposite polarities, regardless
 *      of confidence.
 *   3. `divergent_reasoning`  — analyses with the SAME polarity but whose
 *      `reasoning` texts overlap very little (Jaccard < 0.2), suggesting the
 *      same conclusion was reached via different paths.
 *
 * Severity is `high` when 3+ analyses are involved or the confidence gap is
 * ≥ 0.5; `medium` when the confidence gap is ≥ 0.2; `low` otherwise. Pairwise
 * conflicts always involve exactly 2 analyses, so the 3+ rule is reserved for
 * future expansion.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
import type { Analysis, Conflict, ConflictSeverity, ConflictType } from '../types.js';
/** All valid conflict types. */
export declare const CONFLICT_TYPES: ReadonlyArray<ConflictType>;
/** All valid conflict severities, least-to-most severe. */
export declare const CONFLICT_SEVERITIES: ReadonlyArray<ConflictSeverity>;
/** Minimum confidence (exclusive) for both analyses in an `opposing_conclusion` conflict. */
export declare const OPPOSING_CONFIDENCE_THRESHOLD = 0.6;
/** Minimum content-overlap Jaccard for a `factual_contradiction` conflict. */
export declare const FACTUAL_OVERLAP_THRESHOLD = 0.3;
/** Maximum reasoning-overlap Jaccard for a `divergent_reasoning` conflict. */
export declare const DIVERGENT_REASONING_MAX_OVERLAP = 0.2;
/** Minimum content-overlap Jaccard for a `divergent_reasoning` conflict. */
export declare const DIVERGENT_CONTENT_MIN_OVERLAP = 0.1;
/** Confidence-gap thresholds used to compute severity. */
export declare const SEVERITY_HIGH_GAP = 0.5;
export declare const SEVERITY_MEDIUM_GAP = 0.2;
/**
 * Computes the severity of a conflict based on the number of analyses involved
 * and the confidence gap between them.
 */
export declare function severityFor(numAnalyses: number, confidenceGap: number): ConflictSeverity;
/**
 * Conflict detector. Stateless; safe to reuse across many `detect` calls.
 *
 * Usage:
 * ```ts
 * const detector = new ConflictDetector();
 * const conflicts = detector.detect(analyses);
 * ```
 */
export declare class ConflictDetector {
    /**
     * Scans `analyses` and returns every detected conflict. Conflicts are
     * pairwise and tagged by `type`. The returned array is sorted by type then
     * by the ids of the analyses involved for deterministic output.
     */
    detect(analyses: Analysis[]): Conflict[];
}
//# sourceMappingURL=conflict.d.ts.map