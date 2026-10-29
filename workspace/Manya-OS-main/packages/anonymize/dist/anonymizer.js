"use strict";
/**
 * @manya-os/anonymize — the main pipeline orchestrator.
 *
 * Wires together detectors, redactors, and the validator. Provides a single
 * `anonymize(input)` method that returns a complete {@link AnonymizationResult}
 * and a validation {@link ValidationReport}.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_CONFIG = exports.Anonymizer = void 0;
exports.defaultRegistry = defaultRegistry;
exports.redactorForStrategy = redactorForStrategy;
exports.anonymize = anonymize;
const registry_js_1 = require("./detectors/registry.js");
const patterns_js_1 = require("./detectors/patterns.js");
const context_js_1 = require("./detectors/context.js");
const strategies_js_1 = require("./redactors/strategies.js");
const validator_js_1 = require("./validation/validator.js");
const manifest_js_1 = require("./publishing/manifest.js");
const config_js_1 = require("./config/config.js");
Object.defineProperty(exports, "DEFAULT_CONFIG", { enumerable: true, get: function () { return config_js_1.DEFAULT_CONFIG; } });
const logging_js_1 = require("./logging.js");
const errors_js_1 = require("./errors.js");
/** Build the default registry. */
function defaultRegistry() {
    const reg = new registry_js_1.DetectorRegistry();
    for (const d of [...patterns_js_1.ALL_PATTERN_DETECTORS, ...context_js_1.ALL_CONTEXT_DETECTORS])
        reg.register(d);
    return reg;
}
/** Construct a redactor by strategy. */
function redactorForStrategy(strategy) {
    switch (strategy) {
        case 'mask': return new strategies_js_1.MaskRedactor();
        case 'hash': return new strategies_js_1.HashRedactor();
        case 'token': return new strategies_js_1.TokenRedactor();
        case 'redact': return new strategies_js_1.FullRedactor();
        case 'generalize': return new strategies_js_1.GeneralizeRedactor();
        case 'synthesize': return new strategies_js_1.SynthesizeRedactor();
        default: throw new errors_js_1.AnonymizeError(`Unknown strategy: ${strategy}`);
    }
}
class Anonymizer {
    registry;
    validator;
    config;
    logger;
    constructor(config, registry) {
        this.config = (0, config_js_1.mergeConfig)(config);
        this.logger = this.config.logger ?? (this.config.logLevel === 'silent' ? new logging_js_1.SilentLogger() : new logging_js_1.ConsoleLogger(this.config.logLevel));
        this.registry = registry ?? defaultRegistry();
        // Apply disabled-detector list.
        for (const name of this.config.disabledDetectors) {
            const d = this.registry.get(name);
            if (d)
                d.defaultConfig.enabled = false;
        }
        this.validator = new validator_js_1.Validator(this.registry);
    }
    /** Run the full anonymization pipeline. */
    anonymize(input) {
        if (typeof input !== 'string')
            throw new errors_js_1.AnonymizeError('anonymize: input must be string');
        const start = Date.now();
        this.logger.debug('anonymize: starting', { inputLength: input.length });
        // 1. Detect
        const rawFindings = this.registry.runAll(input, {}, this.config.minConfidence);
        const findings = (0, registry_js_1.resolveOverlaps)(rawFindings);
        this.logger.debug('anonymize: detected', { findingCount: findings.length });
        // 2. Redact
        const redactorFor = (f) => {
            const strat = this.config.strategyByCategory[f.category] ?? this.config.defaultStrategy;
            return redactorForStrategy(strat);
        };
        const { output, redactions } = (0, strategies_js_1.applyRedactions)(input, findings, redactorFor);
        // 3. Counts
        const counts = {};
        for (const f of findings)
            counts[f.category] = (counts[f.category] ?? 0) + 1;
        const elapsedMs = Date.now() - start;
        const result = {
            output,
            findings,
            redactions,
            safe: false, // set after validation
            counts,
            elapsedMs,
        };
        // 4. Validate
        let report;
        if (this.config.validateOutput) {
            const configHash = (0, validator_js_1.hashConfig)({
                minConfidence: this.config.minConfidence,
                defaultStrategy: this.config.defaultStrategy,
                strategyByCategory: this.config.strategyByCategory,
                disabledDetectors: this.config.disabledDetectors,
            });
            report = this.validator.validate(output, findings, configHash, {
                maxResidualRisk: this.config.maxResidualRisk,
                failOnHighOrCritical: true,
            });
        }
        else {
            report = {
                passed: true,
                entries: [],
                residualRisk: 0,
                residualCounts: {},
                configHash: 'validation-disabled',
            };
        }
        result.safe = report.passed;
        this.logger.info('anonymize: complete', {
            findings: findings.length,
            residualRisk: report.residualRisk,
            safe: result.safe,
            elapsedMs,
        });
        return { result, report };
    }
    /** Anonymize a batch of records and produce a manifest. */
    anonymizeBatch(records, name) {
        const results = records.map(r => this.anonymize(r).result);
        // Aggregate validation: combine residual counts.
        const residualCounts = {};
        let maxRisk = 0;
        for (const r of results) {
            // Re-validate (cheap) to get residual counts
            const rep = this.validator.validate(r.output, r.findings, 'batch', { failOnHighOrCritical: true });
            for (const [k, v] of Object.entries(rep.residualCounts))
                residualCounts[k] = (residualCounts[k] ?? 0) + v;
            maxRisk = Math.max(maxRisk, rep.residualRisk);
        }
        const report = {
            passed: Object.keys(residualCounts).length === 0,
            entries: [],
            residualRisk: maxRisk,
            residualCounts,
            configHash: (0, validator_js_1.hashConfig)({ name, count: records.length }),
        };
        const manifest = (0, manifest_js_1.buildManifest)(name, results.map(r => r.output), report.configHash, report);
        return { results, report, manifest };
    }
}
exports.Anonymizer = Anonymizer;
/** Convenience: anonymize a single input with default config. */
function anonymize(input, config) {
    return new Anonymizer(config).anonymize(input);
}
//# sourceMappingURL=anonymizer.js.map