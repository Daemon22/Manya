"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyDecisionTrail = exports.dispatchPlan = exports.plan = exports.resolveCapability = exports.authorize = exports.classifyIntent = exports.createCortex = exports.cortex = exports.Cortex = exports.Coordinator = exports.DEFAULT_RETRY_POLICY = exports.isRetryable = exports.backoffDelay = exports.withRetry = exports.WorkflowEngine = exports.ResourceManager = exports.GoalManager = exports.DEFAULT_WEIGHTS = exports.ConfidenceEstimator = exports.Scheduler = exports.Router = exports.KnowledgeRegistry = exports.ToolRegistry = exports.topoSort = exports.Planner = exports.estimateComplexity = exports.decompose = exports.randomId = exports.mergeConfig = exports.DEFAULT_CONFIG = exports.SCRUBBED_FIELD_NAMES = exports.shouldScrubField = exports.scrubMetadata = exports.SilentLogger = exports.ConsoleLogger = void 0;
// ----- types & errors -----
__exportStar(require("./types.js"), exports);
__exportStar(require("./errors.js"), exports);
// ----- logging -----
var logging_js_1 = require("./logging.js");
Object.defineProperty(exports, "ConsoleLogger", { enumerable: true, get: function () { return logging_js_1.ConsoleLogger; } });
Object.defineProperty(exports, "SilentLogger", { enumerable: true, get: function () { return logging_js_1.SilentLogger; } });
Object.defineProperty(exports, "scrubMetadata", { enumerable: true, get: function () { return logging_js_1.scrubMetadata; } });
Object.defineProperty(exports, "shouldScrubField", { enumerable: true, get: function () { return logging_js_1.shouldScrubField; } });
Object.defineProperty(exports, "SCRUBBED_FIELD_NAMES", { enumerable: true, get: function () { return logging_js_1.SCRUBBED_FIELD_NAMES; } });
// ----- config -----
var config_js_1 = require("./config/config.js");
Object.defineProperty(exports, "DEFAULT_CONFIG", { enumerable: true, get: function () { return config_js_1.DEFAULT_CONFIG; } });
Object.defineProperty(exports, "mergeConfig", { enumerable: true, get: function () { return config_js_1.mergeConfig; } });
// ----- utility -----
var util_js_1 = require("./util.js");
Object.defineProperty(exports, "randomId", { enumerable: true, get: function () { return util_js_1.randomId; } });
// ----- decompose -----
var decompose_js_1 = require("./decompose/decompose.js");
Object.defineProperty(exports, "decompose", { enumerable: true, get: function () { return decompose_js_1.decompose; } });
Object.defineProperty(exports, "estimateComplexity", { enumerable: true, get: function () { return decompose_js_1.estimateComplexity; } });
// ----- planner -----
var planner_js_1 = require("./planner/planner.js");
Object.defineProperty(exports, "Planner", { enumerable: true, get: function () { return planner_js_1.Planner; } });
Object.defineProperty(exports, "topoSort", { enumerable: true, get: function () { return planner_js_1.topoSort; } });
// ----- tools -----
var registry_js_1 = require("./tools/registry.js");
Object.defineProperty(exports, "ToolRegistry", { enumerable: true, get: function () { return registry_js_1.ToolRegistry; } });
// ----- knowledge registry -----
var knowledge_js_1 = require("./registry/knowledge.js");
Object.defineProperty(exports, "KnowledgeRegistry", { enumerable: true, get: function () { return knowledge_js_1.KnowledgeRegistry; } });
// ----- router -----
var router_js_1 = require("./router/router.js");
Object.defineProperty(exports, "Router", { enumerable: true, get: function () { return router_js_1.Router; } });
// ----- scheduler -----
var scheduler_js_1 = require("./scheduler/scheduler.js");
Object.defineProperty(exports, "Scheduler", { enumerable: true, get: function () { return scheduler_js_1.Scheduler; } });
// ----- confidence -----
var confidence_js_1 = require("./confidence/confidence.js");
Object.defineProperty(exports, "ConfidenceEstimator", { enumerable: true, get: function () { return confidence_js_1.ConfidenceEstimator; } });
Object.defineProperty(exports, "DEFAULT_WEIGHTS", { enumerable: true, get: function () { return confidence_js_1.DEFAULT_WEIGHTS; } });
// ----- goals -----
var manager_js_1 = require("./goals/manager.js");
Object.defineProperty(exports, "GoalManager", { enumerable: true, get: function () { return manager_js_1.GoalManager; } });
// ----- resources -----
var manager_js_2 = require("./resources/manager.js");
Object.defineProperty(exports, "ResourceManager", { enumerable: true, get: function () { return manager_js_2.ResourceManager; } });
// ----- workflow -----
var engine_js_1 = require("./workflow/engine.js");
Object.defineProperty(exports, "WorkflowEngine", { enumerable: true, get: function () { return engine_js_1.WorkflowEngine; } });
// ----- retry -----
var retry_js_1 = require("./retry/retry.js");
Object.defineProperty(exports, "withRetry", { enumerable: true, get: function () { return retry_js_1.withRetry; } });
Object.defineProperty(exports, "backoffDelay", { enumerable: true, get: function () { return retry_js_1.backoffDelay; } });
Object.defineProperty(exports, "isRetryable", { enumerable: true, get: function () { return retry_js_1.isRetryable; } });
Object.defineProperty(exports, "DEFAULT_RETRY_POLICY", { enumerable: true, get: function () { return retry_js_1.DEFAULT_RETRY_POLICY; } });
// ----- coordination -----
var coordinator_js_1 = require("./coordinate/coordinator.js");
Object.defineProperty(exports, "Coordinator", { enumerable: true, get: function () { return coordinator_js_1.Coordinator; } });
// ----- main facade -----
var cortex_js_1 = require("./cortex.js");
Object.defineProperty(exports, "Cortex", { enumerable: true, get: function () { return cortex_js_1.Cortex; } });
// ----- tool-grade facade (composition surface for reflection/agents) -----
var facade_js_1 = require("./facade.js");
Object.defineProperty(exports, "cortex", { enumerable: true, get: function () { return facade_js_1.cortex; } });
Object.defineProperty(exports, "createCortex", { enumerable: true, get: function () { return facade_js_1.createCortex; } });
Object.defineProperty(exports, "classifyIntent", { enumerable: true, get: function () { return facade_js_1.classifyIntent; } });
Object.defineProperty(exports, "authorize", { enumerable: true, get: function () { return facade_js_1.authorize; } });
Object.defineProperty(exports, "resolveCapability", { enumerable: true, get: function () { return facade_js_1.resolveCapability; } });
Object.defineProperty(exports, "plan", { enumerable: true, get: function () { return facade_js_1.plan; } });
Object.defineProperty(exports, "dispatchPlan", { enumerable: true, get: function () { return facade_js_1.dispatchPlan; } });
Object.defineProperty(exports, "verifyDecisionTrail", { enumerable: true, get: function () { return facade_js_1.verifyDecisionTrail; } });
//# sourceMappingURL=index.js.map