/**
 * @manya/customs-shield — shared type definitions.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

/** A Harmonized System (HS) code — 6 to 10 digits. */
export interface HSCode {
  /** ISO 3166-1 alpha-2 country code that issued the code (e.g. 'US', 'ZA'). */
  issuingCountry: string;
  /** 6-digit international portion. */
  international: string;
  /** Optional country-specific suffix (digits 7-10). */
  nationalSuffix?: string;
  /** Human-readable description. */
  description: string;
  /** Optional unit of measure (e.g. 'kg', 'L', 'pcs'). */
  unit?: string;
  /** Optional general duty rate (percentage). */
  generalDutyRate?: number;
  /** Optional preferential duty rate (e.g. FTA). */
  preferentialRate?: number;
  /** Whether this code is subject to export controls. */
  exportControlled?: boolean;
  /** Whether this code is subject to import licensing. */
  importLicenseRequired?: boolean;
}

/** A party to a trade transaction (shipper, consignee, supplier, etc.). */
export interface TradeParty {
  name: string;
  country: string;
  address?: string;
  taxId?: string;
  /** Optional known aliases. */
  aliases?: string[];
}

/** A cargo line item. */
export interface CargoItem {
  description: string;
  hsCode: string;
  quantity: number;
  unit: string;
  unitValue: number;
  /** Total weight in kilograms. */
  weightKg?: number;
  countryOfOrigin: string;
}

/** A shipment being screened. */
export interface Shipment {
  id: string;
  shipper: TradeParty;
  consignee: TradeParty;
  /** ISO 3166-1 alpha-2 codes for the route. */
  originCountry: string;
  destinationCountry: string;
  /** Optional intermediate transshipment countries. */
  transshipmentCountries?: string[];
  items: CargoItem[];
  /** Total declared value (in shipment currency). */
  declaredValue: number;
  currency: string;
  /** ISO 8601 date the shipment was created. */
  createdAt: string;
  /** Incoterm 2020 code (EXW, FCA, CPT, CIP, DAP, DPU, DDP, FAS, FOB, CFR, CIF). */
  incoterm?: string;
  /** Mode of transport. */
  mode?: 'air' | 'sea' | 'road' | 'rail' | 'mail' | 'multimodal';
}

/** A sanctions list entry. */
export interface SanctionsEntry {
  list: 'OFAC' | 'EU' | 'UN' | 'UK' | 'OTHER';
  /** The sanctioned entity name. */
  name: string;
  /** Country associated with the entity. */
  country?: string;
  /** Sanctioned country (for country-level sanctions). */
  sanctionedCountry?: string;
  /** Match strength hint (exact, partial, fuzzy). */
  matchStrength?: 'exact' | 'partial' | 'fuzzy';
  /** Optional program / legal basis. */
  program?: string;
  /** Optional effective date. */
  effectiveDate?: string;
  /** Optional aliases. */
  aliases?: string[];
}

/** Severity of a screening hit. */
export type Severity = 'info' | 'low' | 'medium' | 'high' | 'critical';

/** A single screening finding. */
export interface ShieldFinding {
  /** Category of finding. */
  category:
    | 'hs_code_invalid' | 'hs_code_mismatch' | 'hs_code_suggestion'
    | 'sanctions_hit' | 'sanctions_country_hit'
    | 'restriction_violation'
    | 'license_required'
    | 'duty_miscalculation'
    | 'documentation_gap'
    | 'vulnerability'
    | 'risk_indicator';
  severity: Severity;
  /** Human-readable message. */
  message: string;
  /** The specific item or party this finding refers to. */
  ref?: string;
  /** Suggested remediation. */
  remediation?: string;
  /** Confidence in [0,1]. */
  confidence: number;
}

/** A complete screening report. */
export interface ShieldReport {
  shipmentId: string;
  /** Overall risk score in [0,100]. */
  riskScore: number;
  /** Risk band. */
  riskBand: 'low' | 'moderate' | 'elevated' | 'high' | 'critical';
  /** Whether the shipment should be held for manual review. */
  holdForReview: boolean;
  findings: ShieldFinding[];
  /** Per-category counts. */
  counts: Record<string, number>;
  /** Duty recalculation, if applicable. */
  duty?: { declared: number; expected: number; delta: number };
  /** Generated timestamp. */
  generatedAt: string;
  /** Wall-clock time in ms. */
  elapsedMs: number;
}

/** A regulatory compliance report — formatted for export to a regulator. */
export interface RegulatoryReport {
  /** Regulator (e.g. 'CBP', 'SARS', 'HMRC'). */
  regulator: string;
  shipmentId: string;
  /** Report type (e.g. 'import_declaration', 'sanctions_screening_record'). */
  type: string;
  /** Fields the regulator expects, with values from the shipment. */
  fields: Record<string, string | number | boolean | string[] | unknown[] | Record<string, unknown>>;
  /** Generated at. */
  generatedAt: string;
}
