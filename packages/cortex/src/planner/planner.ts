/**
 * @manya-os/cortex — the planner.
 *
 * Topologically sorts decomposed tasks and produces an executable Plan.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import type { Plan, Task, PlanStrategy, Goal } from '../types.js';
import { PlanningError } from '../errors.js';
import { randomId } from '../util.js';
import { decompose, estimateComplexity } from '../decompose/decompose.js';

export class Planner {
  /** Plan a goal by decomposing it and ordering the tasks. */
  plan(goal: Goal, strategy: PlanStrategy = 'adaptive'): Plan {
    if (!goal) throw new PlanningError('goal is required');
    const complexity = estimateComplexity(goal.description);
    let tasks: Task[];

    // Choose decomposition strategy.
    if (strategy === 'decompose-first' || (strategy === 'adaptive' && complexity >= 2)) {
      tasks = decompose(goal.description, { goalId: goal.id });
    } else {
      // Single-task plan.
      tasks = [{
        id: randomId('task'),
        goalId: goal.id,
        description: goal.description,
        status: 'pending',
        createdAt: Date.now(),
      }];
    }

    // Topological sort based on dependencies.
    const ordered = topoSort(tasks);

    // Estimate cost + duration + confidence.
    let estimatedCost = 0;
    let estimatedDurationMs = 0;
    for (const t of ordered) {
      t.estimatedCost = t.estimatedCost ?? 1;
      t.estimatedDurationMs = t.estimatedDurationMs ?? 1000;
      estimatedCost += t.estimatedCost;
      estimatedDurationMs += t.estimatedDurationMs;
    }

    const confidence = estimatePlanConfidence(ordered, complexity);

    return {
      id: randomId('plan'),
      goalId: goal.id,
      tasks: ordered,
      confidence,
      estimatedCost,
      estimatedDurationMs,
      strategy,
      createdAt: Date.now(),
    };
  }

  /** Replan a failed plan — mark failed tasks as skipped, retry or skip dependents. */
  replan(plan: Plan, failedTaskId: string, opts: { retry?: boolean }): Plan {
    const failed = plan.tasks.find(t => t.id === failedTaskId);
    if (!failed) throw new PlanningError(`task ${failedTaskId} not in plan`);
    failed.status = opts.retry ? 'pending' : 'skipped';
    if (!opts.retry) {
      // Mark dependents as skipped.
      const dependents = new Set<string>();
      const queue = [failedTaskId];
      while (queue.length) {
        const id = queue.shift()!;
        for (const t of plan.tasks) {
          if (t.dependsOn?.includes(id) && !dependents.has(t.id)) {
            dependents.add(t.id);
            queue.push(t.id);
          }
        }
      }
      for (const t of plan.tasks) {
        if (dependents.has(t.id)) t.status = 'skipped';
      }
    }
    // Re-sort and re-estimate.
    plan.tasks = topoSort(plan.tasks);
    plan.estimatedCost = plan.tasks.reduce((s, t) => s + (t.estimatedCost ?? 0), 0);
    plan.estimatedDurationMs = plan.tasks.reduce((s, t) => s + (t.estimatedDurationMs ?? 0), 0);
    plan.confidence = estimatePlanConfidence(plan.tasks, 1);
    return plan;
  }
}

/** Topological sort of tasks by their dependencies. Throws on cycles. */
export function topoSort(tasks: Task[]): Task[] {
  const byId = new Map(tasks.map(t => [t.id, t]));
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const out: Task[] = [];
  const visit = (id: string) => {
    if (visited.has(id)) return;
    if (visiting.has(id)) throw new PlanningError(`cycle detected at task ${id}`);
    visiting.add(id);
    const t = byId.get(id);
    if (!t) throw new PlanningError(`unknown task id ${id}`);
    for (const dep of t.dependsOn ?? []) visit(dep);
    visiting.delete(id);
    visited.add(id);
    out.push(t);
  };
  for (const t of tasks) visit(t.id);
  return out;
}

/** Estimate plan confidence based on task count, complexity, and tool availability. */
function estimatePlanConfidence(tasks: Task[], complexity: number): number {
  if (tasks.length === 0) return 0;
  let score = 0.5;
  // More tasks = lower confidence (more failure points).
  score -= Math.min(0.3, tasks.length * 0.05);
  // Higher complexity = lower confidence.
  score -= Math.min(0.2, complexity * 0.05);
  // Tasks with required tools = higher confidence (clear action).
  const withTools = tasks.filter(t => t.requiredTools && t.requiredTools.length > 0).length;
  score += (withTools / tasks.length) * 0.2;
  return Math.max(0, Math.min(1, score));
}
