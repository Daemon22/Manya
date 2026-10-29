"use strict";
/**
 * @manya-os/constitution — ethical rules.
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.RULE_CATEGORIES = void 0;
exports.evaluateRule = evaluateRule;
exports.evaluateRuleSet = evaluateRuleSet;
exports.validateRule = validateRule;
const errors_js_1 = require("../errors.js");
/** All valid rule categories. */
exports.RULE_CATEGORIES = [
    'harm', 'deception', 'privacy', 'fairness', 'autonomy', 'transparency',
];
/**
 * Extracts the action verb from a rule description. The verb is the first
 * lowercase word that looks like an action (e.g. "harm", "deceive", "leak",
 * "discriminate"). If no verb is found, the entire description (lowercased)
 * is used.
 */
function extractActionVerb(description) {
    const lower = description.toLowerCase();
    // Strip leading "do not " / "must not " / "shall not " prefixes.
    const stripped = lower.replace(/^(do|must|shall|should)\s+not\s+/, '').replace(/^(must|shall|should)\s+/, '');
    const match = stripped.match(/[a-z]+/);
    return match ? match[0] : lower;
}
/**
 * Evaluates a single ethical rule against a governance context.
 *
 * - For `forbidden: true` rules (prohibitions), the rule is *violated* when
 *   the rule's action verb appears in `context.action` or in the rule's
 *   description matching against `context.metadata?.reason`.
 * - For `forbidden: false` rules (requirements), the rule is *violated* when
 *   the rule's action verb does NOT appear in `context.action`.
 */
function evaluateRule(rule, context) {
    if (!rule || typeof rule !== 'object') {
        throw new errors_js_1.RuleError('rule must be a non-null object');
    }
    if (!context || typeof context !== 'object') {
        throw new errors_js_1.RuleError('context must be a non-null object');
    }
    if (typeof rule.id !== 'string' || rule.id.length === 0) {
        throw new errors_js_1.RuleError('rule.id must be a non-empty string');
    }
    const verb = extractActionVerb(rule.description);
    const actionStr = (context.action ?? '').toLowerCase();
    const reasonStr = typeof context.metadata?.reason === 'string'
        ? String(context.metadata.reason).toLowerCase()
        : '';
    const haystack = `${actionStr} ${reasonStr}`;
    const matches = haystack.includes(verb);
    if (rule.forbidden) {
        if (matches) {
            return {
                violated: true,
                reason: `prohibition "${rule.id}" triggered: action matches "${verb}"`,
                ruleId: rule.id,
                severity: rule.severity,
            };
        }
        return { violated: false, ruleId: rule.id, severity: rule.severity };
    }
    // Requirement: violated when the verb does NOT appear.
    if (!matches) {
        return {
            violated: true,
            reason: `requirement "${rule.id}" not satisfied: action missing "${verb}"`,
            ruleId: rule.id,
            severity: rule.severity,
        };
    }
    return { violated: false, ruleId: rule.id, severity: rule.severity };
}
/**
 * Evaluates every rule in a `RuleSet` against `context` and returns the list
 * of violations (rules that did not pass).
 */
function evaluateRuleSet(rules, context) {
    if (!rules || !Array.isArray(rules.rules)) {
        throw new errors_js_1.RuleError('rules.rules must be an array');
    }
    const out = [];
    for (const r of rules.rules) {
        const ev = evaluateRule(r, context);
        if (ev.violated)
            out.push(ev);
    }
    return out;
}
/**
 * Validates that a rule structurally conforms. Throws `RuleError` if not.
 * Useful when loading rule sets from external sources.
 */
function validateRule(rule) {
    if (!rule || typeof rule !== 'object') {
        throw new errors_js_1.RuleError('rule must be an object');
    }
    if (typeof rule.id !== 'string' || rule.id.length === 0) {
        throw new errors_js_1.RuleError('rule.id must be a non-empty string');
    }
    if (typeof rule.name !== 'string' || rule.name.length === 0) {
        throw new errors_js_1.RuleError('rule.name must be a non-empty string');
    }
    if (typeof rule.description !== 'string' || rule.description.length === 0) {
        throw new errors_js_1.RuleError('rule.description must be a non-empty string');
    }
    if (!exports.RULE_CATEGORIES.includes(rule.category)) {
        throw new errors_js_1.RuleError(`rule.category must be one of: ${exports.RULE_CATEGORIES.join(', ')}`);
    }
    if (typeof rule.forbidden !== 'boolean') {
        throw new errors_js_1.RuleError('rule.forbidden must be a boolean');
    }
    const validSev = ['info', 'low', 'medium', 'high', 'critical'];
    if (!validSev.includes(rule.severity)) {
        throw new errors_js_1.RuleError(`rule.severity must be one of: ${validSev.join(', ')}`);
    }
}
//# sourceMappingURL=rules.js.map