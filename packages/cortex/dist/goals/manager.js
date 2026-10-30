"use strict";
/**
 * @manya-os/cortex — goal management.
 *
 * Maintains a goal registry with status transitions, hierarchy, and
 * deadline tracking.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoalManager = void 0;
const errors_js_1 = require("../errors.js");
const util_js_1 = require("../util.js");
const VALID_TRANSITIONS = {
    pending: ['active', 'abandoned'],
    active: ['blocked', 'achieved', 'abandoned'],
    blocked: ['active', 'abandoned'],
    achieved: [],
    abandoned: [],
};
class GoalManager {
    goals = new Map();
    /** Create a new goal. */
    create(description, opts) {
        if (!description)
            throw new errors_js_1.GoalError('description is required');
        if (opts?.parentId && !this.goals.has(opts.parentId)) {
            throw new errors_js_1.GoalError(`parent goal ${opts.parentId} not found`);
        }
        const goal = {
            id: (0, util_js_1.randomId)('goal'),
            description,
            parentId: opts?.parentId,
            priority: opts?.priority ?? 0.5,
            status: 'pending',
            deadline: opts?.deadline,
            successCriteria: opts?.successCriteria,
            createdAt: Date.now(),
        };
        this.goals.set(goal.id, goal);
        return goal;
    }
    /** Get a goal by id. */
    get(id) {
        return this.goals.get(id);
    }
    /** Transition a goal to a new status. */
    transition(id, newStatus) {
        const goal = this.goals.get(id);
        if (!goal)
            throw new errors_js_1.GoalError(`goal ${id} not found`);
        const allowed = VALID_TRANSITIONS[goal.status];
        if (!allowed.includes(newStatus)) {
            throw new errors_js_1.GoalError(`invalid transition ${goal.status} → ${newStatus}`);
        }
        goal.status = newStatus;
        return goal;
    }
    /** Update goal priority. */
    setPriority(id, priority) {
        const g = this.goals.get(id);
        if (!g)
            throw new errors_js_1.GoalError(`goal ${id} not found`);
        if (priority < 0 || priority > 1)
            throw new errors_js_1.GoalError('priority must be in [0,1]');
        g.priority = priority;
    }
    /** Get all goals. */
    all() {
        return Array.from(this.goals.values());
    }
    /** Get active goals (sorted by priority desc). */
    active() {
        return this.all().filter(g => g.status === 'active').sort((a, b) => b.priority - a.priority);
    }
    /** Get child goals of a parent. */
    children(parentId) {
        return this.all().filter(g => g.parentId === parentId);
    }
    /** Find goals past their deadline and not yet achieved/abandoned. */
    overdue(now = Date.now()) {
        return this.all().filter(g => g.deadline && g.deadline < now &&
            (g.status === 'pending' || g.status === 'active' || g.status === 'blocked'));
    }
    /** Delete a goal. */
    delete(id) {
        return this.goals.delete(id);
    }
}
exports.GoalManager = GoalManager;
//# sourceMappingURL=manager.js.map