"use strict";
/**
 * @manya-os/cortex — tool registry and selection.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ToolRegistry = void 0;
const errors_js_1 = require("../errors.js");
const util_js_1 = require("../util.js");
class ToolRegistry {
    tools = new Map();
    /** Register a tool. */
    register(tool) {
        if (!tool?.name)
            throw new errors_js_1.ToolError('tool.name is required');
        if (this.tools.has(tool.name))
            throw new errors_js_1.ToolError(`tool '${tool.name}' already registered`);
        if (typeof tool.handler !== 'function')
            throw new errors_js_1.ToolError('tool.handler must be a function');
        this.tools.set(tool.name, tool);
    }
    /** Unregister a tool. */
    unregister(name) {
        return this.tools.delete(name);
    }
    /** Get a tool by name. */
    get(name) {
        return this.tools.get(name);
    }
    /** List all tool names. */
    list() {
        return Array.from(this.tools.keys());
    }
    /** Find tools by tag. */
    findByTag(tag) {
        return Array.from(this.tools.values()).filter(t => t.tags?.includes(tag));
    }
    /** Select the best tool for a task based on required tool names or tags. */
    select(requiredTools, preferredTags) {
        if (requiredTools && requiredTools.length > 0) {
            for (const name of requiredTools) {
                const t = this.tools.get(name);
                if (t)
                    return t;
            }
        }
        if (preferredTags && preferredTags.length > 0) {
            for (const tag of preferredTags) {
                const tools = this.findByTag(tag);
                if (tools.length > 0)
                    return tools[0];
            }
        }
        return undefined;
    }
    /** Invoke a tool by name. */
    async invoke(name, input, ctx) {
        const tool = this.tools.get(name);
        if (!tool)
            throw new errors_js_1.ToolError(`tool '${name}' not found`);
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
        }
        catch (err) {
            const durationMs = Date.now() - start;
            return {
                success: false,
                error: err instanceof Error ? err.message : String(err),
                durationMs,
            };
        }
    }
    /** Generate a unique id (helper for tools that need one). */
    newId(prefix = 'tool_call') {
        return (0, util_js_1.randomId)(prefix);
    }
}
exports.ToolRegistry = ToolRegistry;
//# sourceMappingURL=registry.js.map