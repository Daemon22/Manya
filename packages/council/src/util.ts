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
export const STOP_WORDS: ReadonlySet<string> = new Set<string>([
  'the', 'a', 'an', 'and', 'or', 'but', 'of', 'to', 'in', 'on', 'at', 'for',
  'with', 'by', 'is', 'are', 'be', 'this', 'that', 'these', 'those', 'it',
  'as', 'from', 'we', 'our', 'us', 'i', 'you', 'your', 'they', 'their',
  'was', 'were', 'will', 'would', 'should', 'shall', 'may', 'might', 'can',
  'could', 'has', 'have', 'had', 'do', 'does', 'did', 'if', 'then', 'else',
  'so', 'than', 'too', 'very', 'just', 'about', 'into', 'over', 'under',
  'again', 'further', 'once', 'here', 'there', 'when', 'where', 'why', 'how',
  'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such',
  'no', 'nor', 'not', 'only', 'own', 'same', 's', 't', 'because', 'while',
]);

/** Words that bias a text's polarity positive (recommend/approve/endorse …). */
export const POSITIVE_MARKERS: ReadonlySet<string> = new Set<string>([
  'yes', 'recommend', 'support', 'approve', 'endorse', 'agree', 'proceed',
  'accept', 'positive', 'pass', 'correct', 'adopt', 'allow', 'permit', 'go',
  'true', 'valid', 'sound', 'good', 'safe', 'favor', 'continue', 'implement',
  'ship', 'launch', 'greenlight', 'ok', 'okay',
]);

/** Words that bias a text's polarity negative (reject/oppose/forbid …). */
export const NEGATIVE_MARKERS: ReadonlySet<string> = new Set<string>([
  'no', 'not', 'against', 'oppose', 'reject', 'deny', 'refuse', 'decline',
  'block', 'forbid', 'prohibit', 'fail', 'false', 'invalid', 'unsound', 'bad',
  'unsafe', 'risk', 'risky', 'dont', 'shouldnt', 'cannot', 'cant', 'wont',
  'never', 'negative', 'veto', 'stop', 'halt', 'abort', 'discard', 'overturn',
]);

/**
 * Naive suffix-stripper used to normalize tokens before marker matching.
 * Strips `'ing'`, `'ed'`, and a trailing `'s'` from tokens of length > 4 so
 * that `'recommends'` → `'recommend'`, `'rejected'` → `'reject'`, etc. Short
 * tokens (length ≤ 4) are returned unchanged so that `'no'`, `'go'`, `'pass'`,
 * `'stop'` are not corrupted.
 */
export function stem(token: string): string {
  if (token.length > 4) {
    if (token.endsWith('ing')) return token.slice(0, -3);
    if (token.endsWith('ed')) return token.slice(0, -2);
    if (token.endsWith('s') && !token.endsWith('ss')) return token.slice(0, -1);
  }
  return token;
}

/** Splits text into lowercase alphanumeric tokens, dropping stop-words. */
export function tokenize(text: string): string[] {
  if (typeof text !== 'string' || text.length === 0) return [];
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .filter((t) => t.length > 0 && !STOP_WORDS.has(t));
}

/** Returns the set of tokens in `text` (lowercased, stop-words removed). */
export function tokenSet(text: string): Set<string> {
  return new Set(tokenize(text));
}

/**
 * Jaccard similarity between two token sets: `|A ∩ B| / |A ∪ B|`.
 * Returns `0` when either set is empty.
 */
export function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  // Iterate over the smaller set for efficiency.
  const [smaller, larger] = a.size <= b.size ? [a, b] : [b, a];
  for (const t of smaller) if (larger.has(t)) intersection++;
  const union = a.size + b.size - intersection;
  return union > 0 ? intersection / union : 0;
}

/**
 * Infers a polarity from `text` by counting positive vs negative markers
 * (after light stemming). Returns `'positive'` when positive markers strictly
 * outnumber negative ones, `'negative'` when negative markers strictly
 * outnumber positive ones, and `'neutral'` when the counts are equal or no
 * markers are present.
 */
export function polarity(text: string): 'positive' | 'negative' | 'neutral' {
  const tokens = tokenize(text);
  let pos = 0;
  let neg = 0;
  for (const t of tokens) {
    const s = stem(t);
    if (POSITIVE_MARKERS.has(s)) pos++;
    if (NEGATIVE_MARKERS.has(s)) neg++;
  }
  if (pos > neg) return 'positive';
  if (neg > pos) return 'negative';
  return 'neutral';
}

