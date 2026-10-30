/**
 * @manya-os/memory — import/export.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import type { MemorySnapshot } from '../types.js';
import { MemoryError } from '../errors.js';

/** Export a snapshot to a JSON string. */
export function exportSnapshot(snapshot: MemorySnapshot): string {
  if (!snapshot) throw new MemoryError('snapshot is required');
  return JSON.stringify(snapshot, null, 2);
}

/** Import a snapshot from a JSON string. */
export function importSnapshot(json: string): MemorySnapshot {
  try {
    const s = JSON.parse(json);
    if (!s.schemaVersion || !Array.isArray(s.episodic)) {
      throw new MemoryError('invalid snapshot structure');
    }
    return s as MemorySnapshot;
  } catch (err) {
    if (err instanceof MemoryError) throw err;
    throw new MemoryError('failed to parse snapshot', undefined, err);
  }
}

/** Export only episodic events (e.g. for sharing experience logs). */
export function exportEpisodic(snapshot: MemorySnapshot): string {
  return JSON.stringify({ schemaVersion: 1, type: 'episodic', events: snapshot.episodic }, null, 2);
}

/** Export only semantic facts (e.g. for knowledge transfer). */
export function exportSemantic(snapshot: MemorySnapshot): string {
  return JSON.stringify({ schemaVersion: 1, type: 'semantic', facts: snapshot.semantic }, null, 2);
}

/** Merge an imported partial snapshot (episodic or semantic) into a base snapshot. */
export function mergeImport(base: MemorySnapshot, json: string): MemorySnapshot {
  const partial = JSON.parse(json) as { type?: string; events?: unknown[]; facts?: unknown[] };
  if (partial.type === 'episodic' && Array.isArray(partial.events)) {
    const existingIds = new Set(base.episodic.map(e => e.id));
    for (const e of partial.events) {
      const ev = e as MemorySnapshot['episodic'][number];
      if (!existingIds.has(ev.id)) base.episodic.push(ev);
    }
  } else if (partial.type === 'semantic' && Array.isArray(partial.facts)) {
    const existingIds = new Set(base.semantic.map(s => s.id));
    for (const s of partial.facts) {
      const fact = s as MemorySnapshot['semantic'][number];
      if (!existingIds.has(fact.id)) base.semantic.push(fact);
    }
  } else {
    throw new MemoryError('unrecognized import format');
  }
  return base;
}
