"use strict";
/**
 * @manya-os/cortex — typed error hierarchy.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.KnowledgeError = exports.CoordinationError = exports.RetryError = exports.WorkflowError = exports.ResourceError = exports.GoalError = exports.ConfidenceError = exports.SchedulerError = exports.RoutingError = exports.ToolError = exports.PlanningError = exports.DecompositionError = exports.CortexError = void 0;
class CortexError extends Error {
    code;
    cause;
    constructor(message, code, cause) {
        super(message);
        this.name = new.target.name;
        this.code = code ?? new.target.name;
        if (cause !== undefined)
            this.cause = cause;
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
exports.CortexError = CortexError;
class DecompositionError extends CortexError {
    constructor(message, cause) { super(message, 'DECOMPOSITION_ERROR', cause); }
}
exports.DecompositionError = DecompositionError;
class PlanningError extends CortexError {
    constructor(message, cause) { super(message, 'PLANNING_ERROR', cause); }
}
exports.PlanningError = PlanningError;
class ToolError extends CortexError {
    constructor(message, cause) { super(message, 'TOOL_ERROR', cause); }
}
exports.ToolError = ToolError;
class RoutingError extends CortexError {
    constructor(message, cause) { super(message, 'ROUTING_ERROR', cause); }
}
exports.RoutingError = RoutingError;
class SchedulerError extends CortexError {
    constructor(message, cause) { super(message, 'SCHEDULER_ERROR', cause); }
}
exports.SchedulerError = SchedulerError;
class ConfidenceError extends CortexError {
    constructor(message, cause) { super(message, 'CONFIDENCE_ERROR', cause); }
}
exports.ConfidenceError = ConfidenceError;
class GoalError extends CortexError {
    constructor(message, cause) { super(message, 'GOAL_ERROR', cause); }
}
exports.GoalError = GoalError;
class ResourceError extends CortexError {
    constructor(message, cause) { super(message, 'RESOURCE_ERROR', cause); }
}
exports.ResourceError = ResourceError;
class WorkflowError extends CortexError {
    constructor(message, cause) { super(message, 'WORKFLOW_ERROR', cause); }
}
exports.WorkflowError = WorkflowError;
class RetryError extends CortexError {
    constructor(message, cause) { super(message, 'RETRY_ERROR', cause); }
}
exports.RetryError = RetryError;
class CoordinationError extends CortexError {
    constructor(message, cause) { super(message, 'COORDINATION_ERROR', cause); }
}
exports.CoordinationError = CoordinationError;
class KnowledgeError extends CortexError {
    constructor(message, cause) { super(message, 'KNOWLEDGE_ERROR', cause); }
}
exports.KnowledgeError = KnowledgeError;
//# sourceMappingURL=errors.js.map