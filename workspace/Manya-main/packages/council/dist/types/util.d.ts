/**
 * @manya/council — shared text utilities.
 *
 * Small, dependency-free helpers used by the router, conflict, and consensus
 * modules to tokenize and compare short pieces of natural-language text. These
 * are intentionally simple — they are NOT an NLP pipeline. Polarity inference
 * is a keyword-counting heuristic (with light stemming) so that conflict
 * detection and consensus building remain deterministic, explainable, and
 * testable.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
/** Common English stop-words. Kept short and conservative. */
export declare const STOP_WORDS: ReadonlySet<string>;
/** Words that bias a text's polarity positive (recommend/approve/endorse …). */
export declare const POSITIVE_MARKERS: ReadonlySet<string>;
/** Words that bias a text's polarity negative (reject/oppose/forbid …). */
export declare const NEGATIVE_MARKERS: ReadonlySet<string>;
/**
 * Naive suffix-stripper used to normalize tokens before marker matching.
 * Strips `'ing'`, `'ed'`, and a trailing `'s'` from tokens of length > 4 so
 * that `'recommends'` → `'recommend'`, `'rejected'` → `'reject'`, etc. Short
 * tokens (length ≤ 4) are returned unchanged so that `'no'`, `'go'`, `'pass'`,
 * `'stop'` are not corrupted.
 */
export declare function stem(token: string): string;
/** Splits text into lowercase alphanumeric tokens, dropping stop-words. */
export declare function tokenize(text: string): string[];
/** Returns the set of tokens in `text` (lowercased, stop-words removed). */
export declare function tokenSet(text: string): Set<string>;
/**
 * Jaccard similarity between two token sets: `|A ∩ B| / |A ∪ B|`.
 * Returns `0` when either set is empty.
 */
export declare function jaccard(a: Set<string>, b: Set<string>): number;
/**
 * Infers a polarity from `text` by counting positive vs negative markers
 * (after light stemming). Returns `'positive'` when positive markers strictly
 * outnumber negative ones, `'negative'` when negative markers strictly
 * outnumber positive ones, and `'neutral'` when the counts are equal or no
 * markers are present.
 */
export declare function polarity(text: string): 'positive' | 'negative' | 'neutral';
//# sourceMappingURL=util.d.ts.map