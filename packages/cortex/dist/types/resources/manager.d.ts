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
export declare class ResourceManager {
    private budget;
    constructor(initial?: Partial<ResourceBudget>);
    /** Current budget snapshot. */
    snapshot(): Readonly<ResourceBudget>;
    /** Check whether a task can be admitted. */
    canAdmit(task: Task, now?: number): {
        admit: boolean;
        reason: string;
    };
    /** Reserve resources for a task. Throws if insufficient. */
    reserve(task: Task): void;
    /** Release resources after a task completes. */
    release(task: Task, actualDurationMs?: number): void;
    /** Reset utilization (e.g. between plan executions). */
    reset(): void;
    /** Update the budget caps. */
    setCaps(caps: Partial<Pick<ResourceBudget, 'maxCost' | 'maxParallel' | 'maxDurationMs'>>): void;
    /** Utilization ratio in [0,1]. */
    utilization(): {
        cost: number;
        parallel: number;
        duration: number;
    };
}
//# sourceMappingURL=manager.d.ts.map