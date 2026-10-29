/**
 * @manya-os/cortex — resource optimization.
 *
 * Tracks a ResourceBudget and decides whether a new task can be admitted
 * given current utilization.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import type { ResourceBudget, Task } from '../types.js';
import { ResourceError } from '../errors.js';

export class ResourceManager {
  private budget: ResourceBudget;

  constructor(initial?: Partial<ResourceBudget>) {
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
  snapshot(): Readonly<ResourceBudget> {
    return { ...this.budget };
  }

  /** Check whether a task can be admitted. */
  canAdmit(task: Task, now: number = Date.now()): { admit: boolean; reason: string } {
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
  reserve(task: Task): void {
    const check = this.canAdmit(task);
    if (!check.admit) throw new ResourceError(check.reason);
    this.budget.spentCost += task.estimatedCost ?? 0;
    this.budget.activeWorkers += 1;
  }

  /** Release resources after a task completes. */
  release(task: Task, actualDurationMs?: number): void {
    this.budget.activeWorkers = Math.max(0, this.budget.activeWorkers - 1);
    this.budget.elapsedMs += actualDurationMs ?? task.estimatedDurationMs ?? 0;
  }

  /** Reset utilization (e.g. between plan executions). */
  reset(): void {
    this.budget.spentCost = 0;
    this.budget.activeWorkers = 0;
    this.budget.elapsedMs = 0;
  }

  /** Update the budget caps. */
  setCaps(caps: Partial<Pick<ResourceBudget, 'maxCost' | 'maxParallel' | 'maxDurationMs'>>): void {
    if (caps.maxCost !== undefined) this.budget.maxCost = caps.maxCost;
    if (caps.maxParallel !== undefined) this.budget.maxParallel = caps.maxParallel;
    if (caps.maxDurationMs !== undefined) this.budget.maxDurationMs = caps.maxDurationMs;
  }

  /** Utilization ratio in [0,1]. */
  utilization(): { cost: number; parallel: number; duration: number } {
    return {
      cost: this.budget.spentCost / this.budget.maxCost,
      parallel: this.budget.activeWorkers / this.budget.maxParallel,
      duration: this.budget.elapsedMs / this.budget.maxDurationMs,
    };
  }
}
