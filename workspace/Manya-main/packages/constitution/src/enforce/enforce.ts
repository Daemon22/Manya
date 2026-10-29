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

import type {
  EnforcementResult, GovernanceContext, PermissionModel, PolicySet,
  RuleSet, SafetyRule, SafetyViolation,
} from '../types.js';
import { EnforcementError } from '../errors.js';
import { evaluateRuleSet } from '../rules/rules.js';
import { evaluatePolicySet } from '../policies/policies.js';
import { can } from '../permissions/permissions.js';
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

/** Monotonic counter for audit-id generation. */
let auditCounter = 0;

/** Generates a stable, sortable audit id. */
function newAuditId(timestamp: string): string {
  auditCounter += 1;
  // Sanitize timestamp into a filename-safe sortable suffix.
  const ts = timestamp.replace(/[^0-9]/g, '');
  return `audit-${ts}-${auditCounter.toString(36).padStart(6, '0')}`;
}

/**
 * The runtime enforcement engine. Construct one, register rule/policy/
 * permission/safety sets, then call `evaluate` for each action.
 */
export class EnforcementEngine {
  private ruleSet?: RuleSet;
  private policySet?: PolicySet;
  private permissionModel?: PermissionModel;
  private safety?: SafetyChecker;
  private readonly audit: AuditEntry[] = [];
  private readonly requireApprovalDenies: boolean;

  constructor(opts: { requireApprovalDenies?: boolean } = {}) {
    this.requireApprovalDenies = opts.requireApprovalDenies ?? true;
  }

  /** Registers the ethical rule set. */
  registerRuleSet(ruleSet: RuleSet): this {
    this.ruleSet = ruleSet;
    return this;
  }

  /** Registers the operational policy set. */
  registerPolicySet(policySet: PolicySet): this {
    this.policySet = policySet;
    return this;
  }

  /** Registers the permission model. */
  registerPermissionModel(model: PermissionModel): this {
    this.permissionModel = model;
    return this;
  }

  /**
   * Registers a safety checker. Alternatively, pass a map of rules and
   * predicates to register a fresh checker.
   */
  registerSafetyChecker(checker: SafetyChecker): this;
  registerSafetyChecker(rules: Array<{ rule: SafetyRule; predicate: SafetyPredicate }>): this;
  registerSafetyChecker(arg: SafetyChecker | Array<{ rule: SafetyRule; predicate: SafetyPredicate }>): this {
    if (arg instanceof SafetyChecker) {
      this.safety = arg;
    } else if (Array.isArray(arg)) {
      const checker = new SafetyChecker();
      for (const { rule, predicate } of arg) checker.register(rule, predicate);
      this.safety = checker;
    } else {
      throw new EnforcementError('registerSafetyChecker: invalid argument');
    }
    return this;
  }

  /**
   * Evaluates `action` by `subject` against the registered governance.
   * Returns an `EnforcementResult` and appends an entry to the audit log.
   */
  evaluate(action: string, subject: string, context: GovernanceContext): EnforcementResult {
    if (typeof action !== 'string' || action.length === 0) {
      throw new EnforcementError('action must be a non-empty string');
    }
    if (typeof subject !== 'string' || subject.length === 0) {
      throw new EnforcementError('subject must be a non-empty string');
    }
    if (!context || typeof context !== 'object') {
      throw new EnforcementError('context must be a non-null object');
    }
    const reasons: string[] = [];
    const violations: string[] = [];

    // 1. Permissions
    if (this.permissionModel) {
      const permitted = can(this.permissionModel, subject, action);
      if (permitted) {
        reasons.push(`permission granted: ${subject} can ${action}`);
      } else {
        violations.push(`permission denied: ${subject} cannot ${action}`);
      }
    } else {
      reasons.push('no permission model registered; skipping permission check');
    }

    // 2. Policies
    if (this.policySet) {
      const ev = evaluatePolicySet(this.policySet, context);
      if (ev.matched) {
        if (ev.action === 'allow') {
          reasons.push(`policy ${ev.policyId} allowed`);
        } else if (ev.action === 'deny') {
          violations.push(`policy ${ev.policyId} denied: ${ev.reason ?? 'denied'}`);
        } else if (ev.action === 'require_approval') {
          if (this.requireApprovalDenies) {
            violations.push(`policy ${ev.policyId} requires approval: ${ev.reason ?? 'approval required'}`);
          } else {
            reasons.push(`policy ${ev.policyId} requires approval (non-blocking)`);
          }
        }
      } else {
        reasons.push('no matching policy; default allow');
      }
    } else {
      reasons.push('no policy set registered; skipping policy check');
    }

    // 3. Safety (pre)
    if (this.safety) {
      const sv: SafetyViolation[] = this.safety.runPre(context);
      for (const v of sv) {
        // Only block on medium or higher; info/low are recorded as reasons.
        if (v.severity === 'medium' || v.severity === 'high' || v.severity === 'critical') {
          violations.push(`safety ${v.ruleId} violated: ${v.reason}`);
        } else {
          reasons.push(`safety ${v.ruleId} advisory: ${v.reason}`);
        }
      }
      if (sv.length === 0) {
        reasons.push('safety pre-checks passed');
      }
    } else {
      reasons.push('no safety checker registered; skipping safety check');
    }

    // 4. Ethical rules
    if (this.ruleSet) {
      const rv = evaluateRuleSet(this.ruleSet, context);
      for (const v of rv) {
        violations.push(`ethical rule ${v.ruleId} violated: ${v.reason ?? 'violated'}`);
      }
      if (rv.length === 0) {
        reasons.push('ethical rules passed');
      }
    } else {
      reasons.push('no rule set registered; skipping ethical check');
    }

    const allowed = violations.length === 0;
    const auditId = newAuditId(context.timestamp);
    const entry: AuditEntry = {
      auditId,
      timestamp: context.timestamp,
      action,
      subject,
      allowed,
      reasons,
      violations,
    };
    this.audit.push(entry);
    return { allowed, reasons, violations, auditId };
  }

  /** Returns a defensive copy of the audit log. */
  getAuditLog(): AuditEntry[] {
    return this.audit.map((e) => ({ ...e, reasons: [...e.reasons], violations: [...e.violations] }));
  }

  /** Returns the audit entry with the given id, or undefined. */
  getAuditEntry(id: string): AuditEntry | undefined {
    return this.audit.find((e) => e.auditId === id);
  }

  /** Clears the audit log. */
  clearAuditLog(): void {
    this.audit.length = 0;
  }
}
