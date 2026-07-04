/**
 * @manya/constitution — operational policies.
 *
 * A `Policy` pairs a `condition` expression with an `action` and a `priority`.
 * The condition language is a small, safe subset of boolean logic with
 * equality/inequality/membership operators:
 *
 *   - `context.field == value`
 *   - `context.field != value`
 *   - `context.field in [a, b, c]`
 *   - `NOT <expr>`
 *   - `<expr> AND <expr>`
 *   - `<expr> OR <expr>`
 *   - parentheses for grouping
 *
 * Values can be strings (single- or double-quoted), numbers, `true`, `false`,
 * and `null`. Field paths support a single dot (`context.<field>`); nested
 * paths like `context.foo.bar` are supported by walking the metadata object.
 *
 * The parser is a hand-written recursive-descent parser that produces a plain
 * AST (no `eval`), so the language is sandboxed.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
import type { GovernanceContext, Policy, PolicyEvaluation, PolicySet } from '../types.js';
type AstNode = {
    kind: 'and';
    left: AstNode;
    right: AstNode;
} | {
    kind: 'or';
    left: AstNode;
    right: AstNode;
} | {
    kind: 'not';
    operand: AstNode;
} | {
    kind: 'cmp';
    op: '==' | '!=' | 'in';
    left: AstNode;
    right: AstNode;
} | {
    kind: 'field';
    path: string[];
} | {
    kind: 'literal';
    value: unknown;
} | {
    kind: 'list';
    items: unknown[];
};
/**
 * Parses a condition expression into an AST. Results are cached by source
 * string for performance. Throws `PolicyError` on syntax errors.
 */
export declare function parseCondition(condition: string): AstNode;
/** Clears the condition-parse cache (useful in tests). */
export declare function clearConditionCache(): void;
/** Evaluates a condition against a context. */
export declare function evaluateCondition(condition: string, context: GovernanceContext): boolean;
/** Evaluates a single policy. Returns `matched: true` when the condition holds. */
export declare function evaluatePolicy(policy: Policy, context: GovernanceContext): PolicyEvaluation;
/**
 * Evaluates a policy set against `context` and returns the action of the
 * highest-priority matching policy. If multiple policies match at the same
 * priority, the most restrictive wins (deny > require_approval > allow). If
 * no policy matches, returns `{ matched: false, action: 'allow' }` (default
 * allow when no policy applies).
 */
export declare function evaluatePolicySet(policies: PolicySet, context: GovernanceContext): PolicyEvaluation;
export {};
//# sourceMappingURL=policies.d.ts.map