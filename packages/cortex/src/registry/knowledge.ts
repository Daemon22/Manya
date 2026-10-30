/**
 * @manya-os/cortex — knowledge registry and differential sync.
 *
 * Tracks which component owns each knowledge key and computes
 * differential payloads for efficient inter-component sync.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import type { ProvenanceEntry, DeltaPayload, DiffResult } from '../types.js';
import { KnowledgeError } from '../errors.js';

export class KnowledgeRegistry {
  private readonly entries = new Map<string, ProvenanceEntry>();

  /**
   * Register a knowledge key with an owning component.
   * Throws if the key is already owned by a different component.
   */
  register(key: string, ownerComponentId: string, opts?: { description?: string }): ProvenanceEntry {
    if (!key) throw new KnowledgeError('key is required');
    if (!ownerComponentId) throw new KnowledgeError('ownerComponentId is required');

    const now = Date.now();
    const existing = this.entries.get(key);

    if (existing) {
      if (existing.ownerComponentId !== ownerComponentId) {
        throw new KnowledgeError(
          `key '${key}' is already owned by '${existing.ownerComponentId}'`,
        );
      }
      // Update existing entry owned by the same component.
      existing.lastUpdated = now;
      if (opts?.description !== undefined) existing.description = opts.description;
      return existing;
    }

    const entry: ProvenanceEntry = {
      key,
      ownerComponentId,
      registeredAt: now,
      lastUpdated: now,
      description: opts?.description,
    };
    this.entries.set(key, entry);
    return entry;
  }

  /**
   * Register or transfer a knowledge key. If the key is owned by a different
   * component, the ownership is transferred (previous entry is overwritten).
   * This is the non-throwing variant for use during sync.
   */
  transfer(key: string, newOwnerComponentId: string, opts?: { description?: string }): ProvenanceEntry {
    if (!key) throw new KnowledgeError('key is required');
    if (!newOwnerComponentId) throw new KnowledgeError('newOwnerComponentId is required');

    const now = Date.now();
    const existing = this.entries.get(key);

    if (existing && existing.ownerComponentId === newOwnerComponentId) {
      // Same owner — just update.
      existing.lastUpdated = now;
      if (opts?.description !== undefined) existing.description = opts.description;
      return existing;
    }

    const entry: ProvenanceEntry = {
      key,
      ownerComponentId: newOwnerComponentId,
      registeredAt: existing?.registeredAt ?? now,
      lastUpdated: now,
      description: opts?.description ?? existing?.description,
    };
    this.entries.set(key, entry);
    return entry;
  }

  /** Look up the owning component for a key. */
  lookup(key: string): ProvenanceEntry | undefined {
    return this.entries.get(key);
  }

  /** Check if a key is registered. */
  has(key: string): boolean {
    return this.entries.has(key);
  }

  /** Remove a key. Returns true if it was present. */
  unregister(key: string): boolean {
    return this.entries.delete(key);
  }

  /** Get all entries. */
  all(): ProvenanceEntry[] {
    return Array.from(this.entries.values());
  }

  /** Get all keys owned by a given component. */
  byOwner(ownerComponentId: string): ProvenanceEntry[] {
    return this.all().filter(e => e.ownerComponentId === ownerComponentId);
  }

  /** Number of registered keys. */
  size(): number {
    return this.entries.size;
  }

  /**
   * Compute the differential (delta) of knowledge changes since a given
   * timestamp. Used for efficient inter-component sync: only changed data
   * is transferred.
   *
   * @param since - Epoch ms. Only entries with `lastUpdated > since` are included.
   */
  diff(since: number): DiffResult {
    if (since < 0) throw new KnowledgeError('since must be non-negative');

    const added: ProvenanceEntry[] = [];
    const changed: ProvenanceEntry[] = [];

    for (const entry of this.entries.values()) {
      if (entry.lastUpdated <= since) continue;

      if (entry.registeredAt > since) {
        added.push(entry);
      } else {
        changed.push(entry);
      }
    }

    const delta: DeltaPayload = { added, changed, derived: [] };

    return {
      hasChanges: added.length > 0 || changed.length > 0,
      delta,
      queriedAt: Date.now(),
    };
  }

  /**
   * Compute diff excluding keys owned by a specific component.
   * Useful when a component wants to see changes from *other* components only.
   */
  diffExcluding(since: number, excludeComponentId: string): DiffResult {
    if (since < 0) throw new KnowledgeError('since must be non-negative');

    const added: ProvenanceEntry[] = [];
    const changed: ProvenanceEntry[] = [];

    for (const entry of this.entries.values()) {
      if (entry.ownerComponentId === excludeComponentId) continue;
      if (entry.lastUpdated <= since) continue;

      if (entry.registeredAt > since) {
        added.push(entry);
      } else {
        changed.push(entry);
      }
    }

    const delta: DeltaPayload = { added, changed, derived: [] };

    return {
      hasChanges: added.length > 0 || changed.length > 0,
      delta,
      queriedAt: Date.now(),
    };
  }
}
