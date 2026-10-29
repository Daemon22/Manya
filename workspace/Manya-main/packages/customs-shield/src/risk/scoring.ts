/**
 * @manya/customs-shield — risk scoring, cargo risk, vulnerability analysis.
 *
 * Computes a risk score in [0,100] for a shipment based on weighted
 * indicators. Indicators include sanctions hits, embargo violations,
 * license requirements, restricted origins, transshipment through
 * high-risk countries, value/weight anomalies, and documentation gaps.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import type { Shipment, ShieldFinding, Severity } from '../types.js';
import { RiskError } from '../errors.js';

/** High-risk transshipment countries (illustrative — production deployments must keep this current). */
export const HIGH_RISK_TRANSSHIPMENT = ['AE', 'PA', 'HK', 'SG', 'MT', 'CY', 'BS', 'KY'];

/** Risk indicator weights (sum ≈ 100). */
export const INDICATOR_WEIGHTS = {
  sanctions_country_hit: 45,
  sanctions_hit: 35,
  restriction_violation: 30,
  license_required: 12,
  hs_code_invalid: 10,
  hs_code_mismatch: 6,
  hs_code_suggestion: 2,
  duty_miscalculation: 6,
  documentation_gap: 4,
  vulnerability: 5,
  risk_indicator: 3,
} as const;

/** Severity multipliers. */
const SEVERITY_MULTIPLIER: Record<Severity, number> = {
  info: 0.3,
  low: 0.5,
  medium: 0.75,
  high: 1.0,
  critical: 1.2,
};

/** Cap on per-finding contribution, scaled by severity. */
const MAX_PER_FINDING: Record<Severity, number> = {
  info: 5,
  low: 10,
  medium: 20,
  high: 40,
  critical: 80,
};

/** Detect shipment-level risk indicators (transshipment, value/weight anomalies). */
export function detectIndicators(shipment: Shipment): ShieldFinding[] {
  const out: ShieldFinding[] = [];

  // Transshipment through high-risk countries.
  if (shipment.transshipmentCountries) {
    for (const c of shipment.transshipmentCountries) {
      if (HIGH_RISK_TRANSSHIPMENT.includes(c)) {
        out.push({
          category: 'risk_indicator',
          severity: 'medium',
          message: `Transshipment through high-risk country: ${c}`,
          ref: c,
          remediation: 'Verify cargo integrity at transshipment point.',
          confidence: 0.7,
        });
      }
    }
  }

  // Value/weight anomaly: declared value per kg unusually low or high.
  for (const item of shipment.items) {
    if (item.weightKg && item.weightKg > 0) {
      const valuePerKg = (item.quantity * item.unitValue) / item.weightKg;
      if (valuePerKg > 10000) {
        out.push({
          category: 'risk_indicator',
          severity: 'medium',
          message: `Item '${item.description.slice(0, 40)}' has unusually high value/weight ratio (${valuePerKg.toFixed(0)}/kg) — possible misclassification or undervaluation`,
          ref: item.hsCode,
          remediation: 'Verify HS code and declared value.',
          confidence: 0.6,
        });
      } else if (valuePerKg < 0.5) {
        out.push({
          category: 'risk_indicator',
          severity: 'low',
          message: `Item '${item.description.slice(0, 40)}' has unusually low value/weight ratio (${valuePerKg.toFixed(2)}/kg) — possible overvaluation or waste shipment`,
          ref: item.hsCode,
          remediation: 'Verify HS code and declared value.',
          confidence: 0.5,
        });
      }
    }
  }

  // Documentation gaps.
  if (!shipment.incoterm) {
    out.push({
      category: 'documentation_gap',
      severity: 'low',
      message: 'Incoterm not declared',
      ref: shipment.id,
      remediation: 'Specify Incoterm 2020 code.',
      confidence: 0.95,
    });
  }
  if (!shipment.mode) {
    out.push({
      category: 'documentation_gap',
      severity: 'low',
      message: 'Mode of transport not declared',
      ref: shipment.id,
      remediation: 'Specify transport mode.',
      confidence: 0.95,
    });
  }
  for (const item of shipment.items) {
    if (!item.weightKg) {
      out.push({
        category: 'documentation_gap',
        severity: 'low',
        message: `Item '${item.description.slice(0, 40)}' missing weight`,
        ref: item.hsCode,
        remediation: 'Declare weight in kilograms.',
        confidence: 0.9,
      });
    }
  }

  return out;
}

/** Map a [0,100] score to a band. */
export function bandFor(score: number): 'low' | 'moderate' | 'elevated' | 'high' | 'critical' {
  if (score < 10) return 'low';
  if (score < 25) return 'moderate';
  if (score < 50) return 'elevated';
  if (score < 75) return 'high';
  return 'critical';
}

/** Compute the aggregate risk score from findings. */
export function scoreFrom(findings: ShieldFinding[]): { score: number; band: 'low' | 'moderate' | 'elevated' | 'high' | 'critical'; holdForReview: boolean } {
  if (!Array.isArray(findings)) throw new RiskError('Findings must be an array');
  let score = 0;
  let hasCritical = false;
  for (const f of findings) {
    const w = INDICATOR_WEIGHTS[f.category as keyof typeof INDICATOR_WEIGHTS] ?? 1;
    const mult = SEVERITY_MULTIPLIER[f.severity] ?? 1;
    const cap = MAX_PER_FINDING[f.severity] ?? 20;
    const contribution = Math.min(cap, w * mult * f.confidence);
    score += contribution;
    if (f.severity === 'critical') hasCritical = true;
  }
  score = Math.min(100, score);
  const band = bandFor(score);
  const holdForReview = hasCritical || score >= 50;
  return { score, band, holdForReview };
}

/** Cargo-specific vulnerability analysis. */
export function analyzeVulnerabilities(shipment: Shipment): ShieldFinding[] {
  const out: ShieldFinding[] = [];
  // High-value concentration: single item > 80% of declared value.
  const totalValue = shipment.items.reduce((s, i) => s + i.quantity * i.unitValue, 0);
  for (const item of shipment.items) {
    const itemValue = item.quantity * item.unitValue;
    if (totalValue > 0 && itemValue / totalValue > 0.8) {
      out.push({
        category: 'vulnerability',
        severity: 'medium',
        message: `Single-item value concentration: '${item.description.slice(0, 40)}' is ${(itemValue / totalValue * 100).toFixed(0)}% of shipment value`,
        ref: item.hsCode,
        remediation: 'Consider splitting high-value shipments or adding insurance.',
        confidence: 0.85,
      });
    }
  }
  // Single-source-of-supply: shipper == consignee (potential circular trade).
  if (shipment.shipper.name === shipment.consignee.name) {
    out.push({
      category: 'vulnerability',
      severity: 'low',
      message: 'Shipper and consignee are the same party — potential circular trade',
      ref: shipment.id,
      remediation: 'Verify legitimate related-party transaction.',
      confidence: 0.6,
    });
  }
  return out;
}
