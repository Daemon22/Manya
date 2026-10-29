/**
 * @manya-os/supabase — errors unit tests.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import {
  SupabaseError,
  ConnectionError,
  QueryTimeoutError,
  ConflictError,
  ValidationError,
  MigrationError,
  ConfigError,
  classifyError,
  isRetryable,
} from '../../src/errors.js';

describe('SupabaseError hierarchy', () => {
  it('SupabaseError has correct name and message', () => {
    const err = new SupabaseError('test message');
    expect(err.name).toBe('SupabaseError');
    expect(err.message).toBe('test message');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(SupabaseError);
  });

  it('SupabaseError preserves cause', () => {
    const cause = new Error('root cause');
    const err = new SupabaseError('wrapped', cause);
    expect(err.cause).toBe(cause);
  });

  it.each([
    [ConnectionError, 'ConnectionError'],
    [QueryTimeoutError, 'QueryTimeoutError'],
    [ConflictError, 'ConflictError'],
    [ValidationError, 'ValidationError'],
    [MigrationError, 'MigrationError'],
    [ConfigError, 'ConfigError'],
  ])('%s has correct name', (Cls, name) => {
    const err = new Cls('test');
    expect(err.name).toBe(name);
    expect(err).toBeInstanceOf(SupabaseError);
    expect(err).toBeInstanceOf(Error);
  });

  it('all subclasses preserve cause', () => {
    const cause = new Error('cause');
    expect(new ConnectionError('msg', cause).cause).toBe(cause);
    expect(new QueryTimeoutError('msg', cause).cause).toBe(cause);
    expect(new ConflictError('msg', cause).cause).toBe(cause);
    expect(new ValidationError('msg', cause).cause).toBe(cause);
    expect(new MigrationError('msg', cause).cause).toBe(cause);
    expect(new ConfigError('msg', cause).cause).toBe(cause);
  });
});

describe('classifyError', () => {
  it('returns SupabaseError instances unchanged', () => {
    const err = new ConnectionError('test');
    expect(classifyError(err)).toBe(err);
  });

  it('classifies timeout errors', () => {
    const err = classifyError(new Error('query timeout exceeded'));
    expect(err).toBeInstanceOf(QueryTimeoutError);
  });

  it('classifies ETIMEDOUT errors', () => {
    const err = classifyError(new Error('connect ETIMEDOUT'));
    expect(err).toBeInstanceOf(QueryTimeoutError);
  });

  it('classifies connection refused errors', () => {
    const err = classifyError(new Error('connect ECONNREFUSED'));
    expect(err).toBeInstanceOf(ConnectionError);
  });

  it('classifies connection reset errors', () => {
    const err = classifyError(new Error('ECONNRESET'));
    expect(err).toBeInstanceOf(ConnectionError);
  });

  it('classifies DNS errors', () => {
    const err = classifyError(new Error('getaddrinfo ENOTFOUND'));
    expect(err).toBeInstanceOf(ConnectionError);
  });

  it('classifies network errors', () => {
    const err = classifyError(new Error('network error'));
    expect(err).toBeInstanceOf(ConnectionError);
  });

  it('classifies fetch failed errors', () => {
    const err = classifyError(new Error('fetch failed'));
    expect(err).toBeInstanceOf(ConnectionError);
  });

  it('classifies duplicate key errors', () => {
    const err = classifyError(new Error('duplicate key value'));
    expect(err).toBeInstanceOf(ConflictError);
  });

  it('classifies unique constraint errors', () => {
    const err = classifyError(new Error('unique constraint violation'));
    expect(err).toBeInstanceOf(ConflictError);
  });

  it('classifies conflict errors', () => {
    const err = classifyError(new Error('conflict detected'));
    expect(err).toBeInstanceOf(ConflictError);
  });

  it('returns generic SupabaseError for unknown errors', () => {
    const err = classifyError(new Error('something unknown'));
    expect(err).toBeInstanceOf(SupabaseError);
    expect(err).not.toBeInstanceOf(ConnectionError);
    expect(err).not.toBeInstanceOf(QueryTimeoutError);
    expect(err).not.toBeInstanceOf(ConflictError);
  });

  it('handles non-Error values', () => {
    const err = classifyError('string error');
    expect(err).toBeInstanceOf(SupabaseError);
    expect(err.message).toBe('string error');
  });

  it('handles null/undefined', () => {
    expect(classifyError(null).message).toBe('null');
    expect(classifyError(undefined).message).toBe('undefined');
  });
});

describe('isRetryable', () => {
  it('returns true for ConnectionError', () => {
    expect(isRetryable(new ConnectionError('test'))).toBe(true);
  });

  it('returns true for QueryTimeoutError', () => {
    expect(isRetryable(new QueryTimeoutError('test'))).toBe(true);
  });

  it('returns true for 503 status', () => {
    expect(isRetryable(new Error('503 Service Unavailable'))).toBe(true);
  });

  it('returns true for 502 status', () => {
    expect(isRetryable(new Error('502 Bad Gateway'))).toBe(true);
  });

  it('returns true for overloaded', () => {
    expect(isRetryable(new Error('server overloaded'))).toBe(true);
  });

  it('returns false for ConflictError', () => {
    expect(isRetryable(new ConflictError('test'))).toBe(false);
  });

  it('returns false for ValidationError', () => {
    expect(isRetryable(new ValidationError('test'))).toBe(false);
  });

  it('returns false for generic errors', () => {
    expect(isRetryable(new Error('generic'))).toBe(false);
  });

  it('returns false for non-Error values', () => {
    expect(isRetryable('string')).toBe(false);
  });
});
