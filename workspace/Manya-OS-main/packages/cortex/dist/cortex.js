"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_CONFIG = exports.Cortex = void 0;
const manager_js_1 = require("./goals/manager.js");
const planner_js_1 = require("./planner/planner.js");
const registry_js_1 = require("./tools/registry.js");
const router_js_1 = require("./router/router.js");
const scheduler_js_1 = require("./scheduler/scheduler.js");
const confidence_js_1 = require("./confidence/confidence.js");
const manager_js_2 = require("./resources/manager.js");
const engine_js_1 = require("./workflow/engine.js");
const coordinator_js_1 = require("./coordinate/coordinator.js");
const knowledge_js_1 = require("./registry/knowledge.js");
const config_js_1 = require("./config/config.js");
Object.defineProperty(exports, "DEFAULT_CONFIG", { enumerable: true, get: function () { return config_js_1.DEFAULT_CONFIG; } });
const logging_js_1 = require("./logging.js");
class Cortex {
    goals;
    planner;
    tools;
    router;
    scheduler;
    confidence;
    resources;
    workflows;
    coordinator;
    knowledge;
    config;
    logger;
    constructor(config) {
        this.config = (0, config_js_1.mergeConfig)(config);
        this.logger = this.config.logger ?? (this.config.logLevel === 'silent' ? new logging_js_1.SilentLogger() : new logging_js_1.ConsoleLogger(this.config.logLevel));
        this.goals = new manager_js_1.GoalManager();
        this.planner = new planner_js_1.Planner();
        this.tools = new registry_js_1.ToolRegistry();
        this.router = new router_js_1.Router();
        this.scheduler = new scheduler_js_1.Scheduler();
        this.confidence = new confidence_js_1.ConfidenceEstimator();
        this.resources = new manager_js_2.ResourceManager(this.config.resourceBudget);
        this.workflows = new engine_js_1.WorkflowEngine(this.tools);
        this.knowledge = new knowledge_js_1.KnowledgeRegistry();
        this.coordinator = new coordinator_js_1.Coordinator(this.tools, this.scheduler, this.resources, this.confidence, { logger: this.logger, retryPolicy: this.config.retryPolicy });
    }
    /** Set a goal. */
    setGoal(description, opts) {
        const goal = this.goals.create(description, opts);
        this.goals.transition(goal.id, 'active');
        this.logger.info('cortex: goal set', { goalId: goal.id, description: description.slice(0, 60) });
        return goal;
    }
    /** Plan a goal. */
    planGoal(goal) {
        return this.planner.plan(goal, this.config.defaultStrategy);
    }
    /** Execute a plan end-to-end. */
    async executePlan(plan) {
        return this.coordinator.execute(plan);
    }
    /** Convenience: set a goal, plan it, and execute. */
    async reason(description, opts) {
        const goal = this.setGoal(description, opts);
        const plan = this.planGoal(goal);
        const executed = await this.executePlan(plan);
        this.goals.transition(goal.id, executed.tasks.every(t => t.status === 'completed') ? 'achieved' : 'active');
        return { goal, plan: executed, events: this.coordinator.getEvents() };
    }
    /** Route an input to the appropriate component. */
    route(input) {
        return this.router.route(input);
    }
    /** Register a tool. */
    registerTool(tool) {
        this.tools.register(tool);
    }
    /** Execute a workflow. */
    async runWorkflow(workflow, initialInput) {
        return this.workflows.execute(workflow, initialInput);
    }
    /** Get all reasoning events from the last coordination run. */
    getEvents() {
        return this.coordinator.getEvents();
    }
    /** Register a knowledge key in the cortex knowledge registry. */
    registerKnowledge(key, ownerComponentId, opts) {
        this.knowledge.register(key, ownerComponentId, opts);
    }
    /** Query knowledge ownership. */
    queryKnowledge(key) {
        return this.knowledge.lookup(key)?.ownerComponentId;
    }
    /** Reset the cortex for a fresh run. */
    reset() {
        this.scheduler.clear();
        this.resources.reset();
    }
}
exports.Cortex = Cortex;
//# sourceMappingURL=cortex.js.map