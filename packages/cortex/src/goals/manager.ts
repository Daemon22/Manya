/**
 * @manya-os/cortex — goal management.
 *
 * Maintains a goal registry with status transitions, hierarchy, and
 * deadline tracking.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import type { Goal } from '../types.js';
import { GoalError } from '../errors.js';
import { randomId } from '../util.js';

const VALID_TRANSITIONS: Record<Goal['status'], Goal['status'][]> = {
  pending: ['active', 'abandoned'],
  active: ['blocked', 'achieved', 'abandoned'],
  blocked: ['active', 'abandoned'],
  achieved: [],
  abandoned: [],
};

export class GoalManager {
  private readonly goals = new Map<string, Goal>();

  /** Create a new goal. */
  create(description: string, opts?: { priority?: number; parentId?: string; deadline?: number; successCriteria?: string[] }): Goal {
    if (!description) throw new GoalError('description is required');
    if (opts?.parentId && !this.goals.has(opts.parentId)) {
      throw new GoalError(`parent goal ${opts.parentId} not found`);
    }
    const goal: Goal = {
      id: randomId('goal'),
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
  get(id: string): Goal | undefined {
    return this.goals.get(id);
  }

  /** Transition a goal to a new status. */
  transition(id: string, newStatus: Goal['status']): Goal {
    const goal = this.goals.get(id);
    if (!goal) throw new GoalError(`goal ${id} not found`);
    const allowed = VALID_TRANSITIONS[goal.status];
    if (!allowed.includes(newStatus)) {
      throw new GoalError(`invalid transition ${goal.status} → ${newStatus}`);
    }
    goal.status = newStatus;
    return goal;
  }

  /** Update goal priority. */
  setPriority(id: string, priority: number): void {
    const g = this.goals.get(id);
    if (!g) throw new GoalError(`goal ${id} not found`);
    if (priority < 0 || priority > 1) throw new GoalError('priority must be in [0,1]');
    g.priority = priority;
  }

  /** Get all goals. */
  all(): Goal[] {
    return Array.from(this.goals.values());
  }

  /** Get active goals (sorted by priority desc). */
  active(): Goal[] {
    return this.all().filter(g => g.status === 'active').sort((a, b) => b.priority - a.priority);
  }

  /** Get child goals of a parent. */
  children(parentId: string): Goal[] {
    return this.all().filter(g => g.parentId === parentId);
  }

  /** Find goals past their deadline and not yet achieved/abandoned. */
  overdue(now: number = Date.now()): Goal[] {
    return this.all().filter(g => g.deadline && g.deadline < now &&
      (g.status === 'pending' || g.status === 'active' || g.status === 'blocked'));
  }

  /** Delete a goal. */
  delete(id: string): boolean {
    return this.goals.delete(id);
  }
}
