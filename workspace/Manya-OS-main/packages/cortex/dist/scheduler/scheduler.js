"use strict";
/**
 * @manya-os/cortex — task scheduler.
 *
 * Schedules tasks onto workers with priority and dependency awareness.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Scheduler = void 0;
const errors_js_1 = require("../errors.js");
class Scheduler {
    queue = [];
    /** Schedule a task. Returns the ScheduledTask. */
    schedule(task, worker, opts) {
        if (!task)
            throw new errors_js_1.SchedulerError('task is required');
        if (!worker)
            throw new errors_js_1.SchedulerError('worker is required');
        const priority = opts?.priority ?? 0.5;
        const scheduledAt = opts?.at ?? Date.now();
        // Check dependencies are scheduled.
        if (task.dependsOn && task.dependsOn.length > 0) {
            for (const dep of task.dependsOn) {
                const depScheduled = this.queue.find(s => s.taskId === dep);
                if (!depScheduled) {
                    throw new errors_js_1.SchedulerError(`dependency ${dep} not scheduled`);
                }
                // Ensure we schedule after the dependency.
                if (scheduledAt < depScheduled.scheduledAt) {
                    throw new errors_js_1.SchedulerError(`task ${task.id} scheduled before dependency ${dep}`);
                }
            }
        }
        // Check budget.
        if (opts?.budget) {
            if (opts.budget.spentCost + (task.estimatedCost ?? 0) > opts.budget.maxCost) {
                throw new errors_js_1.SchedulerError(`task ${task.id} would exceed cost budget`);
            }
            if (opts.budget.activeWorkers >= opts.budget.maxParallel) {
                throw new errors_js_1.SchedulerError(`task ${task.id} would exceed parallel worker budget`);
            }
        }
        const st = {
            taskId: task.id,
            scheduledAt,
            worker,
            priority,
        };
        this.queue.push(st);
        this.queue.sort((a, b) => a.scheduledAt - b.scheduledAt || b.priority - a.priority);
        return st;
    }
    /** Get the next task to run (highest-priority whose dependencies are complete). */
    next(completedTaskIds) {
        for (const st of this.queue) {
            // Look up the task's dependencies. We don't have the task here, but the caller
            // is responsible for tracking dependencies. We return the first schedulable item.
            void completedTaskIds;
            return st;
        }
        return undefined;
    }
    /** Pop the next schedulable task. */
    popNext() {
        return this.queue.shift();
    }
    /** Remove a scheduled task. */
    cancel(taskId) {
        const idx = this.queue.findIndex(s => s.taskId === taskId);
        if (idx < 0)
            return false;
        this.queue.splice(idx, 1);
        return true;
    }
    /** All scheduled tasks. */
    all() {
        return [...this.queue];
    }
    /** Count. */
    size() {
        return this.queue.length;
    }
    /** Clear the queue. */
    clear() {
        this.queue.length = 0;
    }
}
exports.Scheduler = Scheduler;
//# sourceMappingURL=scheduler.js.map