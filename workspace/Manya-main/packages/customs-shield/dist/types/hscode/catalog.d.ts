/**
 * @manya/customs-shield — HS (Harmonized System) code catalog and validation.
 *
 * Implements a small built-in catalog of HS code prefixes (section + chapter
 * + heading) for validation. Production deployments should plug in a full
 * national tariff schedule via the `setCatalog` API.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
import type { HSCode } from '../types.js';
/** A catalog maps HS code (6-digit international) → HSCode entry. */
export type HSCatalog = Map<string, HSCode>;
/** Validate HS code format (6-10 digits, optional spaces/dots). */
export declare function isValidFormat(code: string): boolean;
/** Normalize an HS code (strip separators). */
export declare function normalize(code: string): string;
/** Get the chapter (first 2 digits). Returns '' for invalid input. */
export declare function chapter(code: string): string;
/** Get the heading (first 4 digits). Returns '' for invalid input. */
export declare function heading(code: string): string;
/** Get the international portion (first 6 digits). Returns '' for invalid input. */
export declare function international(code: string): string;
/** Build a default catalog from the chapter descriptions. */
export declare function buildDefaultCatalog(): HSCatalog;
/** Replace the global catalog. */
export declare function setCatalog(cat: HSCatalog): void;
/** Get the global catalog (for read-only inspection). */
export declare function getCatalog(): HSCatalog;
/** Look up an HS code in the catalog. Returns exact match first, then chapter fallback. */
export declare function lookup(code: string): HSCode | undefined;
/** Validate an HS code against the catalog. Returns { valid, reason }.
 * Note: a chapter-level match counts as 'partial'. */
export declare function validate(code: string): {
    valid: boolean;
    partial?: boolean;
    reason?: string;
    entry?: HSCode;
};
/** Suggest HS codes given a free-text description. Very simple keyword match. */
export declare function suggest(description: string, limit?: number): Array<{
    code: string;
    description: string;
    score: number;
}>;
/** Verify whether a declared HS code matches a description. */
export declare function verifyMatch(code: string, description: string): {
    match: boolean;
    confidence: number;
    reason: string;
};
//# sourceMappingURL=catalog.d.ts.map