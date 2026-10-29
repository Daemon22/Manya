# @manya-os/cortex — API Reference

> Complete TypeScript API reference for `@manya-os/cortex` v1.0.0.

## Contents
- [Types](#types)
- [Errors](#errors)
- [Cortex Facade](#cortex-facade)
- [Decomposition](#decomposition)
- [Planner](#planner)
- [ToolRegistry](#toolregistry)
- [Router](#router)
- [Scheduler](#scheduler)
- [ConfidenceEstimator](#confidenceestimator)
- [GoalManager](#goalmanager)
- [ResourceManager](#resourcemanager)
- [WorkflowEngine](#workflowengine)
- [Retry](#retry)
- [Coordinator](#coordinator)

---

## Types

### `Goal`
```ts
interface Goal {
  id: string;
  description: string;
  parentId?: string;
  priority: number;  // [0,1]
  status: 'pending' | 'active' | 'blocked' | 'achieved' | 'abandoned';
  deadline?: number;
  successCriteria?: string[];
  createdAt: number;
}
```

### `Task`
```ts
interface Task {
  id: string;
  goalId?: string;
  description: string;
  subtasks?: string[];
  requiredTools?: string[];
  estimatedCost?: number;
  estimatedDurationMs?: number;
  confidence?: number;
  status: 'pending' | 'scheduled' | 'running' | 'completed' | 'failed' | 'skipped';
  dependsOn?: string[];
  result?: unknown;
  error?: string;
  createdAt: number;
}
```

### `Plan`
```ts
interface Plan {
  id: string;
  goalId: string;
  tasks: Task[];
  confidence: number;
  estimatedCost: number;
  estimatedDurationMs: number;
  strategy: 'sequential' | 'parallel' | 'adaptive' | 'iterative' | 'decompose-first';
  createdAt: number;
}
```

### `Tool`
```ts
interface Tool {
  name: string;
  description: string;
  parameters?: Record<string, string>;
  async?: boolean;
  handler: (input: unknown, ctx?: ToolContext) => Promise<ToolResult> | ToolResult;
  cost?: number;
  tags?: string[];
}
```

### `ToolResult`
```ts
interface ToolResult {
  success: boolean;
  output?: unknown;
  error?: string;
  confidence?: number;
  durationMs?: number;
}
```

### `Workflow`
```ts
interface Workflow {
  id: string;
  name: string;
  steps: WorkflowStep[];
  initialStep: string;
}

interface WorkflowStep {
  id: string;
  name: string;
  tool?: string;
  input?: unknown;
  nextOnSuccess?: string;
  nextOnFailure?: string;
  terminal?: boolean;
}
```

### `RetryPolicy`
```ts
interface RetryPolicy {
  maxAttempts: number;
  backoff: 'fixed' | 'linear' | 'exponential';
  baseDelayMs: number;
  maxDelayMs: number;
  retryableErrors?: string[];
}
```

### `Intent`
```ts
type Intent = 'planning' | 'recall' | 'execution' | 'communication' | 'analysis' | 'monitoring' | 'unknown';
```

---

## Errors

All errors extend `CortexError` and carry a stable `code` string.

| Class | Code |
| --- | --- |
| `CortexError` | `CORTEX_ERROR` |
| `DecompositionError` | `DECOMPOSITION_ERROR` |
| `PlanningError` | `PLANNING_ERROR` |
| `ToolError` | `TOOL_ERROR` |
| `RoutingError` | `ROUTING_ERROR` |
| `SchedulerError` | `SCHEDULER_ERROR` |
| `ConfidenceError` | `CONFIDENCE_ERROR` |
| `GoalError` | `GOAL_ERROR` |
| `ResourceError` | `RESOURCE_ERROR` |
| `WorkflowError` | `WORKFLOW_ERROR` |
| `RetryError` | `RETRY_ERROR` |
| `CoordinationError` | `COORDINATION_ERROR` |

---

## Cortex Facade

### `class Cortex`
```ts
new Cortex(config?: CortexConfig)
```

Public fields: `goals`, `planner`, `tools`, `router`, `scheduler`, `confidence`, `resources`, `workflows`, `coordinator`.

Methods:
- `setGoal(description, opts?)` — create + activate a goal.
- `planGoal(goal)` — produce a Plan.
- `executePlan(plan)` — execute end-to-end.
- `reason(description, opts?)` — set goal → plan → execute, returns `{ goal, plan, events }`.
- `route(input)` — classify + route an input.
- `registerTool(tool)` — add to registry.
- `runWorkflow(workflow, initialInput?)` — execute a workflow.
- `getEvents()` — last coordination run's reasoning events.
- `reset()` — clear scheduler + resources.

---

## Decomposition

### `decompose(goalDescription, opts?)`
Returns `Task[]` split on conjunctions + action verbs.

### `estimateComplexity(goalDescription)`
Returns 1-5 based on conjunction count.

---

## Planner

### `class Planner`
```ts
new Planner()
```
Methods:
- `plan(goal, strategy?)` — produce a Plan.
- `replan(plan, failedTaskId, opts)` — skip/retry a failed task.

### `topoSort(tasks)`
Topological sort by `dependsOn`. Throws on cycle.

---

## ToolRegistry

### `class ToolRegistry`
Methods: `register`, `unregister`, `get`, `list`, `findByTag`, `select(requiredTools?, preferredTags?)`, `invoke(name, input, ctx?)`.

---

## Router

### `class Router`
Methods:
- `classify(input)` — returns `Intent`.
- `route(input)` — returns `RoutedRequest`.
- `setComponent(intent, component)` — per-instance override.

---

## Scheduler

### `class Scheduler`
Methods: `schedule(task, worker, opts?)`, `popNext()`, `next(completedTaskIds)`, `cancel(taskId)`, `all()`, `size()`, `clear()`.

Throws `SchedulerError` on dependency or budget violations.

---

## ConfidenceEstimator

### `class ConfidenceEstimator`
Methods:
- `estimate(factors)` — returns `ConfidenceEstimate`.
- `recordOutcome(task, success)` — track past results.
- `pastSuccessRate(taskSubstring)` — historical success rate.

### `ConfidenceFactors`
```ts
interface ConfidenceFactors {
  planConfidence?: number;
  toolReliability?: number;
  evidenceCount?: number;
  agreementRate?: number;
  domainFamiliarity?: number;
}
```

---

## GoalManager

### `class GoalManager`
Methods: `create(description, opts?)`, `get(id)`, `transition(id, newStatus)`, `setPriority(id, p)`, `all()`, `active()`, `children(parentId)`, `overdue(now?)`, `delete(id)`.

Valid status transitions:
- `pending` → `active`, `abandoned`
- `active` → `blocked`, `achieved`, `abandoned`
- `blocked` → `active`, `abandoned`

---

## ResourceManager

### `class ResourceManager`
```ts
new ResourceManager(initial?: Partial<ResourceBudget>)
```
Methods: `snapshot()`, `canAdmit(task, now?)`, `reserve(task)`, `release(task, actualDurationMs?)`, `reset()`, `setCaps(caps)`, `utilization()`.

---

## WorkflowEngine

### `class WorkflowEngine`
```ts
new WorkflowEngine(tools: ToolRegistry)
```
Methods: `execute(workflow, initialInput?)`, `abort(exec)`.

---

## Retry

### `withRetry(fn, policy?)`
Executes `fn` with retry policy. Throws `RetryError` after all attempts fail.

### `backoffDelay(policy, attempt)`
Returns delay in ms before the next attempt.

### `isRetryable(policy, errorMessage)`
Boolean — does the error match retryable substrings?

### `DEFAULT_RETRY_POLICY`
```ts
{ maxAttempts: 3, backoff: 'exponential', baseDelayMs: 100, maxDelayMs: 5000,
  retryableErrors: ['timeout', 'transient', 'busy', 'unavailable'] }
```

---

## Coordinator

### `class Coordinator`
```ts
new Coordinator(tools, scheduler, resources, confidence, opts?)
```
Methods:
- `execute(plan)` — execute end-to-end, returns the Plan with task results populated.
- `getEvents()` — array of `ReasoningEvent`s emitted during execution.
