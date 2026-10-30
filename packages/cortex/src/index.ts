/**
 * @manya-os/cortex — reasoning orchestration engine.
 *
 * Public API surface for @manya-os/cortex. Everything exported here is part
 * of the stable, semver-bound public API.
 *
 * IMPORTANT: This package is NOT an AI model. It coordinates reasoning by
 * decomposing tasks, planning execution, selecting tools, routing requests,
 * scheduling work, estimating confidence, managing goals, optimizing
 * resources, orchestrating workflows, handling retries, and coordinating
 * multiple intelligent components.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Conceived, directed, and owned by Uviwe Menyiwe (Azura Daemon), founder
 * of the Manya Hael Foundation.
 *
 * Licensed under the Apache License, Version 2.0.
 */

// ----- types & errors -----
export * from './types.js';
export * from './errors.js';

// ----- logging -----
export {
  Logger, LogLevel, ConsoleLogger, SilentLogger,
  scrubMetadata, shouldScrubField, SCRUBBED_FIELD_NAMES,
} from './logging.js';

// ----- config -----
export { DEFAULT_CONFIG, mergeConfig } from './config/config.js';
export type { CortexConfig } from './config/config.js';

// ----- utility -----
export { randomId } from './util.js';

// ----- decompose -----
export { decompose, estimateComplexity } from './decompose/decompose.js';

// ----- planner -----
export { Planner, topoSort } from './planner/planner.js';

// ----- tools -----
export { ToolRegistry } from './tools/registry.js';

// ----- knowledge registry -----
export { KnowledgeRegistry } from './registry/knowledge.js';

// ----- router -----
export { Router } from './router/router.js';

// ----- scheduler -----
export { Scheduler } from './scheduler/scheduler.js';

// ----- confidence -----
export { ConfidenceEstimator, DEFAULT_WEIGHTS } from './confidence/confidence.js';
export type { ConfidenceFactors } from './confidence/confidence.js';

// ----- goals -----
export { GoalManager } from './goals/manager.js';

// ----- resources -----
export { ResourceManager } from './resources/manager.js';

// ----- workflow -----
export { WorkflowEngine } from './workflow/engine.js';

// ----- retry -----
export { withRetry, backoffDelay, isRetryable, DEFAULT_RETRY_POLICY } from './retry/retry.js';

// ----- coordination -----
export { Coordinator } from './coordinate/coordinator.js';

// ----- main facade -----
export { Cortex } from './cortex.js';

// ----- tool-grade facade (composition surface for reflection/agents) -----
export {
  cortex,
  createCortex,
  classifyIntent,
  authorize,
  resolveCapability,
  plan,
  dispatchPlan,
  verifyDecisionTrail,
} from './facade.js';
export type { FacadeCortex, FacadePlan, Intent } from './facade.js';
