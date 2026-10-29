"use strict";
/**
 * @manya-os/contracts — boundary enforcement.
 *
 * Enforces module-level call boundaries declared via a `BoundaryPolicy` — a
 * named collection of `BoundaryRule`s plus a `defaultAllow` flag. Rules map
 * a `(from, to)` module pair to an allow/deny decision; when no rule matches,
 * `defaultAllow` decides.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.matchRule = matchRule;
exports.enforceBoundary = enforceBoundary;
exports.detectViolations = detectViolations;
exports.isPolicySatisfied = isPolicySatisfied;
const errors_js_1 = require("../errors.js");
/**
 * Returns the most specific rule matching `(caller, callee)`. Specificity:
 *   1. An exact `(from, to)` rule wins.
 *   2. A wildcard `('*', to)` rule matches next.
 *   3. A wildcard `(from, '*')` rule matches next.
 *   4. A `('*', '*')` rule matches last.
 * Returns `undefined` when no rule matches.
 */
function matchRule(policy, caller, callee) {
    let exact;
    let fromWild;
    let toWild;
    let anyWild;
    for (const r of policy.rules) {
        if (r.from === caller && r.to === callee) {
            exact = r;
            break;
        }
        if (r.from === '*' && r.to === callee)
            fromWild = fromWild ?? r;
        else if (r.from === caller && r.to === '*')
            toWild = toWild ?? r;
        else if (r.from === '*' && r.to === '*')
            anyWild = anyWild ?? r;
    }
    return exact ?? fromWild ?? toWild ?? anyWild;
}
/**
 * Enforces the boundary policy for a single `(caller, callee)` call. When a
 * rule matches, its `allowed` flag and `reason` are returned; otherwise the
 * policy's `defaultAllow` flag decides.
 */
function enforceBoundary(policy, caller, callee) {
    if (typeof caller !== 'string' || caller.length === 0) {
        throw new errors_js_1.BoundaryError('caller must be a non-empty string');
    }
    if (typeof callee !== 'string' || callee.length === 0) {
        throw new errors_js_1.BoundaryError('callee must be a non-empty string');
    }
    const rule = matchRule(policy, caller, callee);
    if (rule) {
        return {
            allowed: rule.allowed,
            reason: rule.reason ?? (rule.allowed ? 'allowed by rule' : 'denied by rule'),
            matchedRule: rule,
        };
    }
    return {
        allowed: policy.defaultAllow,
        reason: policy.defaultAllow ? 'allowed by default' : 'denied by default',
    };
}
/**
 * Detects every violation in a call graph: every edge whose
 * `enforceBoundary` result has `allowed === false`. Returns an array of
 * `BoundaryViolation`s (empty when the policy is satisfied).
 */
function detectViolations(policy, callGraph) {
    if (!Array.isArray(callGraph)) {
        throw new errors_js_1.BoundaryError('callGraph must be an array of { from, to } edges');
    }
    const violations = [];
    for (const edge of callGraph) {
        if (!edge || typeof edge !== 'object') {
            throw new errors_js_1.BoundaryError('each call-graph edge must be an object');
        }
        const result = enforceBoundary(policy, edge.from, edge.to);
        if (!result.allowed) {
            violations.push({
                from: edge.from,
                to: edge.to,
                reason: result.reason ?? 'denied',
            });
        }
    }
    return violations;
}
/**
 * Convenience: returns `true` iff every edge in `callGraph` is permitted by
 * `policy`.
 */
function isPolicySatisfied(policy, callGraph) {
    return detectViolations(policy, callGraph).length === 0;
}
//# sourceMappingURL=boundaries.js.map