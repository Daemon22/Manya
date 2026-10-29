/**
 * @manya-os/supabase — error classes.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
/**
 * Base error for all Supabase adapter errors.
 */
export declare class SupabaseError extends Error {
    constructor(message: string, cause?: unknown);
}
/**
 * Thrown when the Supabase client cannot connect or the connection drops.
 */
export declare class ConnectionError extends SupabaseError {
    constructor(message: string, cause?: unknown);
}
/**
 * Thrown when a query exceeds the configured timeout.
 */
export declare class QueryTimeoutError extends SupabaseError {
    constructor(message: string, cause?: unknown);
}
/**
 * Thrown when a database constraint is violated (duplicate key, FK, etc.).
 */
export declare class ConflictError extends SupabaseError {
    constructor(message: string, cause?: unknown);
}
/**
 * Thrown when input data fails validation before reaching the database.
 */
export declare class ValidationError extends SupabaseError {
    constructor(message: string, cause?: unknown);
}
/**
 * Thrown when a migration fails to apply.
 */
export declare class MigrationError extends SupabaseError {
    constructor(message: string, cause?: unknown);
}
/**
 * Thrown when configuration is missing or invalid.
 */
export declare class ConfigError extends SupabaseError {
    constructor(message: string, cause?: unknown);
}
/**
 * Classifies a raw error into a typed SupabaseError for retry decisions.
 */
export declare function classifyError(err: unknown): SupabaseError;
/**
 * Returns true if the error is transient and safe to retry.
 */
export declare function isRetryable(err: unknown): boolean;
//# sourceMappingURL=errors.d.ts.map