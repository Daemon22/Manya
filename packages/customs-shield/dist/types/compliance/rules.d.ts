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
import type { Shipment, ShieldFinding } from '../types.js';
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
    rate: number;
}
/** Combined rule set. */
export interface ComplianceRuleSet {
    embargoes: EmbargoRule[];
    licenses: LicenseRule[];
    restrictedOrigins: RestrictedOriginRule[];
    duties: DutyRule[];
}
/** Built-in starter rule set. Production deployments should override with `setRuleSet`. */
export declare const DEFAULT_RULE_SET: ComplianceRuleSet;
/** Replace the global rule set. */
export declare function setRuleSet(rules: ComplianceRuleSet): void;
export declare function getRuleSet(): ComplianceRuleSet;
/** Check embargo rules. */
export declare function checkEmbargoes(shipment: Shipment): ShieldFinding[];
/** Check license requirements. */
export declare function checkLicenses(shipment: Shipment): ShieldFinding[];
/** Check restricted-origin rules. */
export declare function checkRestrictedOrigins(shipment: Shipment): ShieldFinding[];
/** Calculate expected duty for a shipment. */
export declare function calculateDuty(shipment: Shipment): {
    declared: number;
    expected: number;
    delta: number;
    perItem: Array<{
        hsCode: string;
        rate: number;
        value: number;
        duty: number;
    }>;
};
/** Run all compliance checks and return findings. */
export declare function runAll(shipment: Shipment): ShieldFinding[];
//# sourceMappingURL=rules.d.ts.map