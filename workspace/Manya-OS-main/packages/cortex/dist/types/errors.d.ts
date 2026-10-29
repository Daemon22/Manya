/**
 * @manya-os/cortex — typed error hierarchy.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
export declare class CortexError extends Error {
    readonly code: string;
    readonly cause?: unknown;
    constructor(message: string, code?: string, cause?: unknown);
}
export declare class DecompositionError extends CortexError {
    constructor(message: string, cause?: unknown);
}
export declare class PlanningError extends CortexError {
    constructor(message: string, cause?: unknown);
}
export declare class ToolError extends CortexError {
    constructor(message: string, cause?: unknown);
}
export declare class RoutingError extends CortexError {
    constructor(message: string, cause?: unknown);
}
export declare class SchedulerError extends CortexError {
    constructor(message: string, cause?: unknown);
}
export declare class ConfidenceError extends CortexError {
    constructor(message: string, cause?: unknown);
}
export declare class GoalError extends CortexError {
    constructor(message: string, cause?: unknown);
}
export declare class ResourceError extends CortexError {
    constructor(message: string, cause?: unknown);
}
export declare class WorkflowError extends CortexError {
    constructor(message: string, cause?: unknown);
}
export declare class RetryError extends CortexError {
    constructor(message: string, cause?: unknown);
}
export declare class CoordinationError extends CortexError {
    constructor(message: string, cause?: unknown);
}
export declare class KnowledgeError extends CortexError {
    constructor(message: string, cause?: unknown);
}
//# sourceMappingURL=errors.d.ts.map