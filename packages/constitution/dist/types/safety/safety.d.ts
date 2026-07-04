/**
 * @manya/constitution — safety rules.
 *
 * A `SafetyRule` carries an `invariant` (a human-readable predicate), an
 * `enforcementPoint` (pre / post / both), and a `severity`. The
 * `SafetyChecker` registers rules and runs pre- and post-checks against a
 * caller-provided predicate. The predicate is given the rule and a context,
 * and returns `{ satisfied: boolean; reason?: string }`.
 *
 * This keeps the safety checker dependency-free: callers encode their
 * invariant logic in a TypeScript function, while the rule itself documents
 * the invariant and severity for audit logs.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
import type { EnforcementPoint, GovernanceContext, SafetyRule, SafetyViolation } from '../types.js';
/**
 * A predicate that evaluates whether a safety rule holds for a given context.
 * Returns `{ satisfied: true }` when the invariant is met, or
 * `{ satisfied: false, reason }` when it is violated.
 */
export type SafetyPredicate = (rule: SafetyRule, context: GovernanceContext) => {
    satisfied: boolean;
    reason?: string;
};
/** All valid enforcement points. */
export declare const ENFORCEMENT_POINTS: ReadonlyArray<EnforcementPoint>;
/**
 * Validates a `SafetyRule` structurally. Throws `SafetyError` on invalid
 * fields.
 */
export declare function validateSafetyRule(rule: SafetyRule): void;
/**
 * The safety checker. Register rules and their evaluation predicates, then
 * call `runPre` / `runPost` (or `assertSafe`) at the appropriate points.
 */
export declare class SafetyChecker {
    private readonly rules;
    private readonly predicates;
    private readonly order;
    /** Registers a rule and its predicate. Throws `SafetyError` on duplicate id. */
    register(rule: SafetyRule, predicate: SafetyPredicate): this;
    /** Removes a rule by id. */
    unregister(id: string): this;
    /** Returns the list of registered rules in insertion order. */
    list(): SafetyRule[];
    /** Returns the rule with the given id, or undefined. */
    get(id: string): SafetyRule | undefined;
    /**
     * Runs all rules whose enforcement point applies to `point` (i.e. `point`
     * itself or `both`). Returns the list of violations.
     */
    run(point: 'pre' | 'post', context: GovernanceContext): SafetyViolation[];
    /** Convenience: runs pre-checks. */
    runPre(context: GovernanceContext): SafetyViolation[];
    /** Convenience: runs post-checks. */
    runPost(context: GovernanceContext): SafetyViolation[];
    /**
     * Runs pre-checks and throws `SafetyError` when any rule with severity
     * `medium` or higher is violated. Returns the list of all violations
     * (including low-severity ones) otherwise.
     */
    assertSafe(context: GovernanceContext): SafetyViolation[];
    /**
     * Verifies all rules (regardless of enforcement point) against `context`
     * and returns all violations.
     */
    verifyInvariants(context: GovernanceContext): SafetyViolation[];
}
//# sourceMappingURL=safety.d.ts.map