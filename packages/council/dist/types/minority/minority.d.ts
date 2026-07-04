/**
 * @manya/council — minority opinion tracking.
 *
 * The {@link MinorityOpinionTracker} is a stateful store for
 * {@link MinorityOpinion} records. Analysts who disagree with the consensus
 * can record a minority opinion (with a position, reasoning, and explicit
 * dissent reason) so that dissent is preserved alongside the decision.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
import type { MinorityOpinion } from '../types.js';
/**
 * Validates a minority opinion structurally. Throws `CouncilError` on invalid
 * fields.
 */
export declare function validateMinorityOpinion(opinion: MinorityOpinion): void;
/**
 * Stateful minority opinion tracker. Records are indexed by problem id and
 * analyst id for fast lookup.
 *
 * Usage:
 * ```ts
 * const tracker = new MinorityOpinionTracker();
 * tracker.record({
 *   id: 'mo1', problemId: 'p1', analystId: 'fin',
 *   position: 'Reject the proposal.', reasoning: 'Cost is too high.',
 *   dissentReason: 'The consensus ignored the budget impact.',
 * });
 * tracker.getForProblem('p1');  // [opinion]
 * ```
 */
export declare class MinorityOpinionTracker {
    private readonly opinions;
    private readonly order;
    private readonly byProblem;
    private readonly byAnalyst;
    /**
     * Validates and stores `opinion`. Throws `CouncilError` when the opinion is
     * malformed or an opinion with the same id has already been recorded.
     */
    record(opinion: MinorityOpinion): this;
    /** Returns the opinion with the given id, or `undefined`. */
    get(id: string): MinorityOpinion | undefined;
    /** Returns all minority opinions for the given problem, in record order. */
    getForProblem(problemId: string): MinorityOpinion[];
    /** Returns all minority opinions by the given analyst, in record order. */
    getByAnalyst(analystId: string): MinorityOpinion[];
    /** Returns all minority opinions in record order. */
    list(): MinorityOpinion[];
    /** Returns the number of opinions stored. */
    size(): number;
}
//# sourceMappingURL=minority.d.ts.map