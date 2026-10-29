/**
 * @manya/council — review reports.
 *
 * The reports module aggregates everything the council produced for a single
 * problem — analyses, conflicts, debates, minority opinions, the consensus
 * (if any), and recommendations — into a single {@link ReviewReport}. The
 * report can be serialized to JSON (`serializeReport`) or summarized into a
 * single human-readable paragraph (`summarizeReport`).
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
import type { Analysis, Conflict, Consensus, Debate, MinorityOpinion, ReviewReport } from '../types.js';
/** Inputs to `buildReport`. */
export interface BuildReportInput {
    /** The problem id the report covers. */
    problemId: string;
    /** All analyses included in the review. */
    analyses: Analysis[];
    /** All conflicts detected. Defaults to `[]`. */
    conflicts?: Conflict[];
    /** All debates held. Defaults to `[]`. */
    debates?: Debate[];
    /** All minority opinions recorded. Defaults to `[]`. */
    minorityOpinions?: MinorityOpinion[];
    /** The consensus reached, if any. Defaults to `null`. */
    consensus?: Consensus | null;
    /** Actionable recommendations. Defaults to `[]`. */
    recommendations?: string[];
    /** Optional explicit report id. Auto-generated when omitted. */
    reportId?: string;
    /** Optional explicit generation timestamp (ISO 8601). Defaults to now. */
    generatedAt?: string;
}
/**
 * Builds a {@link ReviewReport} from the given inputs. Defensively copies all
 * array inputs and computes a short summary.
 *
 * Throws `CouncilError` when `problemId` is missing or `analyses` is not an
 * array.
 */
export declare function buildReport(input: BuildReportInput): ReviewReport;
/**
 * Serializes a {@link ReviewReport} to a pretty-printed JSON string. Throws
 * `CouncilError` when serialization fails (e.g. circular references).
 */
export declare function serializeReport(report: ReviewReport): string;
/**
 * Summarizes a {@link ReviewReport} into a single human-readable paragraph.
 */
export declare function summarizeReport(report: ReviewReport): string;
//# sourceMappingURL=reports.d.ts.map