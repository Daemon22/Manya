"use strict";
/**
 * @manya-os/cortex — resource optimization.
 *
 * Tracks a ResourceBudget and decides whether a new task can be admitted
 * given current utilization.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResourceManager = void 0;
const errors_js_1 = require("../errors.js");
class ResourceManager {
    budget;
    constructor(initial) {
        this.budget = {
            maxCost: initial?.maxCost ?? 1000,
            maxParallel: initial?.maxParallel ?? 4,
            maxDurationMs: initial?.maxDurationMs ?? 60_000,
            spentCost: initial?.spentCost ?? 0,
            activeWorkers: initial?.activeWorkers ?? 0,
            elapsedMs: initial?.elapsedMs ?? 0,
        };
    }
    /** Current budget snapshot. */
    snapshot() {
        return { ...this.budget };
    }
    /** Check whether a task can be admitted. */
    canAdmit(task, now = Date.now()) {
        const cost = task.estimatedCost ?? 0;
        const duration = task.estimatedDurationMs ?? 0;
        if (this.budget.spentCost + cost > this.budget.maxCost) {
            return { admit: false, reason: `cost budget exceeded (${this.budget.spentCost + cost} > ${this.budget.maxCost})` };
        }
        if (this.budget.activeWorkers >= this.budget.maxParallel) {
            return { admit: false, reason: `parallel worker budget exceeded (${this.budget.activeWorkers} >= ${this.budget.maxParallel})` };
        }
        if (this.budget.elapsedMs + duration > this.budget.maxDurationMs) {
            return { admit: false, reason: `duration budget exceeded (${this.budget.elapsedMs + duration} > ${this.budget.maxDurationMs})` };
        }
        void now;
        return { admit: true, reason: 'within budget' };
    }
    /** Reserve resources for a task. Throws if insufficient. */
    reserve(task) {
        const check = this.canAdmit(task);
        if (!check.admit)
            throw new errors_js_1.ResourceError(check.reason);
        this.budget.spentCost += task.estimatedCost ?? 0;
        this.budget.activeWorkers += 1;
    }
    /** Release resources after a task completes. */
    release(task, actualDurationMs) {
        this.budget.activeWorkers = Math.max(0, this.budget.activeWorkers - 1);
        this.budget.elapsedMs += actualDurationMs ?? task.estimatedDurationMs ?? 0;
    }
    /** Reset utilization (e.g. between plan executions). */
    reset() {
        this.budget.spentCost = 0;
        this.budget.activeWorkers = 0;
        this.budget.elapsedMs = 0;
    }
    /** Update the budget caps. */
    setCaps(caps) {
        if (caps.maxCost !== undefined)
            this.budget.maxCost = caps.maxCost;
        if (caps.maxParallel !== undefined)
            this.budget.maxParallel = caps.maxParallel;
        if (caps.maxDurationMs !== undefined)
            this.budget.maxDurationMs = caps.maxDurationMs;
    }
    /** Utilization ratio in [0,1]. */
    utilization() {
        return {
            cost: this.budget.spentCost / this.budget.maxCost,
            parallel: this.budget.activeWorkers / this.budget.maxParallel,
            duration: this.budget.elapsedMs / this.budget.maxDurationMs,
        };
    }
}
exports.ResourceManager = ResourceManager;
//# sourceMappingURL=manager.js.map