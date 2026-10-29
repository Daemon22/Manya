/**
 * @manya-os/anonymize — OCR text handling.
 *
 * OCR output often contains misspelled PII that defeats exact-match
 * detectors. This module normalizes OCR output (common substitutions,
 * whitespace) before detection, and also detects OCR-specific artifacts
 * like bounding boxes that may leak layout-derivable identity info.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import { AnonymizeError } from '../errors.js';

/** Common OCR substitution errors. */
const OCR_SUBSTITUTIONS: ReadonlyArray<[RegExp, string]> = [
  [/\b0(?=\d{2,}\b)/g, 'O'],     // leading-zero words: probably letters
  [/5(?=[A-Za-z])/g, 'S'],
  [/1(?=[A-Za-z])/g, 'l'],
  [/\b[lI]\b/g, '1'],             // single-char l/I often means 1
  [/\bO\b/g, '0'],
  [/@/g, '@'],                     // no-op (stability)
  [/\s+/g, ' '],
];

/** Normalize OCR text — collapse whitespace, fix common digit/letter errors. */
export function normalizeOcrText(input: string): string {
  if (typeof input !== 'string') throw new AnonymizeError('normalizeOcrText: input must be string');
  let out = input;
  for (const [re, rep] of OCR_SUBSTITUTIONS) out = out.replace(re, rep);
  return out.trim();
}

/** A single OCR word with its bounding box (top-left origin, pixels). */
export interface OcrWord {
  text: string;
  x: number;
  y: number;
  w: number;
  h: number;
  confidence?: number;
}

/** A typed OCR page (words + their boxes). */
export interface OcrPage {
  width: number;
  height: number;
  words: OcrWord[];
}

/** Reconstruct plain text from an OCR page (words joined by spaces, lines preserved approximately). */
export function ocrPageToText(page: OcrPage): string {
  const lines = new Map<number, OcrWord[]>();
  for (const w of page.words) {
    const row = Math.floor(w.y / Math.max(10, (w.h || 10)));
    if (!lines.has(row)) lines.set(row, []);
    lines.get(row)!.push(w);
  }
  const sortedRows = [...lines.keys()].sort((a, b) => a - b);
  return sortedRows.map(r => {
    const ws = lines.get(r)!.sort((a, b) => a.x - b.x);
    return ws.map(w => w.text).join(' ');
  }).join('\n');
}

/** Strip OCR confidence fields and bounding boxes (which can leak layout info). */
export function stripOcrGeometry(page: OcrPage): { text: string } {
  return { text: ocrPageToText(page) };
}

/** Detect words that are likely OCR misreads of PII markers (e.g. `emaiI` for `email`). */
export function findOcrPiiCandidates(text: string): Array<{ start: number; end: number; text: string; hint: string }> {
  const out: Array<{ start: number; end: number; text: string; hint: string }> = [];
  const hints: Array<[RegExp, string]> = [
    [/\bemai[lI1]+\b/gi, 'email'],
    [/\bph(?:one|0ne)\b/gi, 'phone'],
    [/\b(?:soc(?:ial)?[\s-]*)?(?:sec(?:urity)?)?\s*\d{3}-?\s*\d{2}-?\s*\d{4}\b/gi, 'ssn'],
    [/\bpassw(?:ord|0rd|0rd)\b/gi, 'password'],
  ];
  for (const [re, hint] of hints) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      out.push({ start: m.index, end: m.index + m[0].length, text: m[0], hint });
    }
  }
  return out;
}
