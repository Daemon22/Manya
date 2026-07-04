/**
 * @manya/constitution — runtime enforcement engine.
 *
 * The `EnforcementEngine` binds together rules, policies, permissions, and
 * safety rules into a single `evaluate(action, subject, context)` call. The
 * evaluation order is:
 *
 *   1. **Permissions** — subject must hold the permission that covers
 *      `context.action`. Deny otherwise.
 *   2. **Policies** — the highest-priority matching policy decides between
 *      `allow`, `deny`, `require_approval`. `deny` blocks; `require_approval`
 *      is treated as a deny with a reason.
 *   3. **Safety (pre)** — every registered safety rule with enforcement point
 *      `pre` or `both` must pass.
 *   4. **Ethical rules** — no rule may be violated (prohibitions and
 *      requirements both enforced).
 *
 * If all four checks pass, `allowed = true`. Every evaluation produces an
 * audit-log entry with a stable id, regardless of outcome.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
import type { EnforcementResult, GovernanceContext, PermissionModel, PolicySet, RuleSet, SafetyRule } from '../types.js';
import { SafetyChecker, type SafetyPredicate } from '../safety/safety.js';
/** An entry in the enforcement audit log. */
export interface AuditEntry {
    /** Stable, unique audit id. */
    auditId: string;
    /** ISO 8601 timestamp. */
    timestamp: string;
    /** The action that was evaluated. */
    action: string;
    /** The subject that requested the action. */
    subject: string;
    /** The final decision. */
    allowed: boolean;
    /** Reasons contributing to the decision. */
    reasons: string[];
    /** Violations that contributed to a denial. */
    violations: string[];
}
/**
 * The runtime enforcement engine. Construct one, register rule/policy/
 * permission/safety sets, then call `evaluate` for each action.
 */
export declare class EnforcementEngine {
    private ruleSet?;
    private policySet?;
    private permissionModel?;
    private safety?;
    private readonly audit;
    private readonly requireApprovalDenies;
    constructor(opts?: {
        requireApprovalDenies?: boolean;
    });
    /** Registers the ethical rule set. */
    registerRuleSet(ruleSet: RuleSet): this;
    /** Registers the operational policy set. */
    registerPolicySet(policySet: PolicySet): this;
    /** Registers the permission model. */
    registerPermissionModel(model: PermissionModel): this;
    /**
     * Registers a safety checker. Alternatively, pass a map of rules and
     * predicates to register a fresh checker.
     */
    registerSafetyChecker(checker: SafetyChecker): this;
    registerSafetyChecker(rules: Array<{
        rule: SafetyRule;
        predicate: SafetyPredicate;
    }>): this;
    /**
     * Evaluates `action` by `subject` against the registered governance.
     * Returns an `EnforcementResult` and appends an entry to the audit log.
     */
    evaluate(action: string, subject: string, context: GovernanceContext): EnforcementResult;
    /** Returns a defensive copy of the audit log. */
    getAuditLog(): AuditEntry[];
    /** Returns the audit entry with the given id, or undefined. */
    getAuditEntry(id: string): AuditEntry | undefined;
    /** Clears the audit log. */
    clearAuditLog(): void;
}
//# sourceMappingURL=enforce.d.ts.map