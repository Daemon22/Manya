/**
 * @manya-os/attest — structured logging with secret scrubbing.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

/**
 * Structured logger interface. Implementations must be safe to call from
 * cryptographic hot paths (i.e. they must not throw).
 */
export interface Logger {
  /** Log a debug message. */
  debug(msg: string, meta?: Record<string, unknown>): void;
  /** Log an informational message. */
  info(msg: string, meta?: Record<string, unknown>): void;
  /** Log a warning. */
  warn(msg: string, meta?: Record<string, unknown>): void;
  /** Log an error. */
  error(msg: string, meta?: Record<string, unknown>): void;
}

/** Log levels, ordered least to most severe. */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

const LEVEL_RANK: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  silent: 100,
};

/**
 * Field names that are scrubbed from logged metadata. The check is
 * case-insensitive and matches by suffix, so `sessionToken` is scrubbed
 * alongside `token`.
 */
export const SCRUBBED_FIELD_NAMES = [
  'privateKey',
  'password',
  'passphrase',
  'token',
  'secret',
  'credential',
  'iv',
  'tag',
  'share',
  'nonce',
  'signature',
  'macs',
  'machineId',
] as const;

const SCRUB_REGEX = new RegExp(
  '(?:' + SCRUBBED_FIELD_NAMES.map((n) => n.toLowerCase()).join('|') + ')$',
  'i'
);

/**
 * Returns `true` if a field name should be scrubbed.
 * @internal
 */
export function shouldScrubField(name: string): boolean {
  if (typeof name !== 'string') return false;
  // Match either the full name or a camelCase / snake_case suffix.
  const lower = name.toLowerCase();
  for (const needle of SCRUBBED_FIELD_NAMES) {
    const nl = needle.toLowerCase();
    if (lower === nl) return true;
    if (lower.endsWith('_' + nl)) return true;
    if (lower.endsWith(nl) && lower.length > nl.length) {
      // camelCase boundary, e.g. "sessionToken"
      const prevChar = name[name.length - nl.length - 1];
      if (prevChar && /[A-Z]/.test(prevChar)) return true;
    }
  }
  return SCRUB_REGEX.test(name);
}

/**
 * Deeply clone and scrub a metadata object. Returns a new object with secret
 * fields replaced by the literal string `[redacted]`. Buffers become
 * `[buffer:<length>]` unless the field is scrubbed.
 */
export function scrubMetadata(meta: unknown): unknown {
  if (meta === null || meta === undefined) return meta;
  if (typeof meta !== 'object') return meta;
  if (Buffer.isBuffer(meta)) return `[buffer:${meta.length}]`;
  if (meta instanceof Uint8Array) return `[uint8array:${meta.length}]`;
  if (meta instanceof Date) return meta.toISOString();
  if (Array.isArray(meta)) {
    return meta.map((v) => scrubMetadata(v));
  }
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(meta as Record<string, unknown>)) {
    if (shouldScrubField(key)) {
      out[key] = '[redacted]';
    } else {
      out[key] = scrubMetadata(value);
    }
  }
  return out;
}

/**
 * A {@link Logger} that writes JSON to stdout/stderr with secret scrubbing.
 *
 * Errors are caught — logging must never crash the host process.
 */
export class ConsoleLogger implements Logger {
  private readonly levelRank: number;

  constructor(private readonly level: LogLevel = 'info') {
    this.levelRank = LEVEL_RANK[level] ?? LEVEL_RANK.info;
  }

  /** @inheritdoc */
  debug(msg: string, meta?: Record<string, unknown>): void {
    this.emit('debug', msg, meta);
  }

  /** @inheritdoc */
  info(msg: string, meta?: Record<string, unknown>): void {
    this.emit('info', msg, meta);
  }

  /** @inheritdoc */
  warn(msg: string, meta?: Record<string, unknown>): void {
    this.emit('warn', msg, meta);
  }

  /** @inheritdoc */
  error(msg: string, meta?: Record<string, unknown>): void {
    this.emit('error', msg, meta);
  }

  private emit(level: 'debug' | 'info' | 'warn' | 'error', msg: string, meta?: Record<string, unknown>): void {
    try {
      if (LEVEL_RANK[level] < this.levelRank) return;
      const entry = {
        level,
        msg,
        ts: new Date().toISOString(),
        ...(meta ? { meta: scrubMetadata(meta) as Record<string, unknown> } : {}),
      };
      const line = JSON.stringify(entry);
      if (level === 'error' || level === 'warn') {
        process.stderr.write(line + '\n');
      } else {
        process.stdout.write(line + '\n');
      }
    } catch {
      // Swallow — logging must never throw.
    }
  }
}

/**
 * A {@link Logger} that drops every message. Useful as a default in tests.
 */
export class SilentLogger implements Logger {
  debug(): void {}
  info(): void {}
  warn(): void {}
  error(): void {}
}
