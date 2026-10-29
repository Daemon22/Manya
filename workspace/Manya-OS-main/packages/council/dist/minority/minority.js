"use strict";
/**
 * @manya-os/council — minority opinion tracking.
 *
 * The {@link MinorityOpinionTracker} is a stateful store for
 * {@link MinorityOpinion} records. Analysts who disagree with the consensus
 * can record a minority opinion (with a position, reasoning, and explicit
 * dissent reason) so that dissent is preserved alongside the decision.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MinorityOpinionTracker = void 0;
exports.validateMinorityOpinion = validateMinorityOpinion;
const errors_js_1 = require("../errors.js");
/**
 * Validates a minority opinion structurally. Throws `CouncilError` on invalid
 * fields.
 */
function validateMinorityOpinion(opinion) {
    if (!opinion || typeof opinion !== 'object') {
        throw new errors_js_1.CouncilError('minority opinion must be an object');
    }
    if (typeof opinion.id !== 'string' || opinion.id.length === 0) {
        throw new errors_js_1.CouncilError('minority opinion.id must be a non-empty string');
    }
    if (typeof opinion.problemId !== 'string' || opinion.problemId.length === 0) {
        throw new errors_js_1.CouncilError('minority opinion.problemId must be a non-empty string');
    }
    if (typeof opinion.analystId !== 'string' || opinion.analystId.length === 0) {
        throw new errors_js_1.CouncilError('minority opinion.analystId must be a non-empty string');
    }
    if (typeof opinion.position !== 'string' || opinion.position.length === 0) {
        throw new errors_js_1.CouncilError('minority opinion.position must be a non-empty string');
    }
    if (typeof opinion.reasoning !== 'string' || opinion.reasoning.length === 0) {
        throw new errors_js_1.CouncilError('minority opinion.reasoning must be a non-empty string');
    }
    if (typeof opinion.dissentReason !== 'string' || opinion.dissentReason.length === 0) {
        throw new errors_js_1.CouncilError('minority opinion.dissentReason must be a non-empty string');
    }
}
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
class MinorityOpinionTracker {
    opinions = new Map();
    order = [];
    byProblem = new Map();
    byAnalyst = new Map();
    /**
     * Validates and stores `opinion`. Throws `CouncilError` when the opinion is
     * malformed or an opinion with the same id has already been recorded.
     */
    record(opinion) {
        validateMinorityOpinion(opinion);
        if (this.opinions.has(opinion.id)) {
            throw new errors_js_1.CouncilError(`minority opinion already recorded: ${opinion.id}`);
        }
        this.opinions.set(opinion.id, opinion);
        this.order.push(opinion.id);
        if (!this.byProblem.has(opinion.problemId))
            this.byProblem.set(opinion.problemId, []);
        this.byProblem.get(opinion.problemId).push(opinion.id);
        if (!this.byAnalyst.has(opinion.analystId))
            this.byAnalyst.set(opinion.analystId, []);
        this.byAnalyst.get(opinion.analystId).push(opinion.id);
        return this;
    }
    /** Returns the opinion with the given id, or `undefined`. */
    get(id) {
        return this.opinions.get(id);
    }
    /** Returns all minority opinions for the given problem, in record order. */
    getForProblem(problemId) {
        const ids = this.byProblem.get(problemId) ?? [];
        return ids.map((id) => this.opinions.get(id));
    }
    /** Returns all minority opinions by the given analyst, in record order. */
    getByAnalyst(analystId) {
        const ids = this.byAnalyst.get(analystId) ?? [];
        return ids.map((id) => this.opinions.get(id));
    }
    /** Returns all minority opinions in record order. */
    list() {
        return this.order.map((id) => this.opinions.get(id));
    }
    /** Returns the number of opinions stored. */
    size() {
        return this.order.length;
    }
}
exports.MinorityOpinionTracker = MinorityOpinionTracker;
//# sourceMappingURL=minority.js.map