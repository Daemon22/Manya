/**
 * @manya/customs-shield — sanctions screening.
 *
 * Implements name-based fuzzy matching against a sanctions list. The list
 * is configurable via `setSanctionsList`. A small built-in list of
 * country-level sanctions is provided as a starting point.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import type { SanctionsEntry, TradeParty, ShieldFinding } from '../types.js';
import { SanctionsError } from '../errors.js';

/** Built-in country-level sanctions (subset — production deployments must load the full list). */
export const DEFAULT_COUNTRY_SANCTIONS: SanctionsEntry[] = [
  { list: 'OFAC', name: 'Cuba', sanctionedCountry: 'CU', program: 'Cuban Assets Control Regulations' },
  { list: 'OFAC', name: 'Iran', sanctionedCountry: 'IR', program: 'Iranian Transactions and Sanctions Regulations' },
  { list: 'OFAC', name: 'North Korea', sanctionedCountry: 'KP', program: 'North Korea Sanctions Policy' },
  { list: 'OFAC', name: 'Syria', sanctionedCountry: 'SY', program: 'Syrian Civilian Protection' },
  { list: 'EU', name: 'Russia', sanctionedCountry: 'RU', program: 'EU Sanctions Regulation 833/2014' },
  { list: 'EU', name: 'Belarus', sanctionedCountry: 'BY', program: 'EU Belarus Sanctions' },
  { list: 'UN', name: 'Sudan', sanctionedCountry: 'SD', program: 'UN Security Council Resolution 1591' },
  { list: 'UK', name: 'Myanmar', sanctionedCountry: 'MM', program: 'UK Myanmar Sanctions' },
];

let globalSanctionsList: SanctionsEntry[] = [...DEFAULT_COUNTRY_SANCTIONS];

/** Replace the global sanctions list. */
export function setSanctionsList(list: SanctionsEntry[]): void {
  if (!Array.isArray(list)) throw new SanctionsError('Sanctions list must be an array');
  globalSanctionsList = list;
}

/** Get the global sanctions list. */
export function getSanctionsList(): SanctionsEntry[] {
  return globalSanctionsList;
}

/** Normalize a name for matching — uppercase, strip punctuation, collapse spaces. */
export function normalizeName(name: string): string {
  if (typeof name !== 'string') return '';
  return name.toUpperCase()
    .replace(/[''`-]/g, '')           // remove apostrophes/hyphens (they're part of names)
    .replace(/[^A-Z0-9\s]/g, ' ')     // replace other punctuation with space
    .replace(/\s+/g, ' ')
    .trim();
}

/** Levenshtein distance — for fuzzy matching. */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  let prev = new Array(b.length + 1);
  let curr = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[b.length];
}

/** Similarity ratio in [0,1] based on Levenshtein. */
export function similarity(a: string, b: string): number {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (na.length === 0 && nb.length === 0) return 1;
  const d = levenshtein(na, nb);
  return 1 - d / Math.max(na.length, nb.length);
}

/** Result of screening a single party. */
export interface ScreeningResult {
  party: TradeParty;
  hits: Array<{
    entry: SanctionsEntry;
    confidence: number;
    matchType: 'exact' | 'partial' | 'fuzzy';
    matchBasis: 'country' | 'name';
  }>;
}

/** Screen a single party against the sanctions list. */
export function screenParty(party: TradeParty, threshold = 0.75): ScreeningResult {
  if (!party) throw new SanctionsError('screenParty: party is required');
  const hits: ScreeningResult['hits'] = [];
  const namesToCheck = [party.name, ...(party.aliases ?? [])];
  for (const entry of globalSanctionsList) {
    // Country-level sanctions — direct country match.
    if (entry.sanctionedCountry && entry.sanctionedCountry === party.country) {
      hits.push({ entry, confidence: 1.0, matchType: 'exact', matchBasis: 'country' });
      continue;
    }
    // Name match (against entry.name + entry.aliases).
    const entryNames = [entry.name, ...(entry.aliases ?? [])];
    let bestSim = 0;
    let bestType: 'exact' | 'partial' | 'fuzzy' = 'fuzzy';
    for (const candidate of namesToCheck) {
      for (const entryName of entryNames) {
        const sim = similarity(candidate, entryName);
        if (sim === 1) { bestSim = 1; bestType = 'exact'; break; }
        if (sim > bestSim) {
          bestSim = sim;
          bestType = sim >= 0.95 ? 'exact' : sim >= 0.85 ? 'partial' : 'fuzzy';
        }
      }
      if (bestSim === 1) break;
    }
    if (bestSim >= threshold) {
      hits.push({ entry, confidence: bestSim, matchType: bestType, matchBasis: 'name' });
    }
  }
  return { party, hits };
}

/** Screen multiple parties and return findings. */
export function screenParties(parties: TradeParty[], threshold = 0.75): ShieldFinding[] {
  const findings: ShieldFinding[] = [];
  for (const p of parties) {
    const result = screenParty(p, threshold);
    for (const h of result.hits) {
      let category: ShieldFinding['category'];
      let severity: ShieldFinding['severity'];
      if (h.matchBasis === 'country') {
        category = 'sanctions_country_hit';
        severity = 'critical';
      } else {
        category = 'sanctions_hit';
        severity = h.matchType === 'exact' ? 'critical' : h.matchType === 'partial' ? 'high' : 'medium';
      }
      findings.push({
        category,
        severity,
        message: `Potential sanctions match: party '${p.name}' (${p.country}) matches '${h.entry.name}' on ${h.entry.list} list (${h.entry.program ?? 'n/a'}) — basis: ${h.matchBasis}`,
        ref: p.name,
        remediation: 'Verify identity; if confirmed, halt transaction and file blocking report.',
        confidence: h.confidence,
      });
    }
  }
  return findings;
}
