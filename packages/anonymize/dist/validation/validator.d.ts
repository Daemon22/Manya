/**
 * @manya-os/anonymize — validation reports.
 *
 * After anonymization, the validator re-scans the output to detect
 * residual PII/PHI and produces a structured report.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
import type { Finding, ValidationReport } from '../types.js';
import type { DetectorRegistry } from '../detectors/registry.js';
export interface ValidatorOptions {
    /** Maximum acceptable residual risk. */
    maxResidualRisk?: number;
    /** If true, any residual finding at severity 'high' or 'critical' fails validation. */
    failOnHighOrCritical?: boolean;
}
export declare class Validator {
    private readonly registry;
    constructor(registry: DetectorRegistry);
    /**
     * Validate an anonymized output by re-scanning it.
     * Returns a report; does not throw unless validation cannot run.
     */
    validate(output: string, originalFindings: Finding[], pipelineConfigHash: string, opts?: ValidatorOptions): ValidationReport;
    /** Throws if validation fails. */
    assertValid(report: ValidationReport): void;
}
/** Compute a stable hash of a pipeline config object (for reproducibility). */
export declare function hashConfig(config: unknown): string;
//# sourceMappingURL=validator.d.ts.map