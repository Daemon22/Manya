/**
 * @manya-os/cortex — workflow engine.
 *
 * Executes a multi-step workflow with conditional branching.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
import type { Workflow, WorkflowExecution } from '../types.js';
import type { ToolRegistry } from '../tools/registry.js';
export declare class WorkflowEngine {
    private readonly tools;
    constructor(tools: ToolRegistry);
    /** Execute a workflow. Returns the final execution state. */
    execute(workflow: Workflow, initialInput?: unknown): Promise<WorkflowExecution>;
    private findStep;
    private executeStep;
    /** Abort a running execution. */
    abort(exec: WorkflowExecution): WorkflowExecution;
}
//# sourceMappingURL=engine.d.ts.map