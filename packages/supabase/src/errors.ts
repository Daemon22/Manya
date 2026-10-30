/**
 * @manya-os/supabase — error classes.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

/**
 * Base error for all Supabase adapter errors.
 */
export class SupabaseError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'SupabaseError';
    if (cause !== undefined) {
      (this as { cause: unknown }).cause = cause;
    }
  }
}

/**
 * Thrown when the Supabase client cannot connect or the connection drops.
 */
export class ConnectionError extends SupabaseError {
  constructor(message: string, cause?: unknown) {
    super(message, cause);
    this.name = 'ConnectionError';
  }
}

/**
 * Thrown when a query exceeds the configured timeout.
 */
export class QueryTimeoutError extends SupabaseError {
  constructor(message: string, cause?: unknown) {
    super(message, cause);
    this.name = 'QueryTimeoutError';
  }
}

/**
 * Thrown when a database constraint is violated (duplicate key, FK, etc.).
 */
export class ConflictError extends SupabaseError {
  constructor(message: string, cause?: unknown) {
    super(message, cause);
    this.name = 'ConflictError';
  }
}

/**
 * Thrown when input data fails validation before reaching the database.
 */
export class ValidationError extends SupabaseError {
  constructor(message: string, cause?: unknown) {
    super(message, cause);
    this.name = 'ValidationError';
  }
}

/**
 * Thrown when a migration fails to apply.
 */
export class MigrationError extends SupabaseError {
  constructor(message: string, cause?: unknown) {
    super(message, cause);
    this.name = 'MigrationError';
  }
}

/**
 * Thrown when configuration is missing or invalid.
 */
export class ConfigError extends SupabaseError {
  constructor(message: string, cause?: unknown) {
    super(message, cause);
    this.name = 'ConfigError';
  }
}

/**
 * Classifies a raw error into a typed SupabaseError for retry decisions.
 */
export function classifyError(err: unknown): SupabaseError {
  if (err instanceof SupabaseError) return err;

  const msg = err instanceof Error
    ? err.message
    : typeof err === 'object' && err !== null
      ? [
          'message' in err ? String((err as { message?: unknown }).message) : undefined,
          'details' in err ? String((err as { details?: unknown }).details) : undefined,
          'code' in err ? String((err as { code?: unknown }).code) : undefined,
        ].filter(Boolean).join(': ')
      : String(err);
  const lower = msg.toLowerCase();

  if (lower.includes('timeout') || lower.includes('etimedout')) {
    return new QueryTimeoutError(msg, err);
  }
  if (
    lower.includes('econnrefused') ||
    lower.includes('econnreset') ||
    lower.includes('enotfound') ||
    lower.includes('network') ||
    lower.includes('fetch failed')
  ) {
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
export function isRetryable(err: unknown): boolean {
  if (err instanceof ConnectionError) return true;
  if (err instanceof QueryTimeoutError) return true;
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();
  return lower.includes('503') || lower.includes('502') || lower.includes('overloaded');
}
