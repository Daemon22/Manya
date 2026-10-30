/**
 * @manya-os/cortex — the reasoning orchestration engine facade.
 *
 * Wires together decomposition, planning, tools, routing, scheduling,
 * confidence, goals, resources, workflows, retries, and coordination.
 *
 * IMPORTANT: This package is NOT an AI model. It coordinates reasoning by
 * decomposing tasks, planning execution, selecting tools, routing requests,
 * scheduling work, estimating confidence, managing goals, optimizing
 * resources, orchestrating workflows, handling retries, and coordinating
 * multiple intelligent components.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
import type { Goal, Plan, Tool, Workflow, WorkflowExecution, RoutedRequest, ReasoningEvent } from './types.js';
import { GoalManager } from './goals/manager.js';
import { Planner } from './planner/planner.js';
import { ToolRegistry } from './tools/registry.js';
import { Router } from './router/router.js';
import { Scheduler } from './scheduler/scheduler.js';
import { ConfidenceEstimator } from './confidence/confidence.js';
import { ResourceManager } from './resources/manager.js';
import { WorkflowEngine } from './workflow/engine.js';
import { Coordinator } from './coordinate/coordinator.js';
import { KnowledgeRegistry } from './registry/knowledge.js';
import { DEFAULT_CONFIG } from './config/config.js';
import type { CortexConfig } from './config/config.js';
export declare class Cortex {
    readonly goals: GoalManager;
    readonly planner: Planner;
    readonly tools: ToolRegistry;
    readonly router: Router;
    readonly scheduler: Scheduler;
    readonly confidence: ConfidenceEstimator;
    readonly resources: ResourceManager;
    readonly workflows: WorkflowEngine;
    readonly coordinator: Coordinator;
    readonly knowledge: KnowledgeRegistry;
    private readonly config;
    private readonly logger;
    constructor(config?: CortexConfig);
    /** Set a goal. */
    setGoal(description: string, opts?: {
        priority?: number;
        deadline?: number;
        successCriteria?: string[];
    }): Goal;
    /** Plan a goal. */
    planGoal(goal: Goal): Plan;
    /** Execute a plan end-to-end. */
    executePlan(plan: Plan): Promise<Plan>;
    /** Convenience: set a goal, plan it, and execute. */
    reason(description: string, opts?: {
        priority?: number;
        deadline?: number;
    }): Promise<{
        goal: Goal;
        plan: Plan;
        events: ReasoningEvent[];
    }>;
    /** Route an input to the appropriate component. */
    route(input: string): RoutedRequest;
    /** Register a tool. */
    registerTool(tool: Tool): void;
    /** Execute a workflow. */
    runWorkflow(workflow: Workflow, initialInput?: unknown): Promise<WorkflowExecution>;
    /** Get all reasoning events from the last coordination run. */
    getEvents(): ReasoningEvent[];
    /** Register a knowledge key in the cortex knowledge registry. */
    registerKnowledge(key: string, ownerComponentId: string, opts?: {
        description?: string;
    }): void;
    /** Query knowledge ownership. */
    queryKnowledge(key: string): string | undefined;
    /** Reset the cortex for a fresh run. */
    reset(): void;
}
export { DEFAULT_CONFIG };
//# sourceMappingURL=cortex.d.ts.map