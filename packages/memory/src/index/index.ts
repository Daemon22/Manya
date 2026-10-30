/**
 * @manya-os/memory — inverted index for fast token-based retrieval.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import type { IndexEntry, MemoryId } from '../types.js';
import { IndexError } from '../errors.js';

export class InvertedIndex {
  private readonly index = new Map<string, IndexEntry>();
  private readonly docLengths = new Map<MemoryId, number>();

  /** Tokenize a string into lowercase terms. */
  static tokenize(text: string): string[] {
    if (typeof text !== 'string') return [];
    return text.toLowerCase().split(/[^a-z0-9]+/).filter(t => t.length > 1);
  }

  /** Add a document (record) to the index. */
  add(recordId: MemoryId, text: string): void {
    if (!recordId) throw new IndexError('recordId is required');
    const tokens = InvertedIndex.tokenize(text);
    this.docLengths.set(recordId, tokens.length);
    const freqs = new Map<string, number>();
    for (const t of tokens) freqs.set(t, (freqs.get(t) ?? 0) + 1);
    for (const [token, freq] of freqs) {
      if (!this.index.has(token)) {
        this.index.set(token, { token, recordIds: [], frequencies: {} });
      }
      const entry = this.index.get(token)!;
      if (!entry.frequencies[recordId]) entry.recordIds.push(recordId);
      entry.frequencies[recordId] = freq;
    }
  }

  /** Remove a document from the index. */
  remove(recordId: MemoryId): void {
    this.docLengths.delete(recordId);
    for (const [token, entry] of this.index) {
      if (entry.frequencies[recordId]) {
        delete entry.frequencies[recordId];
        entry.recordIds = entry.recordIds.filter(id => id !== recordId);
        if (entry.recordIds.length === 0) this.index.delete(token);
      }
    }
  }

  /** Look up records containing a token. */
  lookup(token: string): IndexEntry | undefined {
    return this.index.get(token.toLowerCase());
  }

  /** Search by query string. Returns record IDs with TF scores. */
  search(query: string): Array<{ recordId: MemoryId; score: number }> {
    const tokens = InvertedIndex.tokenize(query);
    if (tokens.length === 0) return [];
    const scores = new Map<MemoryId, number>();
    for (const t of tokens) {
      const entry = this.lookup(t);
      if (!entry) continue;
      // TF-IDF-lite: TF * log(N / DF)
      const idf = Math.log(this.docLengths.size / (entry.recordIds.length + 1));
      for (const id of entry.recordIds) {
        const tf = entry.frequencies[id] ?? 0;
        const docLen = this.docLengths.get(id) ?? 1;
        const normalized = tf / docLen;
        scores.set(id, (scores.get(id) ?? 0) + normalized * idf);
      }
    }
    return Array.from(scores.entries())
      .map(([recordId, score]) => ({ recordId, score }))
      .sort((a, b) => b.score - a.score);
  }

  /** Number of unique tokens. */
  size(): number { return this.index.size; }

  /** All entries (for serialization). */
  entries(): IndexEntry[] {
    return Array.from(this.index.values());
  }
}
