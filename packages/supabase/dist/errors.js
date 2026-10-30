"use strict";
/**
 * @manya-os/supabase — error classes.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigError = exports.MigrationError = exports.ValidationError = exports.ConflictError = exports.QueryTimeoutError = exports.ConnectionError = exports.SupabaseError = void 0;
exports.classifyError = classifyError;
exports.isRetryable = isRetryable;
/**
 * Base error for all Supabase adapter errors.
 */
class SupabaseError extends Error {
    constructor(message, cause) {
        super(message);
        this.name = 'SupabaseError';
        if (cause !== undefined) {
            this.cause = cause;
        }
    }
}
exports.SupabaseError = SupabaseError;
/**
 * Thrown when the Supabase client cannot connect or the connection drops.
 */
class ConnectionError extends SupabaseError {
    constructor(message, cause) {
        super(message, cause);
        this.name = 'ConnectionError';
    }
}
exports.ConnectionError = ConnectionError;
/**
 * Thrown when a query exceeds the configured timeout.
 */
class QueryTimeoutError extends SupabaseError {
    constructor(message, cause) {
        super(message, cause);
        this.name = 'QueryTimeoutError';
    }
}
exports.QueryTimeoutError = QueryTimeoutError;
/**
 * Thrown when a database constraint is violated (duplicate key, FK, etc.).
 */
class ConflictError extends SupabaseError {
    constructor(message, cause) {
        super(message, cause);
        this.name = 'ConflictError';
    }
}
exports.ConflictError = ConflictError;
/**
 * Thrown when input data fails validation before reaching the database.
 */
class ValidationError extends SupabaseError {
    constructor(message, cause) {
        super(message, cause);
        this.name = 'ValidationError';
    }
}
exports.ValidationError = ValidationError;
/**
 * Thrown when a migration fails to apply.
 */
class MigrationError extends SupabaseError {
    constructor(message, cause) {
        super(message, cause);
        this.name = 'MigrationError';
    }
}
exports.MigrationError = MigrationError;
/**
 * Thrown when configuration is missing or invalid.
 */
class ConfigError extends SupabaseError {
    constructor(message, cause) {
        super(message, cause);
        this.name = 'ConfigError';
    }
}
exports.ConfigError = ConfigError;
/**
 * Classifies a raw error into a typed SupabaseError for retry decisions.
 */
function classifyError(err) {
    if (err instanceof SupabaseError)
        return err;
    const msg = err instanceof Error
        ? err.message
        : typeof err === 'object' && err !== null
            ? [
                'message' in err ? String(err.message) : undefined,
                'details' in err ? String(err.details) : undefined,
                'code' in err ? String(err.code) : undefined,
            ].filter(Boolean).join(': ')
            : String(err);
    const lower = msg.toLowerCase();
    if (lower.includes('timeout') || lower.includes('etimedout')) {
        return new QueryTimeoutError(msg, err);
    }
    if (lower.includes('econnrefused') ||
        lower.includes('econnreset') ||
        lower.includes('enotfound') ||
        lower.includes('network') ||
        lower.includes('fetch failed')) {
        return new ConnectionError(msg, err);
    }
    if (lower.includes('duplicate') || lower.includes('unique') || lower.includes('conflict')) {
        return new ConflictError(msg, err);
    }
    return new SupabaseError(msg, err);
}
/**
 * Returns true if the error is transient and safe to retry.
 */
function isRetryable(err) {
    if (err instanceof ConnectionError)
        return true;
    if (err instanceof QueryTimeoutError)
        return true;
    const msg = err instanceof Error ? err.message : String(err);
    const lower = msg.toLowerCase();
    return lower.includes('503') || lower.includes('502') || lower.includes('overloaded');
}
//# sourceMappingURL=errors.js.map