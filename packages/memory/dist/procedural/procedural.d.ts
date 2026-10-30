/**
 * @manya-os/memory — procedural memory (named skills).
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
import type { ProceduralSkill } from '../types.js';
export declare class ProceduralMemory {
    private readonly skills;
    /** Register a skill. Returns the skill id. */
    learn(name: string, handler: (...args: unknown[]) => unknown, opts?: {
        description?: string;
        arguments?: string[];
        tags?: string[];
    }): string;
    /** Execute a skill by name. */
    execute(name: string, ...args: unknown[]): unknown;
    /** Get a skill (metadata only — no handler exposed). */
    get(name: string): ProceduralSkill | undefined;
    /** Forget a skill. */
    forget(name: string): boolean;
    /** List all skill names. */
    list(): string[];
    /** Count skills. */
    count(): number;
    /** Find skills by tag. */
    findByTag(tag: string): ProceduralSkill[];
}
//# sourceMappingURL=procedural.d.ts.map