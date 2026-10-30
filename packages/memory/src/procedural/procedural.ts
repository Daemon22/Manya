/**
 * @manya-os/memory — procedural memory (named skills).
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import type { ProceduralSkill } from '../types.js';
import { ProceduralMemoryError } from '../errors.js';
import { randomId } from '../longterm/keys.js';

export class ProceduralMemory {
  private readonly skills = new Map<string, ProceduralSkill>();

  /** Register a skill. Returns the skill id. */
  learn(name: string, handler: (...args: unknown[]) => unknown, opts?: { description?: string; arguments?: string[]; tags?: string[] }): string {
    if (!name) throw new ProceduralMemoryError('skill name is required');
    if (typeof handler !== 'function') throw new ProceduralMemoryError('handler must be a function');
    if (this.skills.has(name)) throw new ProceduralMemoryError(`skill '${name}' already learned`);
    const id = randomId('proc');
    const skill: ProceduralSkill = {
      id, name, handler,
      description: opts?.description,
      arguments: opts?.arguments,
      learnedAt: Date.now(),
      tags: opts?.tags,
    };
    this.skills.set(name, skill);
    return id;
  }

  /** Execute a skill by name. */
  execute(name: string, ...args: unknown[]): unknown {
    const s = this.skills.get(name);
    if (!s) throw new ProceduralMemoryError(`procedural skill '${name}' not found`);
    if (!s.handler) throw new ProceduralMemoryError(`skill '${name}' has no handler (likely restored from snapshot)`);
    return s.handler(...args);
  }

  /** Get a skill (metadata only — no handler exposed). */
  get(name: string): ProceduralSkill | undefined {
    return this.skills.get(name);
  }

  /** Forget a skill. */
  forget(name: string): boolean {
    return this.skills.delete(name);
  }

  /** List all skill names. */
  list(): string[] {
    return Array.from(this.skills.keys());
  }

  /** Count skills. */
  count(): number { return this.skills.size; }

  /** Find skills by tag. */
  findByTag(tag: string): ProceduralSkill[] {
    return Array.from(this.skills.values()).filter(s => s.tags?.includes(tag));
  }
}
