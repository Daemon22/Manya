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
export class ConstitutionError extends Error {
  public readonly code: string;
  public override readonly cause?: unknown;
  constructor(message: string, code?: string, cause?: unknown) {
    super(message);
    this.name = new.target.name;
    this.code = code ?? 'CONSTITUTION_ERROR';
    if (cause !== undefined) this.cause = cause;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Raised when an ethical rule cannot be evaluated or is structurally invalid. */
export class RuleError extends ConstitutionError {
  constructor(message: string, cause?: unknown) { super(message, 'RULE_ERROR', cause); }
}

/** Raised when a policy condition cannot be parsed or a policy set is malformed. */
export class PolicyError extends ConstitutionError {
  constructor(message: string, cause?: unknown) { super(message, 'POLICY_ERROR', cause); }
}

/** Raised when a permission check fails structurally (e.g. unknown role, cycle). */
export class PermissionError extends ConstitutionError {
  constructor(message: string, cause?: unknown) { super(message, 'PERMISSION_ERROR', cause); }
}

/** Raised when a decision hierarchy is malformed (cycle, missing node, etc.). */
export class HierarchyError extends ConstitutionError {
  constructor(message: string, cause?: unknown) { super(message, 'HIERARCHY_ERROR', cause); }
}

/** Raised when an emergency-state transition or procedure is invalid. */
export class EmergencyError extends ConstitutionError {
  constructor(message: string, cause?: unknown) { super(message, 'EMERGENCY_ERROR', cause); }
}

/** Raised when a safety invariant is violated or a safety rule is malformed. */
export class SafetyError extends ConstitutionError {
  constructor(message: string, cause?: unknown) { super(message, 'SAFETY_ERROR', cause); }
}

/** Raised when a conflict cannot be resolved or a resolution strategy is invalid. */
export class ConflictError extends ConstitutionError {
  constructor(message: string, cause?: unknown) { super(message, 'CONFLICT_ERROR', cause); }
}

/** Raised when the runtime enforcement engine cannot evaluate an action. */
export class EnforcementError extends ConstitutionError {
  constructor(message: string, cause?: unknown) { super(message, 'ENFORCEMENT_ERROR', cause); }
}

/** Raised when a governance document is malformed or an operation is invalid. */
export class DocumentError extends ConstitutionError {
  constructor(message: string, cause?: unknown) { super(message, 'DOCUMENT_ERROR', cause); }
}
