/**
 * @manya-os/cortex — multi-component coordination.
 *
 * Coordinates multiple intelligent components (planner, scheduler, tools,
 * memory, council, etc.) to execute a plan end-to-end.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
import type { Plan, ReasoningEvent } from '../types.js';
import type { ToolRegistry } from '../tools/registry.js';
import type { Scheduler } from '../scheduler/scheduler.js';
import type { ResourceManager } from '../resources/manager.js';
import type { ConfidenceEstimator } from '../confidence/confidence.js';
import type { RetryPolicy } from '../types.js';
import type { Logger } from '../logging.js';
export declare class Coordinator {
    private readonly tools;
    private readonly scheduler;
    private readonly resources;
    private readonly confidence;
    private readonly events;
    private readonly logger;
    constructor(tools: ToolRegistry, scheduler: Scheduler, resources: ResourceManager, confidence: ConfidenceEstimator, opts?: {
        logger?: Logger;
        retryPolicy?: RetryPolicy;
    });
    private readonly retryPolicy;
    /** Execute a plan end-to-end. Returns the plan with task results. */
    execute(plan: Plan): Promise<Plan>;
    /** Get all reasoning events emitted during execution. */
    getEvents(): ReasoningEvent[];
    private emit;
}
//# sourceMappingURL=coordinator.d.ts.map