"use strict";
/**
 * @manya-os/council — multi-agent consensus engine for the MANYA Intelligence OS.
 *
 * Public API surface for @manya-os/council. Everything exported here is part of
 * the stable, semver-bound public API.
 *
 * Capabilities:
 *   - Specialist routing (`SpecialistRegistry`, `route`, `routeAll`).
 *   - Independent analysis collection (`AnalysisCollector`).
 *   - Weighted confidence scoring (`scoreAnalysis`, `aggregateScores`,
 *     `detectOutliers`).
 *   - Conflict detection (`ConflictDetector`).
 *   - Structured debate (`DebateFacilitator`).
 *   - Minority opinion tracking (`MinorityOpinionTracker`).
 *   - Consensus building (`ConsensusBuilder`).
 *   - Review reports (`buildReport`, `serializeReport`, `summarizeReport`).
 *   - Decision synthesis (`synthesize`, `classifyConsensus`).
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
exports.STRONG_CONSENSUS_RATIO = exports.DEFAULT_SYNTHESIS_THRESHOLD = exports.classifyConsensus = exports.synthesize = exports.summarizeReport = exports.serializeReport = exports.buildReport = exports.DEFAULT_CONSENSUS_THRESHOLD = exports.ConsensusBuilder = exports.MinorityOpinionTracker = exports.validateMinorityOpinion = exports.DEFAULT_MAX_DEBATE_ROUNDS = exports.validateRound = exports.DebateFacilitator = exports.SEVERITY_MEDIUM_GAP = exports.SEVERITY_HIGH_GAP = exports.DIVERGENT_CONTENT_MIN_OVERLAP = exports.DIVERGENT_REASONING_MAX_OVERLAP = exports.FACTUAL_OVERLAP_THRESHOLD = exports.OPPOSING_CONFIDENCE_THRESHOLD = exports.CONFLICT_SEVERITIES = exports.CONFLICT_TYPES = exports.severityFor = exports.ConflictDetector = exports.DEFAULT_OUTLIER_THRESHOLD = exports.detectOutliers = exports.aggregateScores = exports.scoreAnalysis = exports.AnalysisCollector = exports.validateAnalysis = exports.SpecialistRegistry = exports.routeAll = exports.route = exports.matchScore = exports.validateSpecialist = exports.SCRUBBED_FIELD_NAMES = exports.shouldScrubField = exports.scrubMetadata = exports.SilentLogger = exports.ConsoleLogger = void 0;
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
// ----- router -----
var router_js_1 = require("./router/router.js");
Object.defineProperty(exports, "validateSpecialist", { enumerable: true, get: function () { return router_js_1.validateSpecialist; } });
Object.defineProperty(exports, "matchScore", { enumerable: true, get: function () { return router_js_1.matchScore; } });
Object.defineProperty(exports, "route", { enumerable: true, get: function () { return router_js_1.route; } });
Object.defineProperty(exports, "routeAll", { enumerable: true, get: function () { return router_js_1.routeAll; } });
Object.defineProperty(exports, "SpecialistRegistry", { enumerable: true, get: function () { return router_js_1.SpecialistRegistry; } });
// ----- analysis -----
var analysis_js_1 = require("./analysis/analysis.js");
Object.defineProperty(exports, "validateAnalysis", { enumerable: true, get: function () { return analysis_js_1.validateAnalysis; } });
Object.defineProperty(exports, "AnalysisCollector", { enumerable: true, get: function () { return analysis_js_1.AnalysisCollector; } });
// ----- scoring -----
var scoring_js_1 = require("./scoring/scoring.js");
Object.defineProperty(exports, "scoreAnalysis", { enumerable: true, get: function () { return scoring_js_1.scoreAnalysis; } });
Object.defineProperty(exports, "aggregateScores", { enumerable: true, get: function () { return scoring_js_1.aggregateScores; } });
Object.defineProperty(exports, "detectOutliers", { enumerable: true, get: function () { return scoring_js_1.detectOutliers; } });
Object.defineProperty(exports, "DEFAULT_OUTLIER_THRESHOLD", { enumerable: true, get: function () { return scoring_js_1.DEFAULT_OUTLIER_THRESHOLD; } });
// ----- conflict -----
var conflict_js_1 = require("./conflict/conflict.js");
Object.defineProperty(exports, "ConflictDetector", { enumerable: true, get: function () { return conflict_js_1.ConflictDetector; } });
Object.defineProperty(exports, "severityFor", { enumerable: true, get: function () { return conflict_js_1.severityFor; } });
Object.defineProperty(exports, "CONFLICT_TYPES", { enumerable: true, get: function () { return conflict_js_1.CONFLICT_TYPES; } });
Object.defineProperty(exports, "CONFLICT_SEVERITIES", { enumerable: true, get: function () { return conflict_js_1.CONFLICT_SEVERITIES; } });
Object.defineProperty(exports, "OPPOSING_CONFIDENCE_THRESHOLD", { enumerable: true, get: function () { return conflict_js_1.OPPOSING_CONFIDENCE_THRESHOLD; } });
Object.defineProperty(exports, "FACTUAL_OVERLAP_THRESHOLD", { enumerable: true, get: function () { return conflict_js_1.FACTUAL_OVERLAP_THRESHOLD; } });
Object.defineProperty(exports, "DIVERGENT_REASONING_MAX_OVERLAP", { enumerable: true, get: function () { return conflict_js_1.DIVERGENT_REASONING_MAX_OVERLAP; } });
Object.defineProperty(exports, "DIVERGENT_CONTENT_MIN_OVERLAP", { enumerable: true, get: function () { return conflict_js_1.DIVERGENT_CONTENT_MIN_OVERLAP; } });
Object.defineProperty(exports, "SEVERITY_HIGH_GAP", { enumerable: true, get: function () { return conflict_js_1.SEVERITY_HIGH_GAP; } });
Object.defineProperty(exports, "SEVERITY_MEDIUM_GAP", { enumerable: true, get: function () { return conflict_js_1.SEVERITY_MEDIUM_GAP; } });
// ----- debate -----
var debate_js_1 = require("./debate/debate.js");
Object.defineProperty(exports, "DebateFacilitator", { enumerable: true, get: function () { return debate_js_1.DebateFacilitator; } });
Object.defineProperty(exports, "validateRound", { enumerable: true, get: function () { return debate_js_1.validateRound; } });
Object.defineProperty(exports, "DEFAULT_MAX_DEBATE_ROUNDS", { enumerable: true, get: function () { return debate_js_1.DEFAULT_MAX_DEBATE_ROUNDS; } });
// ----- minority -----
var minority_js_1 = require("./minority/minority.js");
Object.defineProperty(exports, "validateMinorityOpinion", { enumerable: true, get: function () { return minority_js_1.validateMinorityOpinion; } });
Object.defineProperty(exports, "MinorityOpinionTracker", { enumerable: true, get: function () { return minority_js_1.MinorityOpinionTracker; } });
// ----- consensus -----
var consensus_js_1 = require("./consensus/consensus.js");
Object.defineProperty(exports, "ConsensusBuilder", { enumerable: true, get: function () { return consensus_js_1.ConsensusBuilder; } });
Object.defineProperty(exports, "DEFAULT_CONSENSUS_THRESHOLD", { enumerable: true, get: function () { return consensus_js_1.DEFAULT_CONSENSUS_THRESHOLD; } });
// ----- reports -----
var reports_js_1 = require("./reports/reports.js");
Object.defineProperty(exports, "buildReport", { enumerable: true, get: function () { return reports_js_1.buildReport; } });
Object.defineProperty(exports, "serializeReport", { enumerable: true, get: function () { return reports_js_1.serializeReport; } });
Object.defineProperty(exports, "summarizeReport", { enumerable: true, get: function () { return reports_js_1.summarizeReport; } });
// ----- synthesizer -----
var synthesizer_js_1 = require("./synthesizer/synthesizer.js");
Object.defineProperty(exports, "synthesize", { enumerable: true, get: function () { return synthesizer_js_1.synthesize; } });
Object.defineProperty(exports, "classifyConsensus", { enumerable: true, get: function () { return synthesizer_js_1.classifyConsensus; } });
Object.defineProperty(exports, "DEFAULT_SYNTHESIS_THRESHOLD", { enumerable: true, get: function () { return synthesizer_js_1.DEFAULT_SYNTHESIS_THRESHOLD; } });
Object.defineProperty(exports, "STRONG_CONSENSUS_RATIO", { enumerable: true, get: function () { return synthesizer_js_1.STRONG_CONSENSUS_RATIO; } });
//# sourceMappingURL=index.js.map