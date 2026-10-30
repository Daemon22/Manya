/**
 * @manya-os/memory — aging policies.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import type { AgingPolicy, EpisodicEvent, LongTermRecord } from '../types.js';

export const DEFAULT_AGING_POLICY: Required<AgingPolicy> = {
  workingTtlMs: 5 * 60 * 1000,           // 5 minutes
  episodicMaxCount: 10_000,
  episodicPruneThreshold: 0.3,
  longtermCompressAfterDays: 90,
};

export function mergeAgingPolicy(p?: AgingPolicy): Required<AgingPolicy> {
  return { ...DEFAULT_AGING_POLICY, ...(p ?? {}) };
}

/** Compute a memory's age score in [0,1] — 0 = fresh, 1 = ancient.
 * Uses an exponential decay: at age 0 → 0, at age 90 days → ~0.63, at age 365 days → ~0.98. */
export function ageScore(createdAt: number, now: number = Date.now()): number {
  const ageDays = Math.max(0, (now - createdAt) / 86_400_000);
  return 1 - Math.exp(-ageDays / 90);
}

/** Effective importance after aging decay. */
export function effectiveImportance(record: { importance: number; createdAt: number; accessCount: number }, now: number = Date.now()): number {
  const age = ageScore(record.createdAt, now);
  // Access count boosts importance (frequently accessed = stay fresh).
  const accessBoost = Math.min(0.3, Math.log10(record.accessCount + 1) * 0.1);
  return Math.max(0, Math.min(1, record.importance * (1 - age * 0.5) + accessBoost));
}

/** Should an episodic event be pruned? */
export function shouldPruneEpisodic(event: EpisodicEvent, policy: Required<AgingPolicy>, now: number = Date.now()): boolean {
  const age = ageScore(event.timestamp, now);
  return (event.importance ?? 0) < policy.episodicPruneThreshold && age > 0.6;
}

/** Should a long-term record be compressed? */
export function shouldCompressLongTerm(record: LongTermRecord, policy: Required<AgingPolicy>, now: number = Date.now()): boolean {
  const ageDays = (now - record.createdAt) / 86_400_000;
  return ageDays > policy.longtermCompressAfterDays && record.accessCount < 2;
}
