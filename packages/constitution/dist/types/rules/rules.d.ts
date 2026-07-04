/**
 * @manya/constitution — ethical rules.
 *
 * An `EthicalRule` is either a prohibition (forbidden=true: violated when the
 * described behavior occurs) or a requirement (forbidden=false: violated when
 * the described behavior does NOT occur). The evaluation uses simple keyword
 * matching against the rule's `description` and the governance context: a
 * prohibition is violated when its description's action verb appears in the
 * context's action; a requirement is violated when its action verb does NOT
 * appear. This keeps the rule evaluator dependency-free and predictable while
 * still allowing rule authors to encode behavior in the description field.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
import type { EthicalRule, GovernanceContext, RuleEvaluation, RuleSet } from '../types.js';
/** All valid rule categories. */
export declare const RULE_CATEGORIES: readonly ["harm", "deception", "privacy", "fairness", "autonomy", "transparency"];
/**
 * Evaluates a single ethical rule against a governance context.
 *
 * - For `forbidden: true` rules (prohibitions), the rule is *violated* when
 *   the rule's action verb appears in `context.action` or in the rule's
 *   description matching against `context.metadata?.reason`.
 * - For `forbidden: false` rules (requirements), the rule is *violated* when
 *   the rule's action verb does NOT appear in `context.action`.
 */
export declare function evaluateRule(rule: EthicalRule, context: GovernanceContext): RuleEvaluation;
/**
 * Evaluates every rule in a `RuleSet` against `context` and returns the list
 * of violations (rules that did not pass).
 */
export declare function evaluateRuleSet(rules: RuleSet, context: GovernanceContext): RuleEvaluation[];
/**
 * Validates that a rule structurally conforms. Throws `RuleError` if not.
 * Useful when loading rule sets from external sources.
 */
export declare function validateRule(rule: EthicalRule): void;
//# sourceMappingURL=rules.d.ts.map