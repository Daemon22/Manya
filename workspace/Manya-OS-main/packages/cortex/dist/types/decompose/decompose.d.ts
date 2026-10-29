/**
 * @manya-os/cortex — task decomposition.
 *
 * Breaks a high-level goal description into actionable sub-tasks using
 * heuristics (conjunctions, action verbs, sequencing cues).
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
import type { Task } from '../types.js';
/**
 * Decompose a goal description into sub-tasks.
 * Returns an array of Task objects (without ids assigned by caller).
 */
export declare function decompose(goalDescription: string, opts?: {
    goalId?: string;
}): Task[];
/** Estimate the depth of decomposition needed (1 = simple, 3 = complex). */
export declare function estimateComplexity(goalDescription: string): number;
//# sourceMappingURL=decompose.d.ts.map