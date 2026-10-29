/**
 * @manya/constitution — emergency procedures.
 *
 * The `EmergencyController` class tracks the current `EmergencyState` and the
 * active `EmergencyProcedure`. State transitions are constrained to escalate
 * one level at a time (normal → heightened → emergency → critical) but may
 * de-escalate by any number of levels. Each state may have at most one
 * procedure active at a time.
 *
 * While a procedure is active, `isActionAllowed(action)` returns true only
 * when the action appears in the procedure's `allowedActions` list. When no
 * procedure is active, all actions are allowed (subject to other governance).
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import type { EmergencyProcedure, EmergencyState } from '../types.js';
import { EmergencyError } from '../errors.js';

/** Ordered severity ranks for emergency states. */
export const STATE_RANK: Record<EmergencyState, number> = {
  normal: 0, heightened: 1, emergency: 2, critical: 3,
};

/** All emergency states, ordered from least to most severe. */
export const STATE_ORDER: EmergencyState[] = ['normal', 'heightened', 'emergency', 'critical'];

/**
 * Controller for emergency state and procedures.
 *
 * Usage:
 * ```ts
 * const ctrl = new EmergencyController();
 * ctrl.declareEmergency('heightened', procedure);
 * ctrl.isActionAllowed('data:read');  // depends on procedure.allowedActions
 * ctrl.liftEmergency();
 * ```
 */
export class EmergencyController {
  private state: EmergencyState = 'normal';
  private procedure?: EmergencyProcedure;
  private declaredAt?: string;
  private listeners: Array<(state: EmergencyState, procedure?: EmergencyProcedure) => void> = [];

  /** Returns the current emergency state. */
  getState(): EmergencyState { return this.state; }

  /** Returns the active procedure, if any. */
  getActiveProcedure(): EmergencyProcedure | undefined { return this.procedure; }

  /** Returns the ISO 8601 timestamp when the current state was declared. */
  getDeclaredAt(): string | undefined { return this.declaredAt; }

  /**
   * Declares an emergency at `state` and activates `procedure`. The procedure's
   * `state` field must match `state`. Throws `EmergencyError` when:
   *   - the state is `normal` (use `liftEmergency` instead)
   *   - the procedure's state does not match
   *   - escalation is more than one level higher than the current state
   *     (de-escalation is allowed by any amount)
   */
  declareEmergency(state: EmergencyState, procedure: EmergencyProcedure): void {
    if (state === 'normal') {
      throw new EmergencyError('use liftEmergency() to return to normal');
    }
    if (!procedure || typeof procedure !== 'object') {
      throw new EmergencyError('procedure must be an object');
    }
    if (procedure.state !== state) {
      throw new EmergencyError(
        `procedure.state (${procedure.state}) does not match declared state (${state})`,
      );
    }
    const curRank = STATE_RANK[this.state];
    const newRank = STATE_RANK[state];
    if (newRank - curRank > 1) {
      throw new EmergencyError(
        `cannot escalate from ${this.state} to ${state}; intermediate state required`,
      );
    }
    this.state = state;
    this.procedure = procedure;
    this.declaredAt = new Date().toISOString();
    this.emit();
  }

  /**
   * Lifts the emergency: sets state to `normal`, clears the procedure, and
   * emits the change.
   */
  liftEmergency(): void {
    this.state = 'normal';
    this.procedure = undefined;
    this.declaredAt = undefined;
    this.emit();
  }

  /**
   * Returns true when `action` is allowed under the active procedure. When no
   * procedure is active (state is `normal`), all actions are allowed.
   *
   * Wildcards: an entry of `*` in `allowedActions` allows all actions; an
   * entry of `module:*` allows all actions in `module`.
   */
  isActionAllowed(action: string): boolean {
    if (!this.procedure) return true;
    const allowed = this.procedure.allowedActions;
    if (allowed.includes('*')) return true;
    for (const entry of allowed) {
      if (entry === action) return true;
      if (entry.endsWith(':*') && action.startsWith(entry.slice(0, -1))) return true;
    }
    return false;
  }

  /**
   * Returns true when the active procedure has timed out, given `now` (ISO
   * 8601). A timeout of 0 means no timeout.
   */
  isTimedOut(now: string): boolean {
    if (!this.procedure || !this.declaredAt) return false;
    if (this.procedure.timeout <= 0) return false;
    const elapsed = Date.parse(now) - Date.parse(this.declaredAt);
    return elapsed >= this.procedure.timeout;
  }

  /**
   * Registers a listener that is invoked whenever the state changes.
   */
  onStateChange(listener: (state: EmergencyState, procedure?: EmergencyProcedure) => void): void {
    this.listeners.push(listener);
  }

  private emit(): void {
    for (const l of this.listeners) {
      try { l(this.state, this.procedure); } catch { /* swallow */ }
    }
  }
}

/**
 * Validates an `EmergencyProcedure` structurally. Throws `EmergencyError` on
 * invalid fields.
 */
export function validateProcedure(procedure: EmergencyProcedure): void {
  if (!procedure || typeof procedure !== 'object') {
    throw new EmergencyError('procedure must be an object');
  }
  if (typeof procedure.id !== 'string' || procedure.id.length === 0) {
    throw new EmergencyError('procedure.id must be a non-empty string');
  }
  if (typeof procedure.name !== 'string' || procedure.name.length === 0) {
    throw new EmergencyError('procedure.name must be a non-empty string');
  }
  if (!STATE_ORDER.includes(procedure.state)) {
    throw new EmergencyError(`procedure.state must be one of: ${STATE_ORDER.join(', ')}`);
  }
  if (!Array.isArray(procedure.triggerConditions)) {
    throw new EmergencyError('procedure.triggerConditions must be an array');
  }
  if (!Array.isArray(procedure.allowedActions)) {
    throw new EmergencyError('procedure.allowedActions must be an array');
  }
  if (!Array.isArray(procedure.requiredApprovals)) {
    throw new EmergencyError('procedure.requiredApprovals must be an array');
  }
  if (typeof procedure.timeout !== 'number' || procedure.timeout < 0) {
    throw new EmergencyError('procedure.timeout must be a non-negative number');
  }
}
