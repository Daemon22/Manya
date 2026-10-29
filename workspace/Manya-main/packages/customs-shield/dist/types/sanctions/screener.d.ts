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
/** Built-in country-level sanctions (subset — production deployments must load the full list). */
export declare const DEFAULT_COUNTRY_SANCTIONS: SanctionsEntry[];
/** Replace the global sanctions list. */
export declare function setSanctionsList(list: SanctionsEntry[]): void;
/** Get the global sanctions list. */
export declare function getSanctionsList(): SanctionsEntry[];
/** Normalize a name for matching — uppercase, strip punctuation, collapse spaces. */
export declare function normalizeName(name: string): string;
/** Levenshtein distance — for fuzzy matching. */
export declare function levenshtein(a: string, b: string): number;
/** Similarity ratio in [0,1] based on Levenshtein. */
export declare function similarity(a: string, b: string): number;
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
export declare function screenParty(party: TradeParty, threshold?: number): ScreeningResult;
/** Screen multiple parties and return findings. */
export declare function screenParties(parties: TradeParty[], threshold?: number): ShieldFinding[];
//# sourceMappingURL=screener.d.ts.map