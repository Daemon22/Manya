/**
 * @manya-os/cortex — shared type definitions.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

/** A goal is a high-level objective the cortex pursues. */
export interface Goal {
  id: string;
  description: string;
  /** Optional parent goal id for hierarchical goals. */
  parentId?: string;
  /** Priority in [0,1] — higher = more important. */
  priority: number;
  /** Goal status. */
  status: 'pending' | 'active' | 'blocked' | 'achieved' | 'abandoned';
  /** Optional deadline (epoch ms). */
  deadline?: number;
  /** Success criteria — a list of conditions to evaluate. */
  successCriteria?: string[];
  /** Created at. */
  createdAt: number;
}

/** A task is a unit of work toward a goal. */
export interface Task {
  id: string;
  goalId?: string;
  description: string;
  /** Decomposed sub-tasks (if any). */
  subtasks?: string[];
  /** Required tools (by name). */
  requiredTools?: string[];
  /** Estimated cost (arbitrary units). */
  estimatedCost?: number;
  /** Estimated duration in ms. */
  estimatedDurationMs?: number;
  /** Confidence in [0,1] that this task is correctly decomposed. */
  confidence?: number;
  /** Status. */
  status: 'pending' | 'scheduled' | 'running' | 'completed' | 'failed' | 'skipped';
  /** Dependencies (other task ids that must complete first). */
  dependsOn?: string[];
  /** Result of execution (if any). */
  result?: unknown;
  /** Error message if failed. */
  error?: string;
  /** Created at. */
  createdAt: number;
}

/** A plan is a structured set of tasks to achieve a goal. */
export interface Plan {
  id: string;
  goalId: string;
  /** Tasks in execution order (topological sort of the dependency graph). */
  tasks: Task[];
  /** Overall confidence in [0,1]. */
  confidence: number;
  /** Total estimated cost. */
  estimatedCost: number;
  /** Total estimated duration. */
  estimatedDurationMs: number;
  /** Strategy used to generate the plan. */
  strategy: PlanStrategy;
  /** Created at. */
  createdAt: number;
}

/** Strategy used by the planner. */
export type PlanStrategy = 'sequential' | 'parallel' | 'adaptive' | 'iterative' | 'decompose-first';

/** A tool that the cortex can invoke. */
export interface Tool {
  name: string;
  description: string;
  /** Required input schema (informal — keys are parameter names). */
  parameters?: Record<string, string>;
  /** Whether the tool is async. */
  async?: boolean;
  /** The function. */
  handler: (input: unknown, ctx?: ToolContext) => Promise<ToolResult> | ToolResult;
  /** Estimated cost of invoking this tool. */
  cost?: number;
  /** Tags for tool selection. */
  tags?: string[];
}

/** Context passed to tool handlers. */
export interface ToolContext {
  /** The task that triggered this tool call. */
  taskId?: string;
  /** The goal the task serves. */
  goalId?: string;
  /** A logger. */
  log?: (msg: string, meta?: Record<string, unknown>) => void;
  /** Arbitrary shared state. */
  state?: Record<string, unknown>;
}

/** Result of a tool invocation. */
export interface ToolResult {
  success: boolean;
  output?: unknown;
  error?: string;
  /** Confidence in the result. */
  confidence?: number;
  /** Wall-clock duration in ms. */
  durationMs?: number;
}

/** A routed request — the cortex decides which component should handle it. */
export interface RoutedRequest {
  id: string;
  /** Original input. */
  input: string;
  /** Component selected to handle the request. */
  component: string;
  /** Confidence in the routing decision. */
  confidence: number;
  /** Reason for the selection. */
  reason: string;
  /** Routed at. */
  routedAt: number;
}

/** A scheduled task — when and where it will run. */
export interface ScheduledTask {
  taskId: string;
  /** Scheduled start time (epoch ms). */
  scheduledAt: number;
  /** Worker/component that will execute it. */
  worker: string;
  /** Priority (higher = runs first when tied). */
  priority: number;
}

