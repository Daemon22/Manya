/**
 * @manya-os/memory — memory links (knowledge graph edges).
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import type { MemoryLink, MemoryId } from '../types.js';

export class LinkGraph {
  private readonly links = new Map<string, MemoryLink>();
  private readonly outgoing = new Map<MemoryId, Set<string>>();
  private readonly incoming = new Map<MemoryId, Set<string>>();

  private static key(from: MemoryId, to: MemoryId, relation: string): string {
    return `${from}|${to}|${relation}`;
  }

  /** Add a link. Returns true if newly added. */
  add(from: MemoryId, to: MemoryId, relation: string, weight?: number): boolean {
    const k = LinkGraph.key(from, to, relation);
    if (this.links.has(k)) return false;
    this.links.set(k, { fromId: from, toId: to, relation, weight });
    if (!this.outgoing.has(from)) this.outgoing.set(from, new Set());
    this.outgoing.get(from)!.add(k);
    if (!this.incoming.has(to)) this.incoming.set(to, new Set());
    this.incoming.get(to)!.add(k);
    return true;
  }

  /** Remove a link. */
  remove(from: MemoryId, to: MemoryId, relation: string): boolean {
    const k = LinkGraph.key(from, to, relation);
    const removed = this.links.delete(k);
    if (removed) {
      this.outgoing.get(from)?.delete(k);
      this.incoming.get(to)?.delete(k);
    }
    return removed;
  }

  /** All links from a record. */
  outgoingFrom(id: MemoryId): MemoryLink[] {
    const keys = this.outgoing.get(id);
    if (!keys) return [];
    return Array.from(keys).map(k => this.links.get(k)!).filter(Boolean);
  }

  /** All links to a record. */
  incomingTo(id: MemoryId): MemoryLink[] {
    const keys = this.incoming.get(id);
    if (!keys) return [];
    return Array.from(keys).map(k => this.links.get(k)!).filter(Boolean);
  }

  /** All links of a specific relation type. */
  byRelation(relation: string): MemoryLink[] {
    return Array.from(this.links.values()).filter(l => l.relation === relation);
  }

  /** BFS from a record following links of a given relation. Returns visited ids (excluding start). */
  traverse(start: MemoryId, relation: string, maxDepth: number = 5): MemoryId[] {
    const visited = new Set<MemoryId>([start]);
    const queue: Array<{ id: MemoryId; depth: number }> = [{ id: start, depth: 0 }];
    while (queue.length > 0) {
      const { id, depth } = queue.shift()!;
      if (depth >= maxDepth) continue;
      const out = this.outgoingFrom(id).filter(l => l.relation === relation);
      for (const l of out) {
        if (!visited.has(l.toId)) {
          visited.add(l.toId);
          queue.push({ id: l.toId, depth: depth + 1 });
        }
      }
    }
    return Array.from(visited).filter(id => id !== start);
  }

  /** All links. */
  all(): MemoryLink[] {
    return Array.from(this.links.values());
  }

  /** Count. */
  size(): number { return this.links.size; }
}
