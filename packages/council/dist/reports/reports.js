"use strict";
/**
 * @manya-os/council — review reports.
 *
 * The reports module aggregates everything the council produced for a single
 * problem — analyses, conflicts, debates, minority opinions, the consensus
 * (if any), and recommendations — into a single {@link ReviewReport}. The
 * report can be serialized to JSON (`serializeReport`) or summarized into a
 * single human-readable paragraph (`summarizeReport`).
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildReport = buildReport;
exports.serializeReport = serializeReport;
exports.summarizeReport = summarizeReport;
const errors_js_1 = require("../errors.js");
/**
 * Builds a {@link ReviewReport} from the given inputs. Defensively copies all
 * array inputs and computes a short summary.
 *
 * Throws `CouncilError` when `problemId` is missing or `analyses` is not an
 * array.
 */
function buildReport(input) {
    if (!input || typeof input !== 'object') {
        throw new errors_js_1.CouncilError('input must be an object');
    }
    if (typeof input.problemId !== 'string' || input.problemId.length === 0) {
        throw new errors_js_1.CouncilError('input.problemId must be a non-empty string');
    }
    if (!Array.isArray(input.analyses)) {
        throw new errors_js_1.CouncilError('input.analyses must be an array');
    }
    const conflicts = Array.isArray(input.conflicts) ? input.conflicts : [];
    const debates = Array.isArray(input.debates) ? input.debates : [];
    const minorityOpinions = Array.isArray(input.minorityOpinions)
        ? input.minorityOpinions : [];
    const recommendations = Array.isArray(input.recommendations)
        ? input.recommendations : [];
    const consensus = input.consensus === undefined ? null : input.consensus;
    const generatedAt = input.generatedAt ?? new Date().toISOString();
    const id = input.reportId ?? `report-${input.problemId}-${generatedAt}`;
    const summary = summarize(input.problemId, input.analyses.length, conflicts.length, consensus);
    return {
        id,
        problemId: input.problemId,
        generatedAt,
        summary,
        analyses: [...input.analyses],
        conflicts: [...conflicts],
        debates: [...debates],
        minorityOpinions: [...minorityOpinions],
        consensus,
        recommendations: [...recommendations],
    };
}
/**
 * Serializes a {@link ReviewReport} to a pretty-printed JSON string. Throws
 * `CouncilError` when serialization fails (e.g. circular references).
 */
function serializeReport(report) {
    if (!report || typeof report !== 'object') {
        throw new errors_js_1.CouncilError('report must be an object');
    }
    try {
        return JSON.stringify(report, null, 2);
    }
    catch (err) {
        throw new errors_js_1.CouncilError(`failed to serialize report: ${err.message}`);
    }
}
/**
 * Summarizes a {@link ReviewReport} into a single human-readable paragraph.
 */
function summarizeReport(report) {
    if (!report || typeof report !== 'object') {
        throw new errors_js_1.CouncilError('report must be an object');
    }
    const lines = [];
    lines.push(`Report ${report.id} for problem ${report.problemId} generated at ${report.generatedAt}.`);
    lines.push(`${report.analyses.length} analyses; ${report.conflicts.length} conflicts; ` +
        `${report.debates.length} debates; ${report.minorityOpinions.length} minority opinions.`);
    lines.push(report.summary);
    if (report.consensus) {
        const pct = (report.consensus.confidence * 100).toFixed(1);
        lines.push(`Decision: ${report.consensus.decision} (confidence ${pct}%).`);
    }
    else {
        lines.push('No consensus was reached.');
    }
    if (report.recommendations.length > 0) {
        lines.push(`Recommendations: ${report.recommendations.join('; ')}.`);
    }
    return lines.join(' ');
}
/** Internal: builds the short `summary` field for a report. */
function summarize(problemId, analysisCount, conflictCount, consensus) {
    const parts = [];
    parts.push(`Problem ${problemId} received ${analysisCount} ` +
        `analysis${analysisCount === 1 ? '' : 'ies'}.`);
    if (conflictCount > 0) {
        parts.push(`${conflictCount} conflict${conflictCount === 1 ? '' : 's'} detected.`);
    }
    else {
        parts.push('No conflicts detected.');
    }
    if (consensus) {
        const pct = (consensus.confidence * 100).toFixed(1);
        parts.push(`Consensus reached at confidence ${pct}%.`);
    }
    else {
        parts.push('No consensus reached.');
    }
    return parts.join(' ');
}
//# sourceMappingURL=reports.js.map