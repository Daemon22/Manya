/**
 * @manya-os/cortex — typed error hierarchy.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

export class CortexError extends Error {
  public readonly code: string;
  public override readonly cause?: unknown;
  constructor(message: string, code?: string, cause?: unknown) {
    super(message);
    this.name = new.target.name;
    this.code = code ?? new.target.name;
    if (cause !== undefined) this.cause = cause;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class DecompositionError extends CortexError {
  constructor(message: string, cause?: unknown) { super(message, 'DECOMPOSITION_ERROR', cause); }
}
export class PlanningError extends CortexError {
  constructor(message: string, cause?: unknown) { super(message, 'PLANNING_ERROR', cause); }
}
export class ToolError extends CortexError {
  constructor(message: string, cause?: unknown) { super(message, 'TOOL_ERROR', cause); }
}
export class RoutingError extends CortexError {
  constructor(message: string, cause?: unknown) { super(message, 'ROUTING_ERROR', cause); }
}
export class SchedulerError extends CortexError {
  constructor(message: string, cause?: unknown) { super(message, 'SCHEDULER_ERROR', cause); }
}
export class ConfidenceError extends CortexError {
  constructor(message: string, cause?: unknown) { super(message, 'CONFIDENCE_ERROR', cause); }
}
export class GoalError extends CortexError {
  constructor(message: string, cause?: unknown) { super(message, 'GOAL_ERROR', cause); }
}
export class ResourceError extends CortexError {
  constructor(message: string, cause?: unknown) { super(message, 'RESOURCE_ERROR', cause); }
}
export class WorkflowError extends CortexError {
  constructor(message: string, cause?: unknown) { super(message, 'WORKFLOW_ERROR', cause); }
}
export class RetryError extends CortexError {
  constructor(message: string, cause?: unknown) { super(message, 'RETRY_ERROR', cause); }
}
export class CoordinationError extends CortexError {
  constructor(message: string, cause?: unknown) { super(message, 'COORDINATION_ERROR', cause); }
}
export class KnowledgeError extends CortexError {
  constructor(message: string, cause?: unknown) { super(message, 'KNOWLEDGE_ERROR', cause); }
}
