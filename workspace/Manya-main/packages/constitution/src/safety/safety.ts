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

import type {
  EnforcementPoint, GovernanceContext, RuleSeverity, SafetyRule, SafetyViolation,
} from '../types.js';
import { SafetyError } from '../errors.js';

/**
 * A predicate that evaluates whether a safety rule holds for a given context.
 * Returns `{ satisfied: true }` when the invariant is met, or
 * `{ satisfied: false, reason }` when it is violated.
 */
export type SafetyPredicate = (
  rule: SafetyRule,
  context: GovernanceContext,
) => { satisfied: boolean; reason?: string };

/** All valid enforcement points. */
export const ENFORCEMENT_POINTS: ReadonlyArray<EnforcementPoint> = ['pre', 'post', 'both'];

/**
 * Validates a `SafetyRule` structurally. Throws `SafetyError` on invalid
 * fields.
 */
export function validateSafetyRule(rule: SafetyRule): void {
  if (!rule || typeof rule !== 'object') {
    throw new SafetyError('rule must be an object');
  }
  if (typeof rule.id !== 'string' || rule.id.length === 0) {
    throw new SafetyError('rule.id must be a non-empty string');
  }
  if (typeof rule.invariant !== 'string' || rule.invariant.length === 0) {
    throw new SafetyError('rule.invariant must be a non-empty string');
  }
  if (!ENFORCEMENT_POINTS.includes(rule.enforcementPoint)) {
    throw new SafetyError(`rule.enforcementPoint must be one of: ${ENFORCEMENT_POINTS.join(', ')}`);
  }
  const validSev: ReadonlyArray<RuleSeverity> = ['info', 'low', 'medium', 'high', 'critical'];
  if (!validSev.includes(rule.severity)) {
    throw new SafetyError(`rule.severity must be one of: ${validSev.join(', ')}`);
  }
}

/**
 * The safety checker. Register rules and their evaluation predicates, then
 * call `runPre` / `runPost` (or `assertSafe`) at the appropriate points.
 */
export class SafetyChecker {
  private readonly rules = new Map<string, SafetyRule>();
  private readonly predicates = new Map<string, SafetyPredicate>();
  private readonly order: string[] = [];

  /** Registers a rule and its predicate. Throws `SafetyError` on duplicate id. */
  register(rule: SafetyRule, predicate: SafetyPredicate): this {
    validateSafetyRule(rule);
    if (this.rules.has(rule.id)) {
      throw new SafetyError(`safety rule already registered: ${rule.id}`);
    }
    this.rules.set(rule.id, rule);
    this.predicates.set(rule.id, predicate);
    this.order.push(rule.id);
    return this;
  }

  /** Removes a rule by id. */
  unregister(id: string): this {
    this.rules.delete(id);
    this.predicates.delete(id);
    const idx = this.order.indexOf(id);
    if (idx >= 0) this.order.splice(idx, 1);
    return this;
  }

  /** Returns the list of registered rules in insertion order. */
  list(): SafetyRule[] {
    return this.order.map((id) => this.rules.get(id)!);
  }

  /** Returns the rule with the given id, or undefined. */
  get(id: string): SafetyRule | undefined {
    return this.rules.get(id);
  }

  /**
   * Runs all rules whose enforcement point applies to `point` (i.e. `point`
   * itself or `both`). Returns the list of violations.
   */
  run(point: 'pre' | 'post', context: GovernanceContext): SafetyViolation[] {
    if (!context || typeof context !== 'object') {
      throw new SafetyError('context must be a non-null object');
    }
    const out: SafetyViolation[] = [];
    for (const id of this.order) {
      const rule = this.rules.get(id)!;
      if (!appliesAt(rule.enforcementPoint, point)) continue;
      const pred = this.predicates.get(id)!;
      let result: { satisfied: boolean; reason?: string };
      try {
        result = pred(rule, context);
      } catch (err) {
        // Predicate errors are treated as violations with the error message.
        out.push({
          ruleId: rule.id,
          invariant: rule.invariant,
          reason: `predicate threw: ${(err as Error).message}`,
          enforcementPoint: point,
          severity: rule.severity,
        });
        continue;
      }
      if (!result.satisfied) {
        out.push({
          ruleId: rule.id,
          invariant: rule.invariant,
          reason: result.reason ?? `invariant "${rule.invariant}" not satisfied`,
          enforcementPoint: point,
          severity: rule.severity,
        });
      }
    }
    return out;
  }

  /** Convenience: runs pre-checks. */
  runPre(context: GovernanceContext): SafetyViolation[] {
    return this.run('pre', context);
  }

  /** Convenience: runs post-checks. */
  runPost(context: GovernanceContext): SafetyViolation[] {
    return this.run('post', context);
  }

  /**
   * Runs pre-checks and throws `SafetyError` when any rule with severity
   * `medium` or higher is violated. Returns the list of all violations
   * (including low-severity ones) otherwise.
   */
  assertSafe(context: GovernanceContext): SafetyViolation[] {
    const violations = this.runPre(context);
    const blocking = violations.filter((v) =>
      v.severity === 'medium' || v.severity === 'high' || v.severity === 'critical');
    if (blocking.length > 0) {
      const first = blocking[0];
      throw new SafetyError(
        `safety assertion failed: ${first.reason} (rule ${first.ruleId}, severity ${first.severity})`,
      );
    }
    return violations;
  }

  /**
   * Verifies all rules (regardless of enforcement point) against `context`
   * and returns all violations.
   */
  verifyInvariants(context: GovernanceContext): SafetyViolation[] {
    if (!context || typeof context !== 'object') {
      throw new SafetyError('context must be a non-null object');
    }
    const out: SafetyViolation[] = [];
    for (const id of this.order) {
      const rule = this.rules.get(id)!;
      const pred = this.predicates.get(id)!;
      let result: { satisfied: boolean; reason?: string };
      try {
        result = pred(rule, context);
      } catch (err) {
        out.push({
          ruleId: rule.id,
          invariant: rule.invariant,
          reason: `predicate threw: ${(err as Error).message}`,
          enforcementPoint: 'pre',
          severity: rule.severity,
        });
        continue;
      }
      if (!result.satisfied) {
        out.push({
          ruleId: rule.id,
          invariant: rule.invariant,
          reason: result.reason ?? `invariant "${rule.invariant}" not satisfied`,
          enforcementPoint: 'pre',
          severity: rule.severity,
        });
      }
    }
    return out;
  }
}

/** Returns true when a rule with `enforcementPoint` should run at `point`. */
function appliesAt(enforcementPoint: EnforcementPoint, point: 'pre' | 'post'): boolean {
  if (enforcementPoint === 'both') return true;
  return enforcementPoint === point;
}
