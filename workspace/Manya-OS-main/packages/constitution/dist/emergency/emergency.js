"use strict";
/**
 * @manya-os/constitution — emergency procedures.
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmergencyController = exports.STATE_ORDER = exports.STATE_RANK = void 0;
exports.validateProcedure = validateProcedure;
const errors_js_1 = require("../errors.js");
/** Ordered severity ranks for emergency states. */
exports.STATE_RANK = {
    normal: 0, heightened: 1, emergency: 2, critical: 3,
};
/** All emergency states, ordered from least to most severe. */
exports.STATE_ORDER = ['normal', 'heightened', 'emergency', 'critical'];
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
class EmergencyController {
    state = 'normal';
    procedure;
    declaredAt;
    listeners = [];
    /** Returns the current emergency state. */
    getState() { return this.state; }
    /** Returns the active procedure, if any. */
    getActiveProcedure() { return this.procedure; }
    /** Returns the ISO 8601 timestamp when the current state was declared. */
    getDeclaredAt() { return this.declaredAt; }
    /**
     * Declares an emergency at `state` and activates `procedure`. The procedure's
     * `state` field must match `state`. Throws `EmergencyError` when:
     *   - the state is `normal` (use `liftEmergency` instead)
     *   - the procedure's state does not match
     *   - escalation is more than one level higher than the current state
     *     (de-escalation is allowed by any amount)
     */
    declareEmergency(state, procedure) {
        if (state === 'normal') {
            throw new errors_js_1.EmergencyError('use liftEmergency() to return to normal');
        }
        if (!procedure || typeof procedure !== 'object') {
            throw new errors_js_1.EmergencyError('procedure must be an object');
        }
        if (procedure.state !== state) {
            throw new errors_js_1.EmergencyError(`procedure.state (${procedure.state}) does not match declared state (${state})`);
        }
        const curRank = exports.STATE_RANK[this.state];
        const newRank = exports.STATE_RANK[state];
        if (newRank - curRank > 1) {
            throw new errors_js_1.EmergencyError(`cannot escalate from ${this.state} to ${state}; intermediate state required`);
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
    liftEmergency() {
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
    isActionAllowed(action) {
        if (!this.procedure)
            return true;
        const allowed = this.procedure.allowedActions;
        if (allowed.includes('*'))
            return true;
        for (const entry of allowed) {
            if (entry === action)
                return true;
            if (entry.endsWith(':*') && action.startsWith(entry.slice(0, -1)))
                return true;
        }
        return false;
    }
    /**
     * Returns true when the active procedure has timed out, given `now` (ISO
     * 8601). A timeout of 0 means no timeout.
     */
    isTimedOut(now) {
        if (!this.procedure || !this.declaredAt)
            return false;
        if (this.procedure.timeout <= 0)
            return false;
        const elapsed = Date.parse(now) - Date.parse(this.declaredAt);
        return elapsed >= this.procedure.timeout;
    }
    /**
     * Registers a listener that is invoked whenever the state changes.
     */
    onStateChange(listener) {
        this.listeners.push(listener);
    }
    emit() {
        for (const l of this.listeners) {
            try {
                l(this.state, this.procedure);
            }
            catch { /* swallow */ }
        }
    }
}
exports.EmergencyController = EmergencyController;
/**
 * Validates an `EmergencyProcedure` structurally. Throws `EmergencyError` on
 * invalid fields.
 */
function validateProcedure(procedure) {
    if (!procedure || typeof procedure !== 'object') {
        throw new errors_js_1.EmergencyError('procedure must be an object');
    }
    if (typeof procedure.id !== 'string' || procedure.id.length === 0) {
        throw new errors_js_1.EmergencyError('procedure.id must be a non-empty string');
    }
    if (typeof procedure.name !== 'string' || procedure.name.length === 0) {
        throw new errors_js_1.EmergencyError('procedure.name must be a non-empty string');
    }
    if (!exports.STATE_ORDER.includes(procedure.state)) {
        throw new errors_js_1.EmergencyError(`procedure.state must be one of: ${exports.STATE_ORDER.join(', ')}`);
    }
    if (!Array.isArray(procedure.triggerConditions)) {
        throw new errors_js_1.EmergencyError('procedure.triggerConditions must be an array');
    }
    if (!Array.isArray(procedure.allowedActions)) {
        throw new errors_js_1.EmergencyError('procedure.allowedActions must be an array');
    }
    if (!Array.isArray(procedure.requiredApprovals)) {
        throw new errors_js_1.EmergencyError('procedure.requiredApprovals must be an array');
    }
    if (typeof procedure.timeout !== 'number' || procedure.timeout < 0) {
        throw new errors_js_1.EmergencyError('procedure.timeout must be a non-negative number');
    }
}
//# sourceMappingURL=emergency.js.map