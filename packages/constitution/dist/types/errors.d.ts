/**
 * @manya/constitution — typed error hierarchy.
 *
 * Every public @manya/constitution API throws a subclass of
 * `ConstitutionError`. Errors carry a stable `code` string for programmatic
 * discrimination.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
/** Base class for all @manya/constitution errors. */
export declare class ConstitutionError extends Error {
    readonly code: string;
    readonly cause?: unknown;
    constructor(message: string, code?: string, cause?: unknown);
}
/** Raised when an ethical rule cannot be evaluated or is structurally invalid. */
export declare class RuleError extends ConstitutionError {
    constructor(message: string, cause?: unknown);
}
/** Raised when a policy condition cannot be parsed or a policy set is malformed. */
export declare class PolicyError extends ConstitutionError {
    constructor(message: string, cause?: unknown);
}
/** Raised when a permission check fails structurally (e.g. unknown role, cycle). */
export declare class PermissionError extends ConstitutionError {
    constructor(message: string, cause?: unknown);
}
/** Raised when a decision hierarchy is malformed (cycle, missing node, etc.). */
export declare class HierarchyError extends ConstitutionError {
    constructor(message: string, cause?: unknown);
}
/** Raised when an emergency-state transition or procedure is invalid. */
export declare class EmergencyError extends ConstitutionError {
    constructor(message: string, cause?: unknown);
}
/** Raised when a safety invariant is violated or a safety rule is malformed. */
export declare class SafetyError extends ConstitutionError {
    constructor(message: string, cause?: unknown);
}
/** Raised when a conflict cannot be resolved or a resolution strategy is invalid. */
export declare class ConflictError extends ConstitutionError {
    constructor(message: string, cause?: unknown);
}
/** Raised when the runtime enforcement engine cannot evaluate an action. */
export declare class EnforcementError extends ConstitutionError {
    constructor(message: string, cause?: unknown);
}
/** Raised when a governance document is malformed or an operation is invalid. */
export declare class DocumentError extends ConstitutionError {
    constructor(message: string, cause?: unknown);
}
//# sourceMappingURL=errors.d.ts.map