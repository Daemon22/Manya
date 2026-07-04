/**
 * @manya/contracts — boundary enforcement.
 *
 * Enforces module-level call boundaries declared via a `BoundaryPolicy` — a
 * named collection of `BoundaryRule`s plus a `defaultAllow` flag. Rules map
 * a `(from, to)` module pair to an allow/deny decision; when no rule matches,
 * `defaultAllow` decides.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
import type { BoundaryPolicy, BoundaryRule } from '../types.js';
/** Result of a single boundary check. */
export interface BoundaryResult {
    /** Whether the call is allowed. */
    allowed: boolean;
    /** Human-readable reason (the matched rule's reason, or `default`). */
    reason?: string;
    /** The rule that decided the result, if any. */
    matchedRule?: BoundaryRule;
}
/** A single edge in a call graph — `from` calls `to`. */
export interface CallEdge {
    from: string;
    to: string;
}
/** A detected violation in a call graph. */
export interface BoundaryViolation {
    /** Caller module. */
    from: string;
    /** Callee module. */
    to: string;
    /** Why the call is disallowed. */
    reason: string;
}
/**
 * Returns the most specific rule matching `(caller, callee)`. Specificity:
 *   1. An exact `(from, to)` rule wins.
 *   2. A wildcard `('*', to)` rule matches next.
 *   3. A wildcard `(from, '*')` rule matches next.
 *   4. A `('*', '*')` rule matches last.
 * Returns `undefined` when no rule matches.
 */
export declare function matchRule(policy: BoundaryPolicy, caller: string, callee: string): BoundaryRule | undefined;
/**
 * Enforces the boundary policy for a single `(caller, callee)` call. When a
 * rule matches, its `allowed` flag and `reason` are returned; otherwise the
 * policy's `defaultAllow` flag decides.
 */
export declare function enforceBoundary(policy: BoundaryPolicy, caller: string, callee: string): BoundaryResult;
/**
 * Detects every violation in a call graph: every edge whose
 * `enforceBoundary` result has `allowed === false`. Returns an array of
 * `BoundaryViolation`s (empty when the policy is satisfied).
 */
export declare function detectViolations(policy: BoundaryPolicy, callGraph: ReadonlyArray<CallEdge>): BoundaryViolation[];
/**
 * Convenience: returns `true` iff every edge in `callGraph` is permitted by
 * `policy`.
 */
export declare function isPolicySatisfied(policy: BoundaryPolicy, callGraph: ReadonlyArray<CallEdge>): boolean;
//# sourceMappingURL=boundaries.d.ts.map