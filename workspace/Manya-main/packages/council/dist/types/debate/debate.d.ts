/**
 * @manya/council — structured debate.
 *
 * The {@link DebateFacilitator} opens a debate over a set of conflicts, accepts
 * debate rounds (each a claim + evidence, optionally rebutting a prior round),
 * and concludes the debate. Rounds are validated and rebuttals must reference
 * an existing round id.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
import type { Debate, DebateRound } from '../types.js';
/** Default maximum number of rounds per debate. */
export declare const DEFAULT_MAX_DEBATE_ROUNDS = 10;
/**
 * Validates a debate round structurally. Throws `DebateError` on invalid
 * fields. Does NOT check `rebuttalTo` against existing rounds (that requires
 * debate context).
 */
export declare function validateRound(round: DebateRound): void;
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
export declare class DebateFacilitator {
    private readonly debates;
    private readonly maxRounds;
    private counter;
    /**
     * @param maxRounds Maximum rounds per debate. Defaults to
     * {@link DEFAULT_MAX_DEBATE_ROUNDS}.
     */
    constructor(maxRounds?: number);
    /**
     * Opens a new debate over `problemId` triggered by the given conflict ids.
     * Returns the newly created (empty, status `'open'`) debate.
     */
    open(problemId: string, conflictIds?: string[]): Debate;
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
    submitRound(debateId: string, round: DebateRound): Debate;
    /**
     * Concludes the debate with id `debateId`. Sets `status` to `'concluded'`
     * and stamps `concludedAt`. Throws `DebateError` if the debate does not
     * exist or is already concluded. Returns the (mutated) debate.
     */
    conclude(debateId: string): Debate;
    /** Returns the debate with the given id, or `undefined`. */
    get(debateId: string): Debate | undefined;
    /** Returns all debates, in opening order. */
    list(): Debate[];
    /** Returns the configured maximum number of rounds per debate. */
    getMaxRounds(): number;
}
//# sourceMappingURL=debate.d.ts.map