"use strict";
/**
 * @manya-os/contracts — typed error hierarchy.
 *
 * Every public @manya-os/contracts API throws a subclass of `ContractsError`.
 * Errors carry a stable `code` string for programmatic discrimination; for
 * `ManifestError`, the constructor accepts an explicit `code` so that each
 * failure mode (invalid name, invalid version, invalid dependency, ...) has
 * its own stable code while still being an instance of `ManifestError`.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportingError = exports.BoundaryError = exports.SyncError = exports.ApiValidationError = exports.CompatibilityError = exports.MANIFEST_ERROR_CODES = exports.ManifestError = exports.SchemaError = exports.ContractsError = void 0;
/** Base class for all @manya-os/contracts errors. */
class ContractsError extends Error {
    code;
    cause;
    constructor(message, code, cause) {
        super(message);
        this.name = new.target.name;
        this.code = code ?? 'CONTRACTS_ERROR';
        if (cause !== undefined)
            this.cause = cause;
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
exports.ContractsError = ContractsError;
/** Raised when a schema definition cannot be compiled or is structurally invalid. */
class SchemaError extends ContractsError {
    constructor(message, cause) { super(message, 'SCHEMA_ERROR', cause); }
}
exports.SchemaError = SchemaError;
/**
 * Raised when a manifest is structurally invalid. Accepts an explicit `code`
 * so each failure mode (`MANIFEST_INVALID_NAME`, `MANIFEST_INVALID_VERSION`,
 * `MANIFEST_INVALID_DEPENDENCY`, `MANIFEST_MISSING_FIELD`,
 * `MANIFEST_INVALID_EXPORTS`, `MANIFEST_INVALID_IMPORTS`,
 * `MANIFEST_INVALID_CAPABILITIES`) is distinguishable while still being an
 * instance of `ManifestError`.
 */
class ManifestError extends ContractsError {
    constructor(message, code, cause) {
        super(message, code ?? 'MANIFEST_ERROR', cause);
    }
}
exports.ManifestError = ManifestError;
/** Stable `ManifestError` codes — one per failure mode. */
exports.MANIFEST_ERROR_CODES = {
    INVALID_NAME: 'MANIFEST_INVALID_NAME',
    INVALID_VERSION: 'MANIFEST_INVALID_VERSION',
    INVALID_DEPENDENCY: 'MANIFEST_INVALID_DEPENDENCY',
    MISSING_FIELD: 'MANIFEST_MISSING_FIELD',
    INVALID_EXPORTS: 'MANIFEST_INVALID_EXPORTS',
    INVALID_IMPORTS: 'MANIFEST_INVALID_IMPORTS',
    INVALID_CAPABILITIES: 'MANIFEST_INVALID_CAPABILITIES',
    INVALID_DEPENDENCIES: 'MANIFEST_INVALID_DEPENDENCIES',
};
/** Raised when version compatibility checks fail. */
class CompatibilityError extends ContractsError {
    constructor(message, cause) { super(message, 'COMPATIBILITY_ERROR', cause); }
}
exports.CompatibilityError = CompatibilityError;
/** Raised when an API request or response fails validation. */
class ApiValidationError extends ContractsError {
    constructor(message, cause) { super(message, 'API_VALIDATION_ERROR', cause); }
}
exports.ApiValidationError = ApiValidationError;
/** Raised when schema synchronization cannot proceed (e.g. unresolvable conflict). */
class SyncError extends ContractsError {
    constructor(message, cause) { super(message, 'SYNC_ERROR', cause); }
}
exports.SyncError = SyncError;
/** Raised when a boundary policy is violated or structurally invalid. */
class BoundaryError extends ContractsError {
    constructor(message, cause) { super(message, 'BOUNDARY_ERROR', cause); }
}
exports.BoundaryError = BoundaryError;
/** Raised when a validation report cannot be built, aggregated, or serialized. */
class ReportingError extends ContractsError {
    constructor(message, cause) { super(message, 'REPORTING_ERROR', cause); }
}
exports.ReportingError = ReportingError;
//# sourceMappingURL=errors.js.map