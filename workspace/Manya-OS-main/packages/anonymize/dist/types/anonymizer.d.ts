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
import type { AnonymizationResult, ValidationReport, RedactionStrategy } from './types.js';
import { DetectorRegistry } from './detectors/registry.js';
import type { Redactor } from './redactors/strategies.js';
import type { DatasetManifest } from './types.js';
import { DEFAULT_CONFIG } from './config/config.js';
import type { AnonymizerConfig } from './config/config.js';
/** Build the default registry. */
export declare function defaultRegistry(): DetectorRegistry;
/** Construct a redactor by strategy. */
export declare function redactorForStrategy(strategy: RedactionStrategy): Redactor;
export declare class Anonymizer {
    private readonly registry;
    private readonly validator;
    private readonly config;
    private readonly logger;
    constructor(config?: AnonymizerConfig, registry?: DetectorRegistry);
    /** Run the full anonymization pipeline. */
    anonymize(input: string): {
        result: AnonymizationResult;
        report: ValidationReport;
    };
    /** Anonymize a batch of records and produce a manifest. */
    anonymizeBatch(records: string[], name: string): {
        results: AnonymizationResult[];
        report: ValidationReport;
        manifest: DatasetManifest;
    };
}
/** Convenience: anonymize a single input with default config. */
export declare function anonymize(input: string, config?: AnonymizerConfig): {
    result: AnonymizationResult;
    report: ValidationReport;
};
/** Re-export DEFAULT_CONFIG for callers who want to inspect/modify defaults. */
export { DEFAULT_CONFIG };
//# sourceMappingURL=anonymizer.d.ts.map