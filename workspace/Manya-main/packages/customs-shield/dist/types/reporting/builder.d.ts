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
/** Build an import declaration for the given regulator. */
export declare function buildImportDeclaration(shipment: Shipment, regulator: string): RegulatoryReport;
/** Build a sanctions screening record. */
export declare function buildSanctionsRecord(shipment: Shipment, regulator: string, report: ShieldReport): RegulatoryReport;
/** Serialize a regulatory report as canonical JSON. */
export declare function serialize(report: RegulatoryReport): string;
/** Validate a regulatory report has the minimum required fields. */
export declare function validate(report: RegulatoryReport): {
    valid: boolean;
    missing: string[];
};
//# sourceMappingURL=builder.d.ts.map