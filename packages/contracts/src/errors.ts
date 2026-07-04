/**
 * @manya/contracts — typed error hierarchy.
 *
 * Every public @manya/contracts API throws a subclass of `ContractsError`.
 * Errors carry a stable `code` string for programmatic discrimination; for
 * `ManifestError`, the constructor accepts an explicit `code` so that each
 * failure mode (invalid name, invalid version, invalid dependency, ...) has
 * its own stable code while still being an instance of `ManifestError`.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

/** Base class for all @manya/contracts errors. */
export class ContractsError extends Error {
  public readonly code: string;
  public override readonly cause?: unknown;
  constructor(message: string, code?: string, cause?: unknown) {
    super(message);
    this.name = new.target.name;
    this.code = code ?? 'CONTRACTS_ERROR';
    if (cause !== undefined) this.cause = cause;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Raised when a schema definition cannot be compiled or is structurally invalid. */
export class SchemaError extends ContractsError {
  constructor(message: string, cause?: unknown) { super(message, 'SCHEMA_ERROR', cause); }
}

/**
 * Raised when a manifest is structurally invalid. Accepts an explicit `code`
 * so each failure mode (`MANIFEST_INVALID_NAME`, `MANIFEST_INVALID_VERSION`,
 * `MANIFEST_INVALID_DEPENDENCY`, `MANIFEST_MISSING_FIELD`,
 * `MANIFEST_INVALID_EXPORTS`, `MANIFEST_INVALID_IMPORTS`,
 * `MANIFEST_INVALID_CAPABILITIES`) is distinguishable while still being an
 * instance of `ManifestError`.
 */
export class ManifestError extends ContractsError {
  constructor(message: string, code?: string, cause?: unknown) {
    super(message, code ?? 'MANIFEST_ERROR', cause);
  }
}

/** Stable `ManifestError` codes — one per failure mode. */
export const MANIFEST_ERROR_CODES = {
  INVALID_NAME: 'MANIFEST_INVALID_NAME',
  INVALID_VERSION: 'MANIFEST_INVALID_VERSION',
  INVALID_DEPENDENCY: 'MANIFEST_INVALID_DEPENDENCY',
  MISSING_FIELD: 'MANIFEST_MISSING_FIELD',
  INVALID_EXPORTS: 'MANIFEST_INVALID_EXPORTS',
  INVALID_IMPORTS: 'MANIFEST_INVALID_IMPORTS',
  INVALID_CAPABILITIES: 'MANIFEST_INVALID_CAPABILITIES',
  INVALID_DEPENDENCIES: 'MANIFEST_INVALID_DEPENDENCIES',
} as const;

/** Raised when version compatibility checks fail. */
export class CompatibilityError extends ContractsError {
  constructor(message: string, cause?: unknown) { super(message, 'COMPATIBILITY_ERROR', cause); }
}

/** Raised when an API request or response fails validation. */
export class ApiValidationError extends ContractsError {
  constructor(message: string, cause?: unknown) { super(message, 'API_VALIDATION_ERROR', cause); }
}

/** Raised when schema synchronization cannot proceed (e.g. unresolvable conflict). */
export class SyncError extends ContractsError {
  constructor(message: string, cause?: unknown) { super(message, 'SYNC_ERROR', cause); }
}

/** Raised when a boundary policy is violated or structurally invalid. */
export class BoundaryError extends ContractsError {
  constructor(message: string, cause?: unknown) { super(message, 'BOUNDARY_ERROR', cause); }
}

/** Raised when a validation report cannot be built, aggregated, or serialized. */
export class ReportingError extends ContractsError {
  constructor(message: string, cause?: unknown) { super(message, 'REPORTING_ERROR', cause); }
}
