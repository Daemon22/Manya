"use strict";
/**
 * @manya-os/constitution — typed error hierarchy.
 *
 * Every public @manya-os/constitution API throws a subclass of
 * `ConstitutionError`. Errors carry a stable `code` string for programmatic
 * discrimination.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentError = exports.EnforcementError = exports.ConflictError = exports.SafetyError = exports.EmergencyError = exports.HierarchyError = exports.PermissionError = exports.PolicyError = exports.RuleError = exports.ConstitutionError = void 0;
/** Base class for all @manya-os/constitution errors. */
class ConstitutionError extends Error {
    code;
    cause;
    constructor(message, code, cause) {
        super(message);
        this.name = new.target.name;
        this.code = code ?? 'CONSTITUTION_ERROR';
        if (cause !== undefined)
            this.cause = cause;
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
exports.ConstitutionError = ConstitutionError;
/** Raised when an ethical rule cannot be evaluated or is structurally invalid. */
class RuleError extends ConstitutionError {
    constructor(message, cause) { super(message, 'RULE_ERROR', cause); }
}
exports.RuleError = RuleError;
/** Raised when a policy condition cannot be parsed or a policy set is malformed. */
class PolicyError extends ConstitutionError {
    constructor(message, cause) { super(message, 'POLICY_ERROR', cause); }
}
exports.PolicyError = PolicyError;
/** Raised when a permission check fails structurally (e.g. unknown role, cycle). */
class PermissionError extends ConstitutionError {
    constructor(message, cause) { super(message, 'PERMISSION_ERROR', cause); }
}
exports.PermissionError = PermissionError;
/** Raised when a decision hierarchy is malformed (cycle, missing node, etc.). */
class HierarchyError extends ConstitutionError {
    constructor(message, cause) { super(message, 'HIERARCHY_ERROR', cause); }
}
exports.HierarchyError = HierarchyError;
/** Raised when an emergency-state transition or procedure is invalid. */
class EmergencyError extends ConstitutionError {
    constructor(message, cause) { super(message, 'EMERGENCY_ERROR', cause); }
}
exports.EmergencyError = EmergencyError;
/** Raised when a safety invariant is violated or a safety rule is malformed. */
class SafetyError extends ConstitutionError {
    constructor(message, cause) { super(message, 'SAFETY_ERROR', cause); }
}
exports.SafetyError = SafetyError;
/** Raised when a conflict cannot be resolved or a resolution strategy is invalid. */
class ConflictError extends ConstitutionError {
    constructor(message, cause) { super(message, 'CONFLICT_ERROR', cause); }
}
exports.ConflictError = ConflictError;
/** Raised when the runtime enforcement engine cannot evaluate an action. */
class EnforcementError extends ConstitutionError {
    constructor(message, cause) { super(message, 'ENFORCEMENT_ERROR', cause); }
}
exports.EnforcementError = EnforcementError;
/** Raised when a governance document is malformed or an operation is invalid. */
class DocumentError extends ConstitutionError {
    constructor(message, cause) { super(message, 'DOCUMENT_ERROR', cause); }
}
exports.DocumentError = DocumentError;
//# sourceMappingURL=errors.js.map