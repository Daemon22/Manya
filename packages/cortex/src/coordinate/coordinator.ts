/**
 * @manya-os/cortex — multi-component coordination.
 *
 * Coordinates multiple intelligent components (planner, scheduler, tools,
 * memory, council, etc.) to execute a plan end-to-end.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import type { Plan, Task, ReasoningEvent, ToolResult } from '../types.js';
import { CoordinationError } from '../errors.js';
import { randomId } from '../util.js';
import type { ToolRegistry } from '../tools/registry.js';
import type { Scheduler } from '../scheduler/scheduler.js';
import type { ResourceManager } from '../resources/manager.js';
import type { ConfidenceEstimator } from '../confidence/confidence.js';
import { withRetry, DEFAULT_RETRY_POLICY } from '../retry/retry.js';
import type { RetryPolicy } from '../types.js';
import type { Logger } from '../logging.js';
import { SilentLogger } from '../logging.js';

export class Coordinator {
  private readonly events: ReasoningEvent[] = [];
  private readonly logger: Logger;

  constructor(
    private readonly tools: ToolRegistry,
    private readonly scheduler: Scheduler,
    private readonly resources: ResourceManager,
    private readonly confidence: ConfidenceEstimator,
    opts?: { logger?: Logger; retryPolicy?: RetryPolicy },
  ) {
    this.logger = opts?.logger ?? new SilentLogger();
    this.retryPolicy = opts?.retryPolicy ?? DEFAULT_RETRY_POLICY;
  }

  private readonly retryPolicy: RetryPolicy;

  /** Execute a plan end-to-end. Returns the plan with task results. */
  async execute(plan: Plan): Promise<Plan> {
    if (!plan) throw new CoordinationError('plan is required');
    this.logger.info('coordinator: starting plan execution', { planId: plan.id, taskCount: plan.tasks.length });
    this.emit('plan_created', { planId: plan.id });

    for (const task of plan.tasks) {
      if (task.status === 'skipped') continue;
      // Schedule the task.
      this.scheduler.schedule(task, 'default', { priority: task.goalId ? 0.5 : 0.5 });
      this.emit('task_scheduled', { taskId: task.id });

      // Check resources.
      const admit = this.resources.canAdmit(task);
      if (!admit.admit) {
        task.status = 'skipped';
        task.error = admit.reason;
        this.logger.warn('coordinator: task skipped (resources)', { taskId: task.id, reason: admit.reason });
        continue;
      }
      this.resources.reserve(task);
      this.emit('task_started', { taskId: task.id });

      // Select + invoke tool.
      const tool = task.requiredTools && task.requiredTools.length > 0
        ? this.tools.select(task.requiredTools)
        : undefined;

      try {
        const start = Date.now();
        let result: ToolResult;
        if (tool) {
          result = await withRetry(
            () => this.tools.invoke(tool.name, task.description, { taskId: task.id, goalId: task.goalId }),
            this.retryPolicy,
          );
        } else {
          // No tool — mark as completed with no output.
          result = { success: true, output: undefined, durationMs: Date.now() - start };
        }
        const duration = Date.now() - start;
        this.resources.release(task, duration);

        if (result.success) {
          task.status = 'completed';
          task.result = result.output;
          this.confidence.recordOutcome(task.description, true);
          this.emit('task_completed', { taskId: task.id, durationMs: duration });
        } else {
          task.status = 'failed';
          task.error = result.error;
          this.confidence.recordOutcome(task.description, false);
          this.emit('task_failed', { taskId: task.id, error: result.error });
          // Fail the plan if a critical task fails.
          this.logger.error('coordinator: task failed', { taskId: task.id, error: result.error });
        }
      } catch (err) {
        this.resources.release(task, 0);
        task.status = 'failed';
        task.error = err instanceof Error ? err.message : String(err);
        this.emit('task_failed', { taskId: task.id, error: task.error });
      }
    }

    this.logger.info('coordinator: plan execution complete', {
      planId: plan.id,
      completed: plan.tasks.filter(t => t.status === 'completed').length,
      failed: plan.tasks.filter(t => t.status === 'failed').length,
      skipped: plan.tasks.filter(t => t.status === 'skipped').length,
    });
    return plan;
  }

  /** Get all reasoning events emitted during execution. */
  getEvents(): ReasoningEvent[] {
    return [...this.events];
  }

  private emit(type: ReasoningEvent['type'], meta?: Record<string, unknown>): void {
    this.events.push({
      id: randomId('evt'),
      type,
      timestamp: Date.now(),
      meta,
    });
  }
}
