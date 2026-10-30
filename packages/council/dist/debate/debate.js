"use strict";
/**
 * @manya-os/council — structured debate.
 *
 * The {@link DebateFacilitator} opens a debate over a set of conflicts, accepts
 * debate rounds (each a claim + evidence, optionally rebutting a prior round),
 * and concludes the debate. Rounds are validated and rebuttals must reference
 * an existing round id.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DebateFacilitator = exports.DEFAULT_MAX_DEBATE_ROUNDS = void 0;
exports.validateRound = validateRound;
const errors_js_1 = require("../errors.js");
/** Default maximum number of rounds per debate. */
exports.DEFAULT_MAX_DEBATE_ROUNDS = 10;
/**
 * Validates a debate round structurally. Throws `DebateError` on invalid
 * fields. Does NOT check `rebuttalTo` against existing rounds (that requires
 * debate context).
 */
function validateRound(round) {
    if (!round || typeof round !== 'object') {
        throw new errors_js_1.DebateError('round must be an object');
    }
    if (typeof round.id !== 'string' || round.id.length === 0) {
        throw new errors_js_1.DebateError('round.id must be a non-empty string');
    }
    if (typeof round.analystId !== 'string' || round.analystId.length === 0) {
        throw new errors_js_1.DebateError('round.analystId must be a non-empty string');
    }
    if (typeof round.claim !== 'string' || round.claim.length === 0) {
        throw new errors_js_1.DebateError('round.claim must be a non-empty string');
    }
    if (typeof round.evidence !== 'string' || round.evidence.length === 0) {
        throw new errors_js_1.DebateError('round.evidence must be a non-empty string');
    }
    if (round.rebuttalTo !== undefined) {
        if (typeof round.rebuttalTo !== 'string' || round.rebuttalTo.length === 0) {
            throw new errors_js_1.DebateError('round.rebuttalTo must be a non-empty string when provided');
        }
    }
}
/**
 * Stateful debate facilitator. Owns a map of debate id → {@link Debate}.
 *
 * Usage:
 * ```ts
 * const facilitator = new DebateFacilitator();
 * const debate = facilitator.open('p1', ['c1']);
 * facilitator.submitRound(debate.id, {
 *   id: 'r1', analystId: 'sec', claim: 'The proposal is sound.',
 *   evidence: 'Tests pass and risks are low.',
 * });
 * facilitator.conclude(debate.id);
 * ```
 */
class DebateFacilitator {
    debates = new Map();
    maxRounds;
    counter = 0;
    /**
     * @param maxRounds Maximum rounds per debate. Defaults to
     * {@link DEFAULT_MAX_DEBATE_ROUNDS}.
     */
    constructor(maxRounds = exports.DEFAULT_MAX_DEBATE_ROUNDS) {
        if (typeof maxRounds !== 'number' || !Number.isFinite(maxRounds) || maxRounds < 1) {
            throw new errors_js_1.DebateError('maxRounds must be a positive finite number');
        }
        this.maxRounds = Math.floor(maxRounds);
    }
    /**
     * Opens a new debate over `problemId` triggered by the given conflict ids.
     * Returns the newly created (empty, status `'open'`) debate.
     */
    open(problemId, conflictIds = []) {
        if (typeof problemId !== 'string' || problemId.length === 0) {
            throw new errors_js_1.DebateError('problemId must be a non-empty string');
        }
        if (!Array.isArray(conflictIds)) {
            throw new errors_js_1.DebateError('conflictIds must be an array');
        }
        for (const c of conflictIds) {
            if (typeof c !== 'string' || c.length === 0) {
                throw new errors_js_1.DebateError('each conflictId must be a non-empty string');
            }
        }
        this.counter += 1;
        const id = `debate-${this.counter}`;
        const debate = {
            id,
            problemId,
            conflictIds: [...conflictIds],
            rounds: [],
            status: 'open',
            openedAt: new Date().toISOString(),
        };
        this.debates.set(id, debate);
        return debate;
    }
    /**
     * Appends `round` to the debate with id `debateId`. Throws `DebateError`
     * when:
     *   - the debate does not exist,
     *   - the debate is already concluded,
     *   - the round is malformed,
     *   - the round's `rebuttalTo` does not reference an existing round,
     *   - a round with the same id already exists in the debate,
     *   - the maximum number of rounds has been reached.
     *
     * Returns the (mutated) debate.
     */
    submitRound(debateId, round) {
        const debate = this.debates.get(debateId);
        if (!debate) {
            throw new errors_js_1.DebateError(`debate not found: ${debateId}`);
        }
        if (debate.status === 'concluded') {
            throw new errors_js_1.DebateError(`debate ${debateId} is already concluded`);
        }
        validateRound(round);
        if (debate.rounds.some((r) => r.id === round.id)) {
            throw new errors_js_1.DebateError(`round already exists in debate ${debateId}: ${round.id}`);
        }
        if (round.rebuttalTo !== undefined) {
            const exists = debate.rounds.some((r) => r.id === round.rebuttalTo);
            if (!exists) {
                throw new errors_js_1.DebateError(`round.rebuttalTo does not reference an existing round: ${round.rebuttalTo}`);
            }
        }
        if (debate.rounds.length >= this.maxRounds) {
            throw new errors_js_1.DebateError(`max rounds (${this.maxRounds}) reached for debate ${debateId}`);
        }
        debate.rounds.push(round);
        return debate;
    }
    /**
     * Concludes the debate with id `debateId`. Sets `status` to `'concluded'`
     * and stamps `concludedAt`. Throws `DebateError` if the debate does not
     * exist or is already concluded. Returns the (mutated) debate.
     */
    conclude(debateId) {
        const debate = this.debates.get(debateId);
        if (!debate) {
            throw new errors_js_1.DebateError(`debate not found: ${debateId}`);
        }
        if (debate.status === 'concluded') {
            throw new errors_js_1.DebateError(`debate ${debateId} is already concluded`);
        }
        debate.status = 'concluded';
        debate.concludedAt = new Date().toISOString();
        return debate;
    }
    /** Returns the debate with the given id, or `undefined`. */
    get(debateId) {
        return this.debates.get(debateId);
    }
    /** Returns all debates, in opening order. */
    list() {
        return Array.from(this.debates.values());
    }
    /** Returns the configured maximum number of rounds per debate. */
    getMaxRounds() {
        return this.maxRounds;
    }
}
exports.DebateFacilitator = DebateFacilitator;
//# sourceMappingURL=debate.js.map