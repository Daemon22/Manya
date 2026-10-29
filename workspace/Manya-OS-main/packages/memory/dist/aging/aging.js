"use strict";
/**
 * @manya-os/memory — aging policies.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_AGING_POLICY = void 0;
exports.mergeAgingPolicy = mergeAgingPolicy;
exports.ageScore = ageScore;
exports.effectiveImportance = effectiveImportance;
exports.shouldPruneEpisodic = shouldPruneEpisodic;
exports.shouldCompressLongTerm = shouldCompressLongTerm;
exports.DEFAULT_AGING_POLICY = {
    workingTtlMs: 5 * 60 * 1000, // 5 minutes
    episodicMaxCount: 10_000,
    episodicPruneThreshold: 0.3,
    longtermCompressAfterDays: 90,
};
function mergeAgingPolicy(p) {
    return { ...exports.DEFAULT_AGING_POLICY, ...(p ?? {}) };
}
/** Compute a memory's age score in [0,1] — 0 = fresh, 1 = ancient.
 * Uses an exponential decay: at age 0 → 0, at age 90 days → ~0.63, at age 365 days → ~0.98. */
function ageScore(createdAt, now = Date.now()) {
    const ageDays = Math.max(0, (now - createdAt) / 86_400_000);
    return 1 - Math.exp(-ageDays / 90);
}
/** Effective importance after aging decay. */
function effectiveImportance(record, now = Date.now()) {
    const age = ageScore(record.createdAt, now);
    // Access count boosts importance (frequently accessed = stay fresh).
    const accessBoost = Math.min(0.3, Math.log10(record.accessCount + 1) * 0.1);
    return Math.max(0, Math.min(1, record.importance * (1 - age * 0.5) + accessBoost));
}
/** Should an episodic event be pruned? */
function shouldPruneEpisodic(event, policy, now = Date.now()) {
    const age = ageScore(event.timestamp, now);
    return (event.importance ?? 0) < policy.episodicPruneThreshold && age > 0.6;
}
/** Should a long-term record be compressed? */
function shouldCompressLongTerm(record, policy, now = Date.now()) {
    const ageDays = (now - record.createdAt) / 86_400_000;
    return ageDays > policy.longtermCompressAfterDays && record.accessCount < 2;
}
//# sourceMappingURL=aging.js.map