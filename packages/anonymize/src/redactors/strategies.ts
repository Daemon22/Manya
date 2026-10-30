/**
 * @manya-os/anonymize — redaction strategies.
 *
 * A redactor transforms a finding into a replacement string. Strategies
 * differ in reversibility, determinism, and readability.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import { createHash } from 'crypto';
import type { Finding, Redaction, RedactionStrategy } from '../types.js';
import { RedactionError } from '../errors.js';

export interface Redactor {
  strategy: RedactionStrategy;
  redact(finding: Finding): string;
}

/** Mask: keep first/last char, replace middle with asterisks. */
export class MaskRedactor implements Redactor {
  public readonly strategy: RedactionStrategy = 'mask';
  redact(finding: Finding): string {
    const t = finding.text;
    if (t.length <= 2) return '*'.repeat(t.length);
    if (t.length <= 6) return t[0] + '*'.repeat(t.length - 2) + t[t.length - 1];
    return t.slice(0, 2) + '*'.repeat(Math.min(t.length - 4, 8)) + t.slice(-2);
  }
}

/** Hash: deterministic SHA-256 of the finding text (truncated). */
export class HashRedactor implements Redactor {
  public readonly strategy: RedactionStrategy = 'hash';
  constructor(private readonly prefix: string = 'sha256', private readonly length: number = 12) {
    if (length < 4 || length > 64) throw new RedactionError('HashRedactor.length must be in [4,64]');
  }
  redact(finding: Finding): string {
    const h = createHash('sha256').update(finding.text).digest('hex');
    return `[${this.prefix}:${h.slice(0, this.length)}]`;
  }
}

/** Token: reversible pseudonym with a per-category counter. */
export class TokenRedactor implements Redactor {
  public readonly strategy: RedactionStrategy = 'token';
  private counters = new Map<string, number>();
  private mapping = new Map<string, string>();

  constructor(private readonly prefixTemplate: (category: string) => string = (c) => c.toUpperCase()) {}

  redact(finding: Finding): string {
    const cached = this.mapping.get(finding.text);
    if (cached) return cached;
    const n = (this.counters.get(finding.category) ?? 0) + 1;
    this.counters.set(finding.category, n);
    const token = `[${this.prefixTemplate(finding.category)}_${String(n).padStart(3, '0')}]`;
    this.mapping.set(finding.text, token);
    return token;
  }

  /** Return the original→token map (for de-identification logs only). */
  getMapping(): ReadonlyMap<string, string> { return this.mapping; }
}

/** Redact: full replacement with `[REDACTED]`. */
export class FullRedactor implements Redactor {
  public readonly strategy: RedactionStrategy = 'redact';
  constructor(private readonly replacement: string = '[REDACTED]') {}
  redact(): string { return this.replacement; }
}

/** Generalize: coarse-grain numeric values (e.g. age → age band). */
export class GeneralizeRedactor implements Redactor {
  public readonly strategy: RedactionStrategy = 'generalize';
  redact(finding: Finding): string {
    const num = parseInt(finding.text, 10);
    if (!Number.isNaN(num)) {
      if (finding.category === 'date_of_birth' || finding.category === 'phi_age') {
        const band = Math.floor(num / 10) * 10;
        return `[age:${band}-${band + 9}]`;
      }
      return `[num:${Math.floor(num / 10) * 10}+]`;
    }
    return '[generalized]';
  }
}

/** Synthesize: replace with a format-preserving fake. */
export class SynthesizeRedactor implements Redactor {
  public readonly strategy: RedactionStrategy = 'synthesize';
  redact(finding: Finding): string {
    switch (finding.category) {
      case 'email_address':
        return `user${Math.floor(Math.random() * 9999)}@example.com`;
      case 'phone_number':
        return `+1-555-01${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}-${String(Math.floor(Math.random() * 9999)).padStart(4, '0')}`;
      case 'credit_card':
        return '4111-1111-1111-1111';
      case 'ip_address':
        return `10.0.0.${Math.floor(Math.random() * 254) + 1}`;
      case 'person_name':
        return ['Alex Sample', 'Sam Test', 'Pat Example', 'Jordan Demo'][Math.floor(Math.random() * 4)];
      default:
        return '[synthesized]';
    }
  }
}

/** Apply a sequence of redactions to the input. */
export function applyRedactions(
  input: string,
  findings: Finding[],
  redactorFor: (finding: Finding) => Redactor,
): { output: string; redactions: Redaction[] } {
  // Sort descending by start so we can patch the string from end→beginning
  // without invalidating later offsets.
  const ordered = [...findings].sort((a, b) => b.start - a.start);
  let out = input;
  const redactions: Redaction[] = [];
  for (const f of ordered) {
    const r = redactorFor(f);
    const replacement = r.redact(f);
    out = out.slice(0, f.start) + replacement + out.slice(f.end);
    redactions.push({ finding: f, replacement, strategy: r.strategy });
  }
  redactions.reverse();
  return { output: out, redactions };
}
