"use strict";
/**
 * @manya-os/anonymize — validation reports.
 *
 * After anonymization, the validator re-scans the output to detect
 * residual PII/PHI and produces a structured report.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Validator = void 0;
exports.hashConfig = hashConfig;
const crypto_1 = require("crypto");
const errors_js_1 = require("../errors.js");
class Validator {
    registry;
    constructor(registry) {
        this.registry = registry;
    }
    /**
     * Validate an anonymized output by re-scanning it.
     * Returns a report; does not throw unless validation cannot run.
     */
    validate(output, originalFindings, pipelineConfigHash, opts = {}) {
        const entries = [];
        // Re-scan output — should find nothing.
        const residual = this.registry.runAll(output, {}, 0.5);
        const residualCounts = {};
        for (const f of residual) {
            residualCounts[f.category] = (residualCounts[f.category] ?? 0) + 1;
            entries.push({
                level: f.severity === 'critical' ? 'error' : f.severity === 'high' ? 'error' : 'warning',
                code: `RESIDUAL_${f.category.toUpperCase()}`,
                message: `Residual ${f.category} found in output: '${f.text.slice(0, 40)}'`,
            });
        }
        // Sanity check: original findings count.
        if (originalFindings.length === 0) {
            entries.push({ level: 'info', code: 'NO_FINDINGS', message: 'No PII/PHI detected in input.' });
        }
        // Residual risk — weighted sum.
        let risk = 0;
        for (const f of residual) {
            const w = f.severity === 'critical' ? 1.0 : f.severity === 'high' ? 0.5 : f.severity === 'medium' ? 0.2 : 0.05;
            risk += w * f.confidence;
        }
        risk = Math.min(1, risk);
        let passed = residual.length === 0;
        if (opts.failOnHighOrCritical) {
            passed = passed && !residual.some(f => f.severity === 'critical' || f.severity === 'high');
        }
        if (opts.maxResidualRisk !== undefined && risk > opts.maxResidualRisk) {
            passed = false;
            entries.push({
                level: 'error',
                code: 'RESIDUAL_RISK_TOO_HIGH',
                message: `Residual risk ${risk.toFixed(3)} exceeds threshold ${opts.maxResidualRisk}`,
            });
        }
        return {
            passed,
            entries,
            residualRisk: risk,
            residualCounts,
            configHash: pipelineConfigHash,
        };
    }
    /** Throws if validation fails. */
    assertValid(report) {
        if (!report.passed) {
            throw new errors_js_1.ValidationError(`Anonymization validation failed (residualRisk=${report.residualRisk.toFixed(3)}, ${report.entries.length} entries)`);
        }
    }
}
exports.Validator = Validator;
/** Compute a stable hash of a pipeline config object (for reproducibility). */
function hashConfig(config) {
    const canon = JSON.stringify(config, Object.keys(config ?? {}).sort());
    return (0, crypto_1.createHash)('sha256').update(canon).digest('hex');
}
//# sourceMappingURL=validator.js.map