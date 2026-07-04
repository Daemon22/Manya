/**
 * @manya/council — independent analysis collection.
 *
 * The {@link AnalysisCollector} is a stateful store for {@link Analysis}
 * objects. Analysts submit analyses; the collector validates, stores, and
 * indexes them by problem id and specialist id for downstream consumption by
 * the scoring, conflict, consensus, reports, and synthesizer modules.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
import type { Analysis } from '../types.js';
/**
 * Validates an `Analysis` structurally. Throws `AnalysisError` on invalid
 * fields.
 */
export declare function validateAnalysis(analysis: Analysis): void;
/**
 * Stateful analysis collector. Submissions are validated, deduplicated by id,
 * and indexed for fast lookup by problem id and specialist id.
 *
 * Usage:
 * ```ts
 * const collector = new AnalysisCollector();
 * collector.submit({ id: 'a1', specialistId: 'sec', problemId: 'p1',
 *   content: 'I recommend we adopt the proposal.', confidence: 0.85,
 *   reasoning: 'The proposal is sound.', caveats: ['assumes budget'] });
 * collector.getAll('p1');     // [analysis]
 * collector.getBySpecialist('sec');  // [analysis]
 * ```
 */
export declare class AnalysisCollector {
    private readonly analyses;
    private readonly order;
    private readonly byProblem;
    private readonly bySpecialist;
    /**
     * Validates and stores `analysis`. Throws `AnalysisError` when the analysis
     * is malformed or an analysis with the same id has already been submitted.
     */
    submit(analysis: Analysis): this;
    /** Returns the analysis with the given id, or `undefined`. */
    get(id: string): Analysis | undefined;
    /** Returns all analyses for the given problem, in submission order. */
    getAll(problemId: string): Analysis[];
    /** Returns all analyses by the given specialist, in submission order. */
    getBySpecialist(specialistId: string): Analysis[];
    /** Returns all analyses in submission order. */
    list(): Analysis[];
    /** Returns the number of analyses stored. */
    size(): number;
}
//# sourceMappingURL=analysis.d.ts.map