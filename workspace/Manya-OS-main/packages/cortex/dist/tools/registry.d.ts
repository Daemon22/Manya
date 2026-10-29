/**
 * @manya-os/cortex — tool registry and selection.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
import type { Tool, ToolContext, ToolResult } from '../types.js';
export declare class ToolRegistry {
    private readonly tools;
    /** Register a tool. */
    register(tool: Tool): void;
    /** Unregister a tool. */
    unregister(name: string): boolean;
    /** Get a tool by name. */
    get(name: string): Tool | undefined;
    /** List all tool names. */
    list(): string[];
    /** Find tools by tag. */
    findByTag(tag: string): Tool[];
    /** Select the best tool for a task based on required tool names or tags. */
    select(requiredTools?: string[], preferredTags?: string[]): Tool | undefined;
    /** Invoke a tool by name. */
    invoke(name: string, input: unknown, ctx?: ToolContext): Promise<ToolResult>;
    /** Generate a unique id (helper for tools that need one). */
    newId(prefix?: string): string;
}
//# sourceMappingURL=registry.d.ts.map