/**
 * @manya-os/anonymize — pattern-based detectors (regex-backed).
 *
 * Each detector is intentionally narrow and conservative. False positives
 * are minimized by requiring word boundaries and contextual cues.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import type { Finding, PIICategory, PHICategory } from '../types.js';
import type { Detector, DetectorConfig } from './registry.js';
import { makeFinding } from './registry.js';

interface PatternConfig extends DetectorConfig {}

/** Build a regex detector. */
function regexDetector(
  name: string,
  category: PIICategory | PHICategory,
  pattern: RegExp,
  confidence: number,
): Detector<PatternConfig> {
  return {
    name,
    categories: [category],
    defaultConfig: { minConfidence: 0.5, enabled: true },
    detect(input: string, config?: Partial<PatternConfig>): Finding[] {
      const out: Finding[] = [];
      const re = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g');
      let m: RegExpExecArray | null;
      while ((m = re.exec(input)) !== null) {
        if (m.index === m.index + m[0].length) { re.lastIndex++; continue; }
        const f = makeFinding(input, m.index, m.index + m[0].length, category, confidence, name);
        if (f) out.push(f);
      }
      return out;
    },
  };
}

// ---- Email ----
export const emailDetector: Detector<PatternConfig> = regexDetector(
  'email',
  'email_address',
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
  0.95,
);

// ---- Phone numbers (international, conservative) ----
export const phoneDetector: Detector<PatternConfig> = regexDetector(
  'phone',
  'phone_number',
  /(?:(?:\+|00)\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?){2,4}\d{2,4}(?:[\s.-]?\d{1,4})?\b/g,
  0.7,
);

// ---- IPv4 ----
export const ipv4Detector: Detector<PatternConfig> = regexDetector(
  'ipv4',
  'ip_address',
  /\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b/g,
  0.95,
);

// ---- IPv6 (simplified) ----
export const ipv6Detector: Detector<PatternConfig> = regexDetector(
  'ipv6',
  'ip_address',
  /\b(?:[A-F0-9]{1,4}:){2,7}[A-F0-9]{1,4}\b/gi,
  0.6,
);

// ---- MAC address ----
export const macDetector: Detector<PatternConfig> = regexDetector(
  'mac',
  'mac_address',
  /\b(?:[0-9A-F]{2}[:-]){5}[0-9A-F]{2}\b/gi,
  0.95,
);

// ---- URL ----
export const urlDetector: Detector<PatternConfig> = regexDetector(
  'url',
  'url',
  /\bhttps?:\/\/[^\s<>"']+[^\s<>"'.;,!?)]/gi,
  0.9,
);

// ---- Credit card (Luhn-validated) ----
export const creditCardDetector: Detector<PatternConfig> = {
  name: 'credit_card',
  categories: ['credit_card'],
  defaultConfig: { minConfidence: 0.8, enabled: true },
  detect(input: string): Finding[] {
    const out: Finding[] = [];
    const re = /\b(?:\d[ -]*?){13,19}\b/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(input)) !== null) {
      // Strip non-digit chars (spaces, dashes) before Luhn check.
      const digits = m[0].replace(/[^\d]/g, '');
      if (digits.length < 13 || digits.length > 19) continue;
      if (!luhnValid(digits)) continue;
      const f = makeFinding(input, m.index, m.index + m[0].length, 'credit_card', 0.92, 'credit_card');
      if (f) out.push(f);
    }
    return out;
  },
};

/** Luhn checksum. */
export function luhnValid(digits: string): boolean {
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = digits.charCodeAt(i) - 48;
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum > 0 && sum % 10 === 0;
}

// ---- IBAN (simplified) ----
export const ibanDetector: Detector<PatternConfig> = regexDetector(
  'iban',
  'bank_account',
  /\b[A-Z]{2}\d{2}(?:[ ]?[A-Z0-9]{1,4}){4,8}\b/g,
  0.85,
);

// ---- JWT ----
export const jwtDetector: Detector<PatternConfig> = regexDetector(
  'jwt',
  'jwt_token',
  /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g,
  0.95,
);

// ---- API key (generic 32+ char base64-ish) ----
export const apiKeyDetector: Detector<PatternConfig> = regexDetector(
  'api_key',
  'api_key',
  /\b(?:sk|pk|api[_-]?key|key)[_:-][A-Za-z0-9]{24,}\b/gi,
  0.75,
);

// ---- ISO dates (YYYY-MM-DD) ----
export const isoDateDetector: Detector<PatternConfig> = regexDetector(
  'iso_date',
  'date',
  /\b(?:19|20)\d{2}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])\b/g,
  0.7,
);

// ---- Postal codes (US ZIP, UK, CA) ----
export const postalCodeDetector: Detector<PatternConfig> = regexDetector(
  'postal_code',
  'postal_code',
  /\b(?:\d{5}(?:-\d{4})?|[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2})\b/g,
  0.6,
);

// ---- SSN (US) — flagged as national_id ----
export const usSsnDetector: Detector<PatternConfig> = regexDetector(
  'us_ssn',
  'national_id',
  /\b\d{3}-\d{2}-\d{4}\b/g,
  0.9,
);

// ---- South African ID (13 digits, includes DOB) ----
export const zaIdDetector: Detector<PatternConfig> = {
  name: 'za_id',
  categories: ['national_id'],
  defaultConfig: { minConfidence: 0.9, enabled: true },
  detect(input: string): Finding[] {
    const out: Finding[] = [];
    const re = /\b(\d{2})(\d{2})(\d{2})(\d{4})(\d)(\d{2})\b/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(input)) !== null) {
      const yy = parseInt(m[1], 10);
      const mm = parseInt(m[2], 10);
      const dd = parseInt(m[3], 10);
      if (mm < 1 || mm > 12) continue;
      if (dd < 1 || dd > 31) continue;
      // Validate SA-ID checksum
      if (!zaIdChecksumValid(m[0])) continue;
      const f = makeFinding(input, m.index, m.index + m[0].length, 'national_id', 0.95, 'za_id');
      if (f) out.push(f);
    }
    return out;
  },
};

/** South African ID number checksum (Luhn-like over 13 digits). */
export function zaIdChecksumValid(id: string): boolean {
  if (!/^\d{13}$/.test(id)) return false;
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const n = parseInt(id[i], 10);
    sum += (i % 2 === 0) ? n : (n * 2 > 9 ? n * 2 - 9 : n * 2);
  }
  const check = (10 - (sum % 10)) % 10;
  return check === parseInt(id[12], 10);
}

export const ALL_PATTERN_DETECTORS: Detector[] = [
  emailDetector,
  phoneDetector,
  ipv4Detector,
  ipv6Detector,
  macDetector,
  urlDetector,
  creditCardDetector,
  ibanDetector,
  jwtDetector,
  apiKeyDetector,
  isoDateDetector,
  postalCodeDetector,
  usSsnDetector,
  zaIdDetector,
];