/** A confidence estimate. */
export interface ConfidenceEstimate {
  /** Confidence in [0,1]. */
  confidence: number;
  /** Reasoning behind the estimate. */
  reasoning: string;
  /** Factors that contributed. */
  factors: Array<{ name: string; weight: number; contribution: number }>;
}

/** A resource budget. */
export interface ResourceBudget {
  /** Maximum total cost. */
  maxCost: number;
  /** Maximum parallel workers. */
  maxParallel: number;
  /** Maximum wall-clock duration in ms. */
  maxDurationMs: number;
  /** Current spent cost. */
  spentCost: number;
  /** Current active workers. */
  activeWorkers: number;
  /** Current elapsed ms. */
  elapsedMs: number;
}

/** A workflow step. */
export interface WorkflowStep {
  id: string;
  /** Step name for human display. */
  name: string;
  /** Tool to invoke. */
  tool?: string;
  /** Input to the tool (may be a template). */
  input?: unknown;
  /** Next step id on success. */
  nextOnSuccess?: string;
  /** Next step id on failure. */
  nextOnFailure?: string;
  /** Whether this is a terminal step. */
  terminal?: boolean;
}

/** A workflow definition. */
export interface Workflow {
  id: string;
  name: string;
  steps: WorkflowStep[];
  /** Initial step id. */
  initialStep: string;
}

/** A workflow execution state. */
export interface WorkflowExecution {
  id: string;
  workflowId: string;
  currentStepId: string;
  /** Steps visited (in order). */
  visitedSteps: string[];
  /** Outputs by step id. */
  outputs: Record<string, unknown>;
  status: 'running' | 'completed' | 'failed' | 'aborted';
  startedAt: number;
  endedAt?: number;
  error?: string;
}

/** A retry policy. */
export interface RetryPolicy {
  maxAttempts: number;
  /** Backoff strategy. */
  backoff: 'fixed' | 'linear' | 'exponential';
  /** Base delay in ms. */
  baseDelayMs: number;
  /** Maximum delay in ms. */
  maxDelayMs: number;
  /** Retryable error codes/messages (substring match). */
  retryableErrors?: string[];
}

/** Intent classification — what kind of request is this? */
export type Intent = 'planning' | 'recall' | 'execution' | 'communication' | 'analysis' | 'monitoring' | 'unknown';

/** A reasoning event for observability. */
export interface ReasoningEvent {
  id: string;
  type: 'goal_set' | 'plan_created' | 'task_scheduled' | 'task_started' | 'task_completed' | 'task_failed' | 'tool_invoked' | 'confidence_updated' | 'workflow_step' | 'retry' | 'coordinated' | 'knowledge_registered' | 'knowledge_updated' | 'knowledge_queried';
  timestamp: number;
  meta?: Record<string, unknown>;
}

// ----- knowledge registry types -----

/** A single provenance entry tracking which component owns a knowledge key. */
export interface ProvenanceEntry {
  /** The knowledge key (e.g. 'user:preferences:theme'). */
  key: string;
  /** The component that registered this key. */
  ownerComponentId: string;
  /** Epoch ms when first registered. */
  registeredAt: number;
  /** Epoch ms when last updated. */
  lastUpdated: number;
  /** Optional human-readable description of what this key represents. */
  description?: string;
}

/** A delta payload representing changes since a given timestamp. */
export interface DeltaPayload {
  /** Keys that were newly registered after `since`. */
  added: ProvenanceEntry[];
  /** Keys that were updated after `since` (registered earlier, modified later). */
  changed: ProvenanceEntry[];
  /** Keys that were derived (i.e. not directly registered but computed from others). */
  derived: ProvenanceEntry[];
}

/** Result of a diff operation. */
export interface DiffResult {
  /** Whether any changes exist since the given timestamp. */
  hasChanges: boolean;
  /** The delta payload. */
  delta: DeltaPayload;
  /** Timestamp of the diff query. */
  queriedAt: number;
}
