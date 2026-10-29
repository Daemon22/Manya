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
export declare class GoalManager {
    private readonly goals;
    /** Create a new goal. */
    create(description: string, opts?: {
        priority?: number;
        parentId?: string;
        deadline?: number;
        successCriteria?: string[];
    }): Goal;
    /** Get a goal by id. */
    get(id: string): Goal | undefined;
    /** Transition a goal to a new status. */
    transition(id: string, newStatus: Goal['status']): Goal;
    /** Update goal priority. */
    setPriority(id: string, priority: number): void;
    /** Get all goals. */
    all(): Goal[];
    /** Get active goals (sorted by priority desc). */
    active(): Goal[];
    /** Get child goals of a parent. */
    children(parentId: string): Goal[];
    /** Find goals past their deadline and not yet achieved/abandoned. */
    overdue(now?: number): Goal[];
    /** Delete a goal. */
    delete(id: string): boolean;
}
//# sourceMappingURL=manager.d.ts.map