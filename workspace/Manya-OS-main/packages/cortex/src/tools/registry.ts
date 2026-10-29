/**
 * @manya-os/cortex — tool registry and selection.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import type { Tool, ToolContext, ToolResult } from '../types.js';
import { ToolError } from '../errors.js';
import { randomId } from '../util.js';

export class ToolRegistry {
  private readonly tools = new Map<string, Tool>();

  /** Register a tool. */
  register(tool: Tool): void {
    if (!tool?.name) throw new ToolError('tool.name is required');
    if (this.tools.has(tool.name)) throw new ToolError(`tool '${tool.name}' already registered`);
    if (typeof tool.handler !== 'function') throw new ToolError('tool.handler must be a function');
    this.tools.set(tool.name, tool);
  }

  /** Unregister a tool. */
  unregister(name: string): boolean {
    return this.tools.delete(name);
  }

  /** Get a tool by name. */
  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  /** List all tool names. */
  list(): string[] {
    return Array.from(this.tools.keys());
  }

  /** Find tools by tag. */
  findByTag(tag: string): Tool[] {
    return Array.from(this.tools.values()).filter(t => t.tags?.includes(tag));
  }

  /** Select the best tool for a task based on required tool names or tags. */
  select(requiredTools?: string[], preferredTags?: string[]): Tool | undefined {
    if (requiredTools && requiredTools.length > 0) {
      for (const name of requiredTools) {
        const t = this.tools.get(name);
        if (t) return t;
      }
    }
    if (preferredTags && preferredTags.length > 0) {
      for (const tag of preferredTags) {
        const tools = this.findByTag(tag);
        if (tools.length > 0) return tools[0];
      }
    }
    return undefined;
  }

  /** Invoke a tool by name. */
  async invoke(name: string, input: unknown, ctx?: ToolContext): Promise<ToolResult> {
    const tool = this.tools.get(name);
    if (!tool) throw new ToolError(`tool '${name}' not found`);
    const start = Date.now();
    try {
      // Always await — works for both sync and async handlers.
      const result = await Promise.resolve(tool.handler(input, ctx));
      const durationMs = Date.now() - start;
      return {
        success: result.success,
        output: result.output,
        error: result.error,
        confidence: result.confidence,
        durationMs,
      };
    } catch (err) {
      const durationMs = Date.now() - start;
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
        durationMs,
      };
    }
  }

  /** Generate a unique id (helper for tools that need one). */
  newId(prefix: string = 'tool_call'): string {
    return randomId(prefix);
  }
}
