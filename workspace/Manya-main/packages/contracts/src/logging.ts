/**
 * @manya/contracts — structured logging (mirrors @manya/keyring pattern).
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

export interface Logger {
  debug(msg: string, meta?: Record<string, unknown>): void;
  info(msg: string, meta?: Record<string, unknown>): void;
  warn(msg: string, meta?: Record<string, unknown>): void;
  error(msg: string, meta?: Record<string, unknown>): void;
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

const LEVEL_RANK: Record<LogLevel, number> = {
  debug: 10, info: 20, warn: 30, error: 40, silent: 100,
};

/** Field names that are scrubbed from log metadata before emission. */
export const SCRUBBED_FIELD_NAMES = [
  'secret', 'token', 'apiKey', 'password', 'authorization',
  'privateKey', 'accessToken', 'refreshToken',
] as const;

/** Returns `true` if a field name should be scrubbed from logs. */
export function shouldScrubField(name: string): boolean {
  const lower = name.toLowerCase();
  for (const needle of SCRUBBED_FIELD_NAMES) {
    const nl = needle.toLowerCase();
    if (lower === nl) return true;
    if (lower.endsWith('_' + nl)) return true;
  }
  return false;
}

/** Deeply scrubs sensitive fields from log metadata. */
export function scrubMetadata(meta: unknown): unknown {
  if (meta === null || meta === undefined) return meta;
  if (typeof meta !== 'object') return meta;
  if (Buffer.isBuffer(meta)) return `[buffer:${meta.length}]`;
  if (meta instanceof Date) return meta.toISOString();
  if (Array.isArray(meta)) return meta.map(scrubMetadata);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(meta as Record<string, unknown>)) {
    out[k] = shouldScrubField(k) ? '[redacted]' : scrubMetadata(v);
  }
  return out;
}

/** Logger that emits JSON lines to stdout/stderr with secret scrubbing. */
export class ConsoleLogger implements Logger {
  private readonly levelRank: number;
  constructor(private readonly level: LogLevel = 'info') {
    this.levelRank = LEVEL_RANK[level] ?? LEVEL_RANK.info;
  }
  debug(msg: string, meta?: Record<string, unknown>): void { this.emit('debug', msg, meta); }
  info(msg: string, meta?: Record<string, unknown>): void { this.emit('info', msg, meta); }
  warn(msg: string, meta?: Record<string, unknown>): void { this.emit('warn', msg, meta); }
  error(msg: string, meta?: Record<string, unknown>): void { this.emit('error', msg, meta); }
  private emit(level: 'debug' | 'info' | 'warn' | 'error', msg: string, meta?: Record<string, unknown>): void {
    try {
      if (LEVEL_RANK[level] < this.levelRank) return;
      const entry = { level, msg, ts: new Date().toISOString(), ...(meta ? { meta: scrubMetadata(meta) as Record<string, unknown> } : {}) };
      const line = JSON.stringify(entry);
      if (level === 'error' || level === 'warn') process.stderr.write(line + '\n');
      else process.stdout.write(line + '\n');
    } catch { /* never throw */ }
  }
}

/** Logger that discards everything. */
export class SilentLogger implements Logger {
  debug(): void {}
  info(): void {}
  warn(): void {}
  error(): void {}
}
