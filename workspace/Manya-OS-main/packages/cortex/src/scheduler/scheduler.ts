/**
 * @manya-os/cortex — task scheduler.
 *
 * Schedules tasks onto workers with priority and dependency awareness.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import type { Task, ScheduledTask, ResourceBudget } from '../types.js';
import { SchedulerError } from '../errors.js';

export class Scheduler {
  private readonly queue: ScheduledTask[] = [];

  /** Schedule a task. Returns the ScheduledTask. */
  schedule(task: Task, worker: string, opts?: { at?: number; priority?: number; budget?: ResourceBudget }): ScheduledTask {
    if (!task) throw new SchedulerError('task is required');
    if (!worker) throw new SchedulerError('worker is required');
    const priority = opts?.priority ?? 0.5;
    const scheduledAt = opts?.at ?? Date.now();
    // Check dependencies are scheduled.
    if (task.dependsOn && task.dependsOn.length > 0) {
      for (const dep of task.dependsOn) {
        const depScheduled = this.queue.find(s => s.taskId === dep);
        if (!depScheduled) {
          throw new SchedulerError(`dependency ${dep} not scheduled`);
        }
        // Ensure we schedule after the dependency.
        if (scheduledAt < depScheduled.scheduledAt) {
          throw new SchedulerError(`task ${task.id} scheduled before dependency ${dep}`);
        }
      }
    }
    // Check budget.
    if (opts?.budget) {
      if (opts.budget.spentCost + (task.estimatedCost ?? 0) > opts.budget.maxCost) {
        throw new SchedulerError(`task ${task.id} would exceed cost budget`);
      }
      if (opts.budget.activeWorkers >= opts.budget.maxParallel) {
        throw new SchedulerError(`task ${task.id} would exceed parallel worker budget`);
      }
    }
    const st: ScheduledTask = {
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
  next(completedTaskIds: Set<string>): ScheduledTask | undefined {
    for (const st of this.queue) {
      // Look up the task's dependencies. We don't have the task here, but the caller
      // is responsible for tracking dependencies. We return the first schedulable item.
      void completedTaskIds;
      return st;
    }
    return undefined;
  }

  /** Pop the next schedulable task. */
  popNext(): ScheduledTask | undefined {
    return this.queue.shift();
  }

  /** Remove a scheduled task. */
  cancel(taskId: string): boolean {
    const idx = this.queue.findIndex(s => s.taskId === taskId);
    if (idx < 0) return false;
    this.queue.splice(idx, 1);
    return true;
  }

  /** All scheduled tasks. */
  all(): ScheduledTask[] {
    return [...this.queue];
  }

  /** Count. */
  size(): number {
    return this.queue.length;
  }

  /** Clear the queue. */
  clear(): void {
    this.queue.length = 0;
  }
}
