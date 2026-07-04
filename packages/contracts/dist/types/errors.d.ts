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
export declare class ContractsError extends Error {
    readonly code: string;
    readonly cause?: unknown;
    constructor(message: string, code?: string, cause?: unknown);
}
/** Raised when a schema definition cannot be compiled or is structurally invalid. */
export declare class SchemaError extends ContractsError {
    constructor(message: string, cause?: unknown);
}
/**
 * Raised when a manifest is structurally invalid. Accepts an explicit `code`
 * so each failure mode (`MANIFEST_INVALID_NAME`, `MANIFEST_INVALID_VERSION`,
 * `MANIFEST_INVALID_DEPENDENCY`, `MANIFEST_MISSING_FIELD`,
 * `MANIFEST_INVALID_EXPORTS`, `MANIFEST_INVALID_IMPORTS`,
 * `MANIFEST_INVALID_CAPABILITIES`) is distinguishable while still being an
 * instance of `ManifestError`.
 */
export declare class ManifestError extends ContractsError {
    constructor(message: string, code?: string, cause?: unknown);
}
/** Stable `ManifestError` codes — one per failure mode. */
export declare const MANIFEST_ERROR_CODES: {
    readonly INVALID_NAME: "MANIFEST_INVALID_NAME";
    readonly INVALID_VERSION: "MANIFEST_INVALID_VERSION";
    readonly INVALID_DEPENDENCY: "MANIFEST_INVALID_DEPENDENCY";
    readonly MISSING_FIELD: "MANIFEST_MISSING_FIELD";
    readonly INVALID_EXPORTS: "MANIFEST_INVALID_EXPORTS";
    readonly INVALID_IMPORTS: "MANIFEST_INVALID_IMPORTS";
    readonly INVALID_CAPABILITIES: "MANIFEST_INVALID_CAPABILITIES";
    readonly INVALID_DEPENDENCIES: "MANIFEST_INVALID_DEPENDENCIES";
};
/** Raised when version compatibility checks fail. */
export declare class CompatibilityError extends ContractsError {
    constructor(message: string, cause?: unknown);
}
/** Raised when an API request or response fails validation. */
export declare class ApiValidationError extends ContractsError {
    constructor(message: string, cause?: unknown);
}
/** Raised when schema synchronization cannot proceed (e.g. unresolvable conflict). */
export declare class SyncError extends ContractsError {
    constructor(message: string, cause?: unknown);
}
/** Raised when a boundary policy is violated or structurally invalid. */
export declare class BoundaryError extends ContractsError {
    constructor(message: string, cause?: unknown);
}
/** Raised when a validation report cannot be built, aggregated, or serialized. */
export declare class ReportingError extends ContractsError {
    constructor(message: string, cause?: unknown);
}
//# sourceMappingURL=errors.d.ts.map