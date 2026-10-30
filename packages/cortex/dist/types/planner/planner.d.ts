/**
 * @manya-os/cortex — the planner.
 *
 * Topologically sorts decomposed tasks and produces an executable Plan.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
import type { Plan, Task, PlanStrategy, Goal } from '../types.js';
export declare class Planner {
    /** Plan a goal by decomposing it and ordering the tasks. */
    plan(goal: Goal, strategy?: PlanStrategy): Plan;
    /** Replan a failed plan — mark failed tasks as skipped, retry or skip dependents. */
    replan(plan: Plan, failedTaskId: string, opts: {
        retry?: boolean;
    }): Plan;
}
/** Topological sort of tasks by their dependencies. Throws on cycles. */
export declare function topoSort(tasks: Task[]): Task[];
//# sourceMappingURL=planner.d.ts.map