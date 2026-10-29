/**
 * @manya/council — multi-agent consensus engine for the MANYA Intelligence OS.
 *
 * Public API surface for @manya/council. Everything exported here is part of
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
export * from './types.js';
export * from './errors.js';
export { Logger, LogLevel, ConsoleLogger, SilentLogger, scrubMetadata, shouldScrubField, SCRUBBED_FIELD_NAMES, } from './logging.js';
export { validateSpecialist, matchScore, route, routeAll, SpecialistRegistry, } from './router/router.js';
export type { SpecialistMatch } from './router/router.js';
export { validateAnalysis, AnalysisCollector } from './analysis/analysis.js';
export { scoreAnalysis, aggregateScores, detectOutliers, DEFAULT_OUTLIER_THRESHOLD, } from './scoring/scoring.js';
export type { WeightedScore, AggregatedScore } from './scoring/scoring.js';
export { ConflictDetector, severityFor, CONFLICT_TYPES, CONFLICT_SEVERITIES, OPPOSING_CONFIDENCE_THRESHOLD, FACTUAL_OVERLAP_THRESHOLD, DIVERGENT_REASONING_MAX_OVERLAP, DIVERGENT_CONTENT_MIN_OVERLAP, SEVERITY_HIGH_GAP, SEVERITY_MEDIUM_GAP, } from './conflict/conflict.js';
export { DebateFacilitator, validateRound, DEFAULT_MAX_DEBATE_ROUNDS } from './debate/debate.js';
export { validateMinorityOpinion, MinorityOpinionTracker } from './minority/minority.js';
export { ConsensusBuilder, DEFAULT_CONSENSUS_THRESHOLD } from './consensus/consensus.js';
export type { ConsensusBuildOptions } from './consensus/consensus.js';
export { buildReport, serializeReport, summarizeReport } from './reports/reports.js';
export type { BuildReportInput } from './reports/reports.js';
export { synthesize, classifyConsensus, DEFAULT_SYNTHESIS_THRESHOLD, STRONG_CONSENSUS_RATIO, } from './synthesizer/synthesizer.js';
export type { SynthesizeOptions } from './synthesizer/synthesizer.js';
//# sourceMappingURL=index.d.ts.map