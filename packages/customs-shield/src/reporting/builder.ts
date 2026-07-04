/**
 * @manya/customs-shield — regulatory reporting.
 *
 * Generates structured reports suitable for submission to customs
 * authorities. Reports are data-only — no PII beyond what's strictly
 * required by the regulator.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import type { Shipment, RegulatoryReport, ShieldReport } from '../types.js';
import { ReportingError } from '../errors.js';
import { calculateDuty } from '../compliance/rules.js';

/** Build an import declaration for the given regulator. */
export function buildImportDeclaration(shipment: Shipment, regulator: string): RegulatoryReport {
  if (!shipment) throw new ReportingError('Shipment is required');
  if (!regulator) throw new ReportingError('Regulator is required');

  const duty = calculateDuty(shipment);
  const fields: RegulatoryReport['fields'] = {
    shipmentId: shipment.id,
    shipperName: shipment.shipper.name,
    shipperCountry: shipment.shipper.country,
    consigneeName: shipment.consignee.name,
    consigneeCountry: shipment.consignee.country,
    originCountry: shipment.originCountry,
    destinationCountry: shipment.destinationCountry,
    declaredValue: shipment.declaredValue,
    currency: shipment.currency,
    incoterm: shipment.incoterm ?? 'NOT_DECLARED',
    modeOfTransport: shipment.mode ?? 'NOT_DECLARED',
    itemCount: shipment.items.length,
    totalWeightKg: shipment.items.reduce((s, i) => s + (i.weightKg ?? 0), 0),
    expectedDuty: duty.expected.toFixed(2),
    itemDetails: shipment.items.map(i => ({
      hsCode: i.hsCode,
      description: i.description,
      quantity: i.quantity,
      unitValue: i.unitValue,
      countryOfOrigin: i.countryOfOrigin,
    })),
  };

  return {
    regulator,
    shipmentId: shipment.id,
    type: 'import_declaration',
    fields,
    generatedAt: new Date().toISOString(),
  };
}

/** Build a sanctions screening record. */
export function buildSanctionsRecord(shipment: Shipment, regulator: string, report: ShieldReport): RegulatoryReport {
  if (!shipment) throw new ReportingError('Shipment is required');
  if (!report) throw new ReportingError('Shield report is required');
  return {
    regulator,
    shipmentId: shipment.id,
    type: 'sanctions_screening_record',
    fields: {
      screenedAt: report.generatedAt,
      riskScore: report.riskScore,
      riskBand: report.riskBand,
      holdForReview: report.holdForReview,
      findingCount: report.findings.length,
      criticalFindings: report.findings.filter(f => f.severity === 'critical').length,
      highFindings: report.findings.filter(f => f.severity === 'high').length,
      sanctionsHits: report.counts.sanctions_hit ?? 0,
      countryHits: report.counts.sanctions_country_hit ?? 0,
    },
    generatedAt: new Date().toISOString(),
  };
}

/** Serialize a regulatory report as canonical JSON. */
export function serialize(report: RegulatoryReport): string {
  return JSON.stringify(report, null, 2);
}

/** Validate a regulatory report has the minimum required fields. */
export function validate(report: RegulatoryReport): { valid: boolean; missing: string[] } {
  const missing: string[] = [];
  if (!report.regulator) missing.push('regulator');
  if (!report.shipmentId) missing.push('shipmentId');
  if (!report.type) missing.push('type');
  if (!report.generatedAt) missing.push('generatedAt');
  if (!report.fields || Object.keys(report.fields).length === 0) missing.push('fields');
  return { valid: missing.length === 0, missing };
}
