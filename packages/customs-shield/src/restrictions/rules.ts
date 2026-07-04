/**
 * @manya/customs-shield — trade restrictions module.
 *
 * Encodes country-level and product-level restrictions, including dual-use
 * goods controls (Wassenaar), drug precursor controls, and cultural-property
 * restrictions.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import type { CargoItem, Shipment, ShieldFinding } from '../types.js';
import { chapter } from '../hscode/catalog.js';
import { RestrictionError } from '../errors.js';

/** A product-level restriction. */
export interface ProductRestriction {
  /** Destination country. */
  destinationCountry: string;
  /** HS chapter(s) this applies to. */
  hsChapters: string[];
  /** Restriction type. */
  type: 'prohibited' | 'license_required' | 'quota' | 'documentation_required';
  /** Reason / regulation. */
  reason: string;
  /** Quota amount (for 'quota' type). */
  quotaAmount?: number;
}

/** Built-in starter restrictions. */
export const DEFAULT_PRODUCT_RESTRICTIONS: ProductRestriction[] = [
  // Dual-use goods (Wassenaar Arrangement, simplified).
  { destinationCountry: '*', hsChapters: ['90', '93'], type: 'license_required', reason: 'Wassenaar dual-use controls' },
  // Drug precursors (UN Convention against Illicit Traffic).
  { destinationCountry: '*', hsChapters: ['29'], type: 'license_required', reason: 'UN drug precursor controls' },
  // Cultural property (UNESCO 1970).
  { destinationCountry: '*', hsChapters: ['97'], type: 'documentation_required', reason: 'UNESCO 1970 cultural property convention' },
  // Ozone-depleting substances (Montreal Protocol).
  { destinationCountry: '*', hsChapters: ['38'], type: 'license_required', reason: 'Montreal Protocol on ozone-depleting substances' },
  // Endangered species (CITES).
  { destinationCountry: '*', hsChapters: ['01', '05', '41', '43'], type: 'documentation_required', reason: 'CITES endangered species convention' },
];

let globalRestrictions: ProductRestriction[] = [...DEFAULT_PRODUCT_RESTRICTIONS];

export function setRestrictions(list: ProductRestriction[]): void {
  if (!Array.isArray(list)) throw new RestrictionError('Restrictions must be an array');
  globalRestrictions = list;
}

export function getRestrictions(): ProductRestriction[] {
  return globalRestrictions;
}

/** Check a shipment against product restrictions. */
export function checkShipment(shipment: Shipment): ShieldFinding[] {
  const out: ShieldFinding[] = [];
  for (const item of shipment.items) {
    const ch = chapter(item.hsCode);
    for (const r of globalRestrictions) {
      if (r.destinationCountry !== '*' && r.destinationCountry !== shipment.destinationCountry) continue;
      if (!r.hsChapters.includes(ch)) continue;
      const severity = r.type === 'prohibited' ? 'critical' : r.type === 'license_required' ? 'high' : 'medium';
      out.push({
        category: r.type === 'prohibited' ? 'restriction_violation' : 'license_required',
        severity,
        message: `Item '${item.description.slice(0, 50)}' (HS ${item.hsCode}, chapter ${ch}) — ${r.type.replace(/_/g, ' ')}: ${r.reason}`,
        ref: item.hsCode,
        remediation: r.type === 'prohibited' ? 'Cannot ship.' : r.type === 'license_required' ? 'Obtain required license.' : 'Provide additional documentation.',
        confidence: 0.95,
      });
    }
  }
  return out;
}
