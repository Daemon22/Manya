/**
 * @manya/customs-shield — main orchestrator.
 *
 * Wires together HS-code validation, sanctions screening, compliance
 * rules, trade restrictions, risk scoring, and regulatory reporting.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import type { Shipment, ShieldFinding, ShieldReport, Severity } from './types.js';
import { validate as validateHsCode } from './hscode/catalog.js';
import { screenParties } from './sanctions/screener.js';
import {
  checkEmbargoes, checkLicenses, checkRestrictedOrigins, calculateDuty,
} from './compliance/rules.js';
import { checkShipment as checkRestrictions } from './restrictions/rules.js';
import { detectIndicators, scoreFrom, analyzeVulnerabilities } from './risk/scoring.js';
import { DEFAULT_CONFIG, mergeConfig } from './config/config.js';
import type { ShieldConfig } from './config/config.js';
import { ConsoleLogger, SilentLogger } from './logging.js';
import type { Logger } from './logging.js';
import { CustomsShieldError } from './errors.js';

export class CustomsShield {
  private readonly config: Required<Omit<ShieldConfig, 'logger'>> & { logger?: Logger };
  private readonly logger: Logger;

  constructor(config?: ShieldConfig) {
    this.config = mergeConfig(config);
    this.logger = this.config.logger ?? (
      this.config.logLevel === 'silent' ? new SilentLogger() : new ConsoleLogger(this.config.logLevel)
    );
  }

  /** Screen a shipment end-to-end. */
  screen(shipment: Shipment): ShieldReport {
    if (!shipment) throw new CustomsShieldError('Shipment is required');
    if (!shipment.id) throw new CustomsShieldError('Shipment ID is required');
    if (!Array.isArray(shipment.items)) throw new CustomsShieldError('Shipment items must be array');
    const start = Date.now();
    this.logger.debug('screen: starting', { shipmentId: shipment.id, itemCount: shipment.items.length });

    const findings: ShieldFinding[] = [];

    // 1. HS code validation per item.
    for (const item of shipment.items) {
      const v = validateHsCode(item.hsCode);
      if (!v.valid) {
        findings.push({
          category: 'hs_code_invalid',
          severity: 'high',
          message: `Invalid HS code '${item.hsCode}' on item '${item.description.slice(0, 40)}': ${v.reason}`,
          ref: item.hsCode,
          remediation: 'Provide a valid 6-to-10-digit HS code.',
          confidence: 0.95,
        });
      } else if (v.partial) {
        findings.push({
          category: 'hs_code_suggestion',
          severity: 'low',
          message: `HS code '${item.hsCode}' resolved only to chapter level — refine to 6+ digits`,
          ref: item.hsCode,
          remediation: 'Use a more specific HS code.',
          confidence: 0.7,
        });
      }
    }

    // 2. Sanctions screening — both parties + transshipment countries.
    const parties = [shipment.shipper, shipment.consignee];
    findings.push(...screenParties(parties, this.config.sanctionsThreshold));
    if (shipment.transshipmentCountries) {
      for (const tc of shipment.transshipmentCountries) {
        findings.push(...screenParties([{ name: tc, country: tc }], this.config.sanctionsThreshold));
      }
    }

    // 3. Embargoes.
    findings.push(...checkEmbargoes(shipment));

    // 4. Licenses.
    findings.push(...checkLicenses(shipment));

    // 5. Restricted origins.
    findings.push(...checkRestrictedOrigins(shipment));

    // 6. Product restrictions.
    findings.push(...checkRestrictions(shipment));

    // 7. Risk indicators + vulnerabilities.
    findings.push(...detectIndicators(shipment));
    findings.push(...analyzeVulnerabilities(shipment));

    // 8. Score.
    const { score, band, holdForReview } = scoreFrom(findings);
    const hold = holdForReview || score >= this.config.holdThreshold;

    // 9. Duty computation.
    let duty: ShieldReport['duty'];
    if (this.config.computeDuty) {
      const d = calculateDuty(shipment);
      duty = { declared: d.declared, expected: d.expected, delta: d.delta };
      if (Math.abs(d.delta) > 1 && d.expected > 0) {
        findings.push({
          category: 'duty_miscalculation',
          severity: Math.abs(d.delta) / d.expected > 0.1 ? 'high' : 'medium',
          message: `Duty mismatch: declared ${d.declared.toFixed(2)}, expected ${d.expected.toFixed(2)} (delta ${d.delta.toFixed(2)})`,
          ref: shipment.id,
          remediation: 'Reconcile declared duty with calculated duty.',
          confidence: 0.9,
        });
        // Re-score after duty finding.
        const reScore = scoreFrom(findings);
        return this.buildReport(shipment.id, findings, reScore.score, reScore.band, hold || reScore.holdForReview, duty, start);
      }
    }

    return this.buildReport(shipment.id, findings, score, band, hold, duty, start);
  }

  private buildReport(
    shipmentId: string,
    findings: ShieldFinding[],
    score: number,
    band: ShieldReport['riskBand'],
    holdForReview: boolean,
    duty: ShieldReport['duty'],
    start: number,
  ): ShieldReport {
    const counts: Record<string, number> = {};
    for (const f of findings) counts[f.category] = (counts[f.category] ?? 0) + 1;
    const elapsedMs = Date.now() - start;
    const report: ShieldReport = {
      shipmentId,
      riskScore: Math.round(score * 10) / 10,
      riskBand: band,
      holdForReview,
      findings,
      counts,
      duty,
      generatedAt: new Date().toISOString(),
      elapsedMs,
    };
    this.logger.info('screen: complete', {
      shipmentId, riskScore: report.riskScore, band: report.riskBand,
      holdForReview, findingCount: findings.length, elapsedMs,
    });
    return report;
  }
}

/** Convenience: screen a shipment with default config. */
export function screen(shipment: Shipment, config?: ShieldConfig): ShieldReport {
  return new CustomsShield(config).screen(shipment);
}

export { DEFAULT_CONFIG };
