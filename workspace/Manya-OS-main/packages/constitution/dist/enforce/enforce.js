"use strict";
/**
 * @manya-os/constitution — runtime enforcement engine.
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnforcementEngine = void 0;
const errors_js_1 = require("../errors.js");
const rules_js_1 = require("../rules/rules.js");
const policies_js_1 = require("../policies/policies.js");
const permissions_js_1 = require("../permissions/permissions.js");
const safety_js_1 = require("../safety/safety.js");
/** Monotonic counter for audit-id generation. */
let auditCounter = 0;
/** Generates a stable, sortable audit id. */
function newAuditId(timestamp) {
    auditCounter += 1;
    // Sanitize timestamp into a filename-safe sortable suffix.
    const ts = timestamp.replace(/[^0-9]/g, '');
    return `audit-${ts}-${auditCounter.toString(36).padStart(6, '0')}`;
}
/**
 * The runtime enforcement engine. Construct one, register rule/policy/
 * permission/safety sets, then call `evaluate` for each action.
 */
class EnforcementEngine {
    ruleSet;
    policySet;
    permissionModel;
    safety;
    audit = [];
    requireApprovalDenies;
    grantCheck;
    grants = [];
    grantRevocations = [];
    constructor(opts = {}) {
        this.requireApprovalDenies = opts.requireApprovalDenies ?? true;
    }
    /** Registers the ethical rule set. */
    registerRuleSet(ruleSet) {
        this.ruleSet = ruleSet;
        return this;
    }
    /** Registers the operational policy set. */
    registerPolicySet(policySet) {
        this.policySet = policySet;
        return this;
    }
    /** Registers the permission model. */
    registerPermissionModel(model) {
        this.permissionModel = model;
        return this;
    }
    registerSafetyChecker(arg) {
        if (arg instanceof safety_js_1.SafetyChecker) {
            this.safety = arg;
        }
        else if (Array.isArray(arg)) {
            const checker = new safety_js_1.SafetyChecker();
            for (const { rule, predicate } of arg)
                checker.register(rule, predicate);
            this.safety = checker;
        }
        else {
            throw new errors_js_1.EnforcementError('registerSafetyChecker: invalid argument');
        }
        return this;
    }
    /** Register a grant validity check callback. */
    registerGrantCheck(check) {
        this.grantCheck = check;
        return this;
    }
    /** Register a capability grant for governance tracking. */
    registerGrant(grant) {
        this.grants.push(grant);
        return this;
    }
    /** Revoke a grant. */
    revokeGrant(grantId, revokedBy, reason) {
        const grant = this.grants.find(g => g.id === grantId);
        if (!grant)
            throw new errors_js_1.EnforcementError(`grant '${grantId}' not found`);
        grant.revoked = true;
        this.grantRevocations.push({
            grantId,
            revokedAt: new Date().toISOString(),
            revokedBy,
            reason,
        });
    }
    /** Get all registered grants. */
    getGrants() {
        return [...this.grants];
    }
    /** Get all grant revocations. */
    getGrantRevocations() {
        return [...this.grantRevocations];
    }
    /**
     * Evaluates `action` by `subject` against the registered governance.
     * Returns an `EnforcementResult` and appends an entry to the audit log.
     */
    evaluate(action, subject, context) {
        if (typeof action !== 'string' || action.length === 0) {
            throw new errors_js_1.EnforcementError('action must be a non-empty string');
        }
        if (typeof subject !== 'string' || subject.length === 0) {
            throw new errors_js_1.EnforcementError('subject must be a non-empty string');
        }
        if (!context || typeof context !== 'object') {
            throw new errors_js_1.EnforcementError('context must be a non-null object');
        }
        const reasons = [];
        const violations = [];
        let grantUsed;
        // 0. Grant check (checked before permissions — grants override role-based access).
        if (this.grantCheck) {
            const resource = context.resource ?? '*';
            // Check all active grants for this subject.
            const activeGrants = this.grants.filter(g => g.subject === context.subject
                && !g.revoked
                && new Date() >= new Date(g.validFrom)
                && new Date() <= new Date(g.validUntil));
            for (const grant of activeGrants) {
                if (this.grantCheck(grant.id, resource, action)) {
                    grantUsed = grant.id;
                    reasons.push(`capability grant '${grant.id}' permits '${action}' on '${resource}'`);
                    break;
                }
            }
        }
        // 1. Permissions (skip if a grant already authorized).
        if (!grantUsed && this.permissionModel) {
            const permitted = (0, permissions_js_1.can)(this.permissionModel, subject, action);
            if (permitted) {
                reasons.push(`permission granted: ${subject} can ${action}`);
            }
            else {
                violations.push(`permission denied: ${subject} cannot ${action}`);
            }
        }
        else if (!grantUsed) {
            reasons.push('no permission model registered; skipping permission check');
        }
        // 2. Policies
        if (this.policySet) {
            const ev = (0, policies_js_1.evaluatePolicySet)(this.policySet, context);
            if (ev.matched) {
                if (ev.action === 'allow') {
                    reasons.push(`policy ${ev.policyId} allowed`);
                }
                else if (ev.action === 'deny') {
                    violations.push(`policy ${ev.policyId} denied: ${ev.reason ?? 'denied'}`);
                }
                else if (ev.action === 'require_approval') {
                    if (this.requireApprovalDenies) {
                        violations.push(`policy ${ev.policyId} requires approval: ${ev.reason ?? 'approval required'}`);
                    }
                    else {
                        reasons.push(`policy ${ev.policyId} requires approval (non-blocking)`);
                    }
                }
            }
            else {
                reasons.push('no matching policy; default allow');
            }
        }
        else {
            reasons.push('no policy set registered; skipping policy check');
        }
        // 3. Safety (pre)
        if (this.safety) {
            const sv = this.safety.runPre(context);
            for (const v of sv) {
                // Only block on medium or higher; info/low are recorded as reasons.
                if (v.severity === 'medium' || v.severity === 'high' || v.severity === 'critical') {
                    violations.push(`safety ${v.ruleId} violated: ${v.reason}`);
                }
                else {
                    reasons.push(`safety ${v.ruleId} advisory: ${v.reason}`);
                }
            }
            if (sv.length === 0) {
                reasons.push('safety pre-checks passed');
            }
        }
        else {
            reasons.push('no safety checker registered; skipping safety check');
        }
        // 4. Ethical rules
        if (this.ruleSet) {
            const rv = (0, rules_js_1.evaluateRuleSet)(this.ruleSet, context);
            for (const v of rv) {
                violations.push(`ethical rule ${v.ruleId} violated: ${v.reason ?? 'violated'}`);
            }
            if (rv.length === 0) {
                reasons.push('ethical rules passed');
            }
        }
        else {
            reasons.push('no rule set registered; skipping ethical check');
        }
        const allowed = violations.length === 0;
        const auditId = newAuditId(context.timestamp);
        const entry = {
            auditId,
            timestamp: context.timestamp,
            action,
            subject,
            allowed,
            reasons,
            violations,
        };
        this.audit.push(entry);
        return { allowed, reasons, violations, auditId, grantUsed };
    }
    /** Returns a defensive copy of the audit log. */
    getAuditLog() {
        return this.audit.map((e) => ({ ...e, reasons: [...e.reasons], violations: [...e.violations] }));
    }
    /** Returns the audit entry with the given id, or undefined. */
    getAuditEntry(id) {
        return this.audit.find((e) => e.auditId === id);
    }
    /** Clears the audit log. */
    clearAuditLog() {
        this.audit.length = 0;
    }
}
exports.EnforcementEngine = EnforcementEngine;
//# sourceMappingURL=enforce.js.map