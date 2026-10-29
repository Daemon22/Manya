/**
 * @manya-os/cortex — task scheduler.
 *
 * Schedules tasks onto workers with priority and dependency awareness.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
import type { Task, ScheduledTask, ResourceBudget } from '../types.js';
export declare class Scheduler {
    private readonly queue;
    /** Schedule a task. Returns the ScheduledTask. */
    schedule(task: Task, worker: string, opts?: {
        at?: number;
        priority?: number;
        budget?: ResourceBudget;
    }): ScheduledTask;
    /** Get the next task to run (highest-priority whose dependencies are complete). */
    next(completedTaskIds: Set<string>): ScheduledTask | undefined;
    /** Pop the next schedulable task. */
    popNext(): ScheduledTask | undefined;
    /** Remove a scheduled task. */
    cancel(taskId: string): boolean;
    /** All scheduled tasks. */
    all(): ScheduledTask[];
    /** Count. */
    size(): number;
    /** Clear the queue. */
    clear(): void;
}
//# sourceMappingURL=scheduler.d.ts.map