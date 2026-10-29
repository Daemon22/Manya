"use strict";
/**
 * @manya-os/customs-shield — regulatory reporting.
 *
 * Generates structured reports suitable for submission to customs
 * authorities. Reports are data-only — no PII beyond what's strictly
 * required by the regulator.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildImportDeclaration = buildImportDeclaration;
exports.buildSanctionsRecord = buildSanctionsRecord;
exports.serialize = serialize;
exports.validate = validate;
const errors_js_1 = require("../errors.js");
const rules_js_1 = require("../compliance/rules.js");
/** Build an import declaration for the given regulator. */
function buildImportDeclaration(shipment, regulator) {
    if (!shipment)
        throw new errors_js_1.ReportingError('Shipment is required');
    if (!regulator)
        throw new errors_js_1.ReportingError('Regulator is required');
    const duty = (0, rules_js_1.calculateDuty)(shipment);
    const fields = {
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
function buildSanctionsRecord(shipment, regulator, report) {
    if (!shipment)
        throw new errors_js_1.ReportingError('Shipment is required');
    if (!report)
        throw new errors_js_1.ReportingError('Shield report is required');
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
function serialize(report) {
    return JSON.stringify(report, null, 2);
}
/** Validate a regulatory report has the minimum required fields. */
function validate(report) {
    const missing = [];
    if (!report.regulator)
        missing.push('regulator');
    if (!report.shipmentId)
        missing.push('shipmentId');
    if (!report.type)
        missing.push('type');
    if (!report.generatedAt)
        missing.push('generatedAt');
    if (!report.fields || Object.keys(report.fields).length === 0)
        missing.push('fields');
    return { valid: missing.length === 0, missing };
}
//# sourceMappingURL=builder.js.map