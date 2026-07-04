/**
 * @manya/customs-shield — import/export compliance rules.
 *
 * Encodes common compliance rules: restricted-origin lists, license
 * requirements by HS chapter, country-specific embargoes, and duty
 * calculation. Rules are data-driven and extensible.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import type { CargoItem, Shipment, ShieldFinding } from '../types.js';
import { chapter } from '../hscode/catalog.js';
import { ComplianceError } from '../errors.js';

/** Rule: a country pair is embargoed (no trade allowed). */
export interface EmbargoRule {
  fromCountry: string;
  toCountry: string;
  reason: string;
}

/** Rule: items in a chapter require an import license into a destination country. */
export interface LicenseRule {
  destinationCountry: string;
  hsChapter: string;
  licenseType: 'import' | 'export' | 'both';
  reason: string;
}

/** Rule: restricted-origin rule — goods originating from `originCountry` cannot enter `destinationCountry`. */
export interface RestrictedOriginRule {
  destinationCountry: string;
  originCountry: string;
  reason: string;
}

/** Rule: duty rate by HS chapter for a destination country. */
export interface DutyRule {
  destinationCountry: string;
  hsChapter: string;
  rate: number; // percentage
}

/** Combined rule set. */
export interface ComplianceRuleSet {
  embargoes: EmbargoRule[];
  licenses: LicenseRule[];
  restrictedOrigins: RestrictedOriginRule[];
  duties: DutyRule[];
}

/** Built-in starter rule set. Production deployments should override with `setRuleSet`. */
export const DEFAULT_RULE_SET: ComplianceRuleSet = {
  embargoes: [
    { fromCountry: 'US', toCountry: 'CU', reason: 'US embargo on Cuba' },
    { fromCountry: 'US', toCountry: 'IR', reason: 'US embargo on Iran' },
    { fromCountry: 'US', toCountry: 'KP', reason: 'US embargo on North Korea' },
    { fromCountry: 'US', toCountry: 'SY', reason: 'US embargo on Syria' },
    { fromCountry: 'EU', toCountry: 'RU', reason: 'EU sanctions on Russia (partial)' },
  ],
  licenses: [
    { destinationCountry: 'US', hsChapter: '93', licenseType: 'both', reason: 'Firearms and ammunition require ATF/ECC license' },
    { destinationCountry: 'US', hsChapter: '90', licenseType: 'both', reason: 'Some medical devices require FDA clearance' },
    { destinationCountry: 'ZA', hsChapter: '27', licenseType: 'import', reason: 'Fuel imports require DOE license (South Africa)' },
    { destinationCountry: 'EU', hsChapter: '85', licenseType: 'both', reason: 'Dual-use electronics may require export license' },
  ],
  restrictedOrigins: [
    { destinationCountry: 'US', originCountry: 'CN', reason: 'Section 1260H restrictions on certain goods' },
    { destinationCountry: 'EU', originCountry: 'RU', reason: '14th sanctions package restrictions' },
  ],
  duties: [
    { destinationCountry: 'US', hsChapter: '61', rate: 16.5 },
    { destinationCountry: 'US', hsChapter: '62', rate: 16.5 },
    { destinationCountry: 'US', hsChapter: '64', rate: 8.5 },
    { destinationCountry: 'US', hsChapter: '85', rate: 2.5 },
    { destinationCountry: 'US', hsChapter: '87', rate: 2.5 },
    { destinationCountry: 'ZA', hsChapter: '61', rate: 30 },
    { destinationCountry: 'ZA', hsChapter: '62', rate: 30 },
    { destinationCountry: 'ZA', hsChapter: '85', rate: 5 },
    { destinationCountry: 'EU', hsChapter: '61', rate: 12 },
    { destinationCountry: 'EU', hsChapter: '62', rate: 12 },
    { destinationCountry: 'EU', hsChapter: '85', rate: 0 },
  ],
};

let globalRuleSet: ComplianceRuleSet = DEFAULT_RULE_SET;

/** Replace the global rule set. */
export function setRuleSet(rules: ComplianceRuleSet): void {
  if (!rules || !Array.isArray(rules.embargoes)) {
    throw new ComplianceError('Invalid rule set');
  }
  globalRuleSet = rules;
}

export function getRuleSet(): ComplianceRuleSet {
  return globalRuleSet;
}

/** Check embargo rules. */
export function checkEmbargoes(shipment: Shipment): ShieldFinding[] {
  const out: ShieldFinding[] = [];
  for (const r of globalRuleSet.embargoes) {
    if (shipment.originCountry === r.fromCountry && shipment.destinationCountry === r.toCountry) {
      out.push({
        category: 'restriction_violation',
        severity: 'critical',
        message: `Embargo violation: ${r.reason}`,
        ref: shipment.id,
        remediation: 'Halt shipment immediately.',
        confidence: 1.0,
      });
    }
  }
  return out;
}

/** Check license requirements. */
export function checkLicenses(shipment: Shipment): ShieldFinding[] {
  const out: ShieldFinding[] = [];
  for (const item of shipment.items) {
    const ch = chapter(item.hsCode);
    for (const r of globalRuleSet.licenses) {
      if (r.destinationCountry !== shipment.destinationCountry) continue;
      if (r.hsChapter !== ch) continue;
      out.push({
        category: 'license_required',
        severity: 'high',
        message: `Item '${item.description.slice(0, 50)}' (HS chapter ${ch}) requires ${r.licenseType} license into ${r.destinationCountry}: ${r.reason}`,
        ref: item.hsCode,
        remediation: `Obtain ${r.licenseType} license before shipping.`,
        confidence: 0.95,
      });
    }
  }
  return out;
}

/** Check restricted-origin rules. */
export function checkRestrictedOrigins(shipment: Shipment): ShieldFinding[] {
  const out: ShieldFinding[] = [];
  for (const item of shipment.items) {
    for (const r of globalRuleSet.restrictedOrigins) {
      if (r.destinationCountry !== shipment.destinationCountry) continue;
      if (r.originCountry !== item.countryOfOrigin) continue;
      out.push({
        category: 'restriction_violation',
        severity: 'high',
        message: `Restricted origin: '${item.description.slice(0, 50)}' from ${item.countryOfOrigin} into ${r.destinationCountry}: ${r.reason}`,
        ref: item.hsCode,
        remediation: 'Source from a different origin or apply for an exception.',
        confidence: 0.9,
      });
    }
  }
  return out;
}

/** Calculate expected duty for a shipment. */
export function calculateDuty(shipment: Shipment): { declared: number; expected: number; delta: number; perItem: Array<{ hsCode: string; rate: number; value: number; duty: number }> } {
  const perItem: Array<{ hsCode: string; rate: number; value: number; duty: number }> = [];
  let expected = 0;
  for (const item of shipment.items) {
    const ch = chapter(item.hsCode);
    const rule = globalRuleSet.duties.find(d => d.destinationCountry === shipment.destinationCountry && d.hsChapter === ch);
    const rate = rule?.rate ?? 0;
    const value = item.quantity * item.unitValue;
    const duty = value * (rate / 100);
    expected += duty;
    perItem.push({ hsCode: item.hsCode, rate, value, duty });
  }
  // Declared duty is what the shipper actually paid (not in shipment; we approximate as 0 if absent).
  const declared = (shipment as { declaredDuty?: number }).declaredDuty ?? 0;
  return { declared, expected, delta: expected - declared, perItem };
}

/** Run all compliance checks and return findings. */
export function runAll(shipment: Shipment): ShieldFinding[] {
  return [
    ...checkEmbargoes(shipment),
    ...checkLicenses(shipment),
    ...checkRestrictedOrigins(shipment),
  ];
}
