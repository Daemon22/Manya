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
/** Ordered severity ranks for emergency states. */
export declare const STATE_RANK: Record<EmergencyState, number>;
/** All emergency states, ordered from least to most severe. */
export declare const STATE_ORDER: EmergencyState[];
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
export declare class EmergencyController {
    private state;
    private procedure?;
    private declaredAt?;
    private listeners;
    /** Returns the current emergency state. */
    getState(): EmergencyState;
    /** Returns the active procedure, if any. */
    getActiveProcedure(): EmergencyProcedure | undefined;
    /** Returns the ISO 8601 timestamp when the current state was declared. */
    getDeclaredAt(): string | undefined;
    /**
     * Declares an emergency at `state` and activates `procedure`. The procedure's
     * `state` field must match `state`. Throws `EmergencyError` when:
     *   - the state is `normal` (use `liftEmergency` instead)
     *   - the procedure's state does not match
     *   - escalation is more than one level higher than the current state
     *     (de-escalation is allowed by any amount)
     */
    declareEmergency(state: EmergencyState, procedure: EmergencyProcedure): void;
    /**
     * Lifts the emergency: sets state to `normal`, clears the procedure, and
     * emits the change.
     */
    liftEmergency(): void;
    /**
     * Returns true when `action` is allowed under the active procedure. When no
     * procedure is active (state is `normal`), all actions are allowed.
     *
     * Wildcards: an entry of `*` in `allowedActions` allows all actions; an
     * entry of `module:*` allows all actions in `module`.
     */
    isActionAllowed(action: string): boolean;
    /**
     * Returns true when the active procedure has timed out, given `now` (ISO
     * 8601). A timeout of 0 means no timeout.
     */
    isTimedOut(now: string): boolean;
    /**
     * Registers a listener that is invoked whenever the state changes.
     */
    onStateChange(listener: (state: EmergencyState, procedure?: EmergencyProcedure) => void): void;
    private emit;
}
/**
 * Validates an `EmergencyProcedure` structurally. Throws `EmergencyError` on
 * invalid fields.
 */
export declare function validateProcedure(procedure: EmergencyProcedure): void;
//# sourceMappingURL=emergency.d.ts.map