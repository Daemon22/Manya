"use strict";
/**
 * @manya-os/cortex — multi-component coordination.
 *
 * Coordinates multiple intelligent components (planner, scheduler, tools,
 * memory, council, etc.) to execute a plan end-to-end.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Coordinator = void 0;
const errors_js_1 = require("../errors.js");
const util_js_1 = require("../util.js");
const retry_js_1 = require("../retry/retry.js");
const logging_js_1 = require("../logging.js");
class Coordinator {
    tools;
    scheduler;
    resources;
    confidence;
    events = [];
    logger;
    constructor(tools, scheduler, resources, confidence, opts) {
        this.tools = tools;
        this.scheduler = scheduler;
        this.resources = resources;
        this.confidence = confidence;
        this.logger = opts?.logger ?? new logging_js_1.SilentLogger();
        this.retryPolicy = opts?.retryPolicy ?? retry_js_1.DEFAULT_RETRY_POLICY;
    }
    retryPolicy;
    /** Execute a plan end-to-end. Returns the plan with task results. */
    async execute(plan) {
        if (!plan)
            throw new errors_js_1.CoordinationError('plan is required');
        this.logger.info('coordinator: starting plan execution', { planId: plan.id, taskCount: plan.tasks.length });
        this.emit('plan_created', { planId: plan.id });
        for (const task of plan.tasks) {
            if (task.status === 'skipped')
                continue;
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
                let result;
                if (tool) {
                    result = await (0, retry_js_1.withRetry)(() => this.tools.invoke(tool.name, task.description, { taskId: task.id, goalId: task.goalId }), this.retryPolicy);
                }
                else {
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
                }
                else {
                    task.status = 'failed';
                    task.error = result.error;
                    this.confidence.recordOutcome(task.description, false);
                    this.emit('task_failed', { taskId: task.id, error: result.error });
                    // Fail the plan if a critical task fails.
                    this.logger.error('coordinator: task failed', { taskId: task.id, error: result.error });
                }
            }
            catch (err) {
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
    getEvents() {
        return [...this.events];
    }
    emit(type, meta) {
        this.events.push({
            id: (0, util_js_1.randomId)('evt'),
            type,
            timestamp: Date.now(),
            meta,
        });
    }
}
exports.Coordinator = Coordinator;
//# sourceMappingURL=coordinator.js.map