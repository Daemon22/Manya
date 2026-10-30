/**
 * @manya-os/supabase — structured logger.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

/** Log levels in ascending severity. */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

/** Structured logger interface matching @manya-os/memory and @manya-os/ledger. */
export interface Logger {
  debug(msg: string, meta?: Record<string, unknown>): void;
  info(msg: string, meta?: Record<string, unknown>): void;
  warn(msg: string, meta?: Record<string, unknown>): void;
  error(msg: string, meta?: Record<string, unknown>): void;
}

const LEVEL_WEIGHT: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  silent: 4,
};

/** Keys that must never appear in log output. */
const SENSITIVE_KEYS = new Set([
  'serviceRoleKey', 'service_role', 'anonKey', 'anon_key',
  'authorization', 'password', 'secret', 'token', 'key',
]);

/** Recursively redact sensitive values in a meta object. */
function redact(meta: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(meta)) {
    if (SENSITIVE_KEYS.has(k.toLowerCase()) || SENSITIVE_KEYS.has(k)) {
      out[k] = '[REDACTED]';
    } else if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      out[k] = redact(v as Record<string, unknown>);
    } else {
      out[k] = v;
    }
  }
  return out;
}

/** Console-based structured logger with level filtering. */
export class ConsoleLogger implements Logger {
  private readonly weight: number;

  constructor(private readonly level: LogLevel = 'info') {
    this.weight = LEVEL_WEIGHT[level] ?? 1;
  }

  debug(msg: string, meta?: Record<string, unknown>): void {
    if (this.weight <= LEVEL_WEIGHT.debug) {
      console.debug(`[supabase:debug] ${msg}`, meta ? redact(meta) : '');
    }
  }

  info(msg: string, meta?: Record<string, unknown>): void {
    if (this.weight <= LEVEL_WEIGHT.info) {
      console.info(`[supabase:info] ${msg}`, meta ? redact(meta) : '');
    }
  }

  warn(msg: string, meta?: Record<string, unknown>): void {
    if (this.weight <= LEVEL_WEIGHT.warn) {
      console.warn(`[supabase:warn] ${msg}`, meta ? redact(meta) : '');
    }
  }

  error(msg: string, meta?: Record<string, unknown>): void {
    if (this.weight <= LEVEL_WEIGHT.error) {
      console.error(`[supabase:error] ${msg}`, meta ? redact(meta) : '');
    }
  }
}

/** No-op logger for silent mode and tests. */
export class SilentLogger implements Logger {
  debug(): void { /* noop */ }
  info(): void { /* noop */ }
  warn(): void { /* noop */ }
  error(): void { /* noop */ }
}

/** Factory that creates the appropriate logger. */
export function createLogger(level?: LogLevel, logger?: Logger): Logger {
  if (logger) return logger;
  if (level === 'silent') return new SilentLogger();
  return new ConsoleLogger(level ?? 'info');
}
