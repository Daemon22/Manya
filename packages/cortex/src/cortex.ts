/**
 * @manya-os/cortex — the reasoning orchestration engine facade.
 *
 * Wires together decomposition, planning, tools, routing, scheduling,
 * confidence, goals, resources, workflows, retries, and coordination.
 *
 * IMPORTANT: This package is NOT an AI model. It coordinates reasoning by
 * decomposing tasks, planning execution, selecting tools, routing requests,
 * scheduling work, estimating confidence, managing goals, optimizing
 * resources, orchestrating workflows, handling retries, and coordinating
 * multiple intelligent components.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import type { Goal, Plan, Task, Tool, Workflow, WorkflowExecution, RoutedRequest, ReasoningEvent } from './types.js';
import { GoalManager } from './goals/manager.js';
import { Planner } from './planner/planner.js';
import { ToolRegistry } from './tools/registry.js';
import { Router } from './router/router.js';
import { Scheduler } from './scheduler/scheduler.js';
import { ConfidenceEstimator } from './confidence/confidence.js';
import { ResourceManager } from './resources/manager.js';
import { WorkflowEngine } from './workflow/engine.js';
import { Coordinator } from './coordinate/coordinator.js';
import { KnowledgeRegistry } from './registry/knowledge.js';
import { DEFAULT_CONFIG, mergeConfig } from './config/config.js';
import type { CortexConfig } from './config/config.js';
import { ConsoleLogger, SilentLogger } from './logging.js';
import type { Logger } from './logging.js';
import { CortexError } from './errors.js';

export class Cortex {
  public readonly goals: GoalManager;
  public readonly planner: Planner;
  public readonly tools: ToolRegistry;
  public readonly router: Router;
  public readonly scheduler: Scheduler;
  public readonly confidence: ConfidenceEstimator;
  public readonly resources: ResourceManager;
  public readonly workflows: WorkflowEngine;
  public readonly coordinator: Coordinator;
  public readonly knowledge: KnowledgeRegistry;
  private readonly config: Required<Omit<CortexConfig, 'logger'>> & { logger?: Logger };
  private readonly logger: Logger;

  constructor(config?: CortexConfig) {
    this.config = mergeConfig(config);
    this.logger = this.config.logger ?? (
      this.config.logLevel === 'silent' ? new SilentLogger() : new ConsoleLogger(this.config.logLevel)
    );
    this.goals = new GoalManager();
    this.planner = new Planner();
    this.tools = new ToolRegistry();
    this.router = new Router();
    this.scheduler = new Scheduler();
    this.confidence = new ConfidenceEstimator();
    this.resources = new ResourceManager(this.config.resourceBudget);
    this.workflows = new WorkflowEngine(this.tools);
    this.knowledge = new KnowledgeRegistry();
    this.coordinator = new Coordinator(
      this.tools, this.scheduler, this.resources, this.confidence,
      { logger: this.logger, retryPolicy: this.config.retryPolicy },
    );
  }

  /** Set a goal. */
  setGoal(description: string, opts?: { priority?: number; deadline?: number; successCriteria?: string[] }): Goal {
    const goal = this.goals.create(description, opts);
    this.goals.transition(goal.id, 'active');
    this.logger.info('cortex: goal set', { goalId: goal.id, description: description.slice(0, 60) });
    return goal;
  }

  /** Plan a goal. */
  planGoal(goal: Goal): Plan {
    return this.planner.plan(goal, this.config.defaultStrategy);
  }

  /** Execute a plan end-to-end. */
  async executePlan(plan: Plan): Promise<Plan> {
    return this.coordinator.execute(plan);
  }

  /** Convenience: set a goal, plan it, and execute. */
  async reason(description: string, opts?: { priority?: number; deadline?: number }): Promise<{ goal: Goal; plan: Plan; events: ReasoningEvent[] }> {
    const goal = this.setGoal(description, opts);
    const plan = this.planGoal(goal);
    const executed = await this.executePlan(plan);
    this.goals.transition(goal.id, executed.tasks.every(t => t.status === 'completed') ? 'achieved' : 'active');
    return { goal, plan: executed, events: this.coordinator.getEvents() };
  }

  /** Route an input to the appropriate component. */
  route(input: string): RoutedRequest {
    return this.router.route(input);
  }

  /** Register a tool. */
  registerTool(tool: Tool): void {
    this.tools.register(tool);
  }

  /** Execute a workflow. */
  async runWorkflow(workflow: Workflow, initialInput?: unknown): Promise<WorkflowExecution> {
    return this.workflows.execute(workflow, initialInput);
  }

  /** Get all reasoning events from the last coordination run. */
  getEvents(): ReasoningEvent[] {
    return this.coordinator.getEvents();
  }

  /** Register a knowledge key in the cortex knowledge registry. */
  registerKnowledge(key: string, ownerComponentId: string, opts?: { description?: string }): void {
    this.knowledge.register(key, ownerComponentId, opts);
  }

  /** Query knowledge ownership. */
  queryKnowledge(key: string): string | undefined {
    return this.knowledge.lookup(key)?.ownerComponentId;
  }

  /** Reset the cortex for a fresh run. */
  reset(): void {
    this.scheduler.clear();
    this.resources.reset();
  }
}

export { DEFAULT_CONFIG };
