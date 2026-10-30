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

import type {
  Finding, Redaction, AnonymizationResult, ValidationReport, RedactionStrategy,
} from './types.js';
import { DetectorRegistry, resolveOverlaps } from './detectors/registry.js';
import { ALL_PATTERN_DETECTORS } from './detectors/patterns.js';
import { ALL_CONTEXT_DETECTORS } from './detectors/context.js';
import {
  MaskRedactor, HashRedactor, TokenRedactor, FullRedactor,
  GeneralizeRedactor, SynthesizeRedactor, applyRedactions,
} from './redactors/strategies.js';
import type { Redactor } from './redactors/strategies.js';
import { Validator, hashConfig } from './validation/validator.js';
import { buildManifest } from './publishing/manifest.js';
import type { DatasetManifest } from './types.js';
import { DEFAULT_CONFIG, mergeConfig } from './config/config.js';
import type { AnonymizerConfig } from './config/config.js';
import { ConsoleLogger, SilentLogger } from './logging.js';
import type { Logger } from './logging.js';
import { AnonymizeError } from './errors.js';

/** Build the default registry. */
export function defaultRegistry(): DetectorRegistry {
  const reg = new DetectorRegistry();
  for (const d of [...ALL_PATTERN_DETECTORS, ...ALL_CONTEXT_DETECTORS]) reg.register(d);
  return reg;
}

/** Construct a redactor by strategy. */
export function redactorForStrategy(strategy: RedactionStrategy): Redactor {
  switch (strategy) {
    case 'mask': return new MaskRedactor();
    case 'hash': return new HashRedactor();
    case 'token': return new TokenRedactor();
    case 'redact': return new FullRedactor();
    case 'generalize': return new GeneralizeRedactor();
    case 'synthesize': return new SynthesizeRedactor();
    default: throw new AnonymizeError(`Unknown strategy: ${strategy as string}`);
  }
}

export class Anonymizer {
  private readonly registry: DetectorRegistry;
  private readonly validator: Validator;
  private readonly config: Required<Omit<AnonymizerConfig, 'logger'>> & { logger?: Logger };
  private readonly logger: Logger;

  constructor(config?: AnonymizerConfig, registry?: DetectorRegistry) {
    this.config = mergeConfig(config);
    this.logger = this.config.logger ?? (
      this.config.logLevel === 'silent' ? new SilentLogger() : new ConsoleLogger(this.config.logLevel)
    );
    this.registry = registry ?? defaultRegistry();
    // Apply disabled-detector list.
    for (const name of this.config.disabledDetectors) {
      const d = this.registry.get(name);
      if (d) (d as { defaultConfig: { enabled?: boolean } }).defaultConfig.enabled = false;
    }
    this.validator = new Validator(this.registry);
  }

  /** Run the full anonymization pipeline. */
  anonymize(input: string): { result: AnonymizationResult; report: ValidationReport } {
    if (typeof input !== 'string') throw new AnonymizeError('anonymize: input must be string');
    const start = Date.now();
    this.logger.debug('anonymize: starting', { inputLength: input.length });

    // 1. Detect
    const rawFindings = this.registry.runAll(input, {}, this.config.minConfidence);
    const findings: Finding[] = resolveOverlaps(rawFindings);
    this.logger.debug('anonymize: detected', { findingCount: findings.length });

    // 2. Redact
    const redactorFor = (f: Finding) => {
      const strat = this.config.strategyByCategory[f.category] ?? this.config.defaultStrategy;
      return redactorForStrategy(strat);
    };
    const { output, redactions } = applyRedactions(input, findings, redactorFor);

    // 3. Counts
    const counts: Record<string, number> = {};
    for (const f of findings) counts[f.category] = (counts[f.category] ?? 0) + 1;

    const elapsedMs = Date.now() - start;

    const result: AnonymizationResult = {
      output,
      findings,
      redactions,
      safe: false, // set after validation
      counts,
      elapsedMs,
    };

    // 4. Validate
    let report: ValidationReport;
    if (this.config.validateOutput) {
      const configHash = hashConfig({
        minConfidence: this.config.minConfidence,
        defaultStrategy: this.config.defaultStrategy,
        strategyByCategory: this.config.strategyByCategory,
        disabledDetectors: this.config.disabledDetectors,
      });
      report = this.validator.validate(output, findings, configHash, {
        maxResidualRisk: this.config.maxResidualRisk,
        failOnHighOrCritical: true,
      });
    } else {
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
  anonymizeBatch(records: string[], name: string): {
    results: AnonymizationResult[];
    report: ValidationReport;
    manifest: DatasetManifest;
  } {
    const results = records.map(r => this.anonymize(r).result);
    // Aggregate validation: combine residual counts.
    const residualCounts: Record<string, number> = {};
    let maxRisk = 0;
    for (const r of results) {
      // Re-validate (cheap) to get residual counts
      const rep = this.validator.validate(r.output, r.findings, 'batch', { failOnHighOrCritical: true });
      for (const [k, v] of Object.entries(rep.residualCounts)) residualCounts[k] = (residualCounts[k] ?? 0) + v;
      maxRisk = Math.max(maxRisk, rep.residualRisk);
    }
    const report: ValidationReport = {
      passed: Object.keys(residualCounts).length === 0,
      entries: [],
      residualRisk: maxRisk,
      residualCounts,
      configHash: hashConfig({ name, count: records.length }),
    };
    const manifest = buildManifest(
      name,
      results.map(r => r.output),
      report.configHash,
      report,
    );
    return { results, report, manifest };
  }
}

/** Convenience: anonymize a single input with default config. */
export function anonymize(input: string, config?: AnonymizerConfig): { result: AnonymizationResult; report: ValidationReport } {
  return new Anonymizer(config).anonymize(input);
}

/** Re-export DEFAULT_CONFIG for callers who want to inspect/modify defaults. */
export { DEFAULT_CONFIG };
