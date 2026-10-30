"use strict";
/**
 * @manya-os/customs-shield — main orchestrator.
 *
 * Wires together HS-code validation, sanctions screening, compliance
 * rules, trade restrictions, risk scoring, and regulatory reporting.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_CONFIG = exports.CustomsShield = void 0;
exports.screen = screen;
const catalog_js_1 = require("./hscode/catalog.js");
const screener_js_1 = require("./sanctions/screener.js");
const rules_js_1 = require("./compliance/rules.js");
const rules_js_2 = require("./restrictions/rules.js");
const scoring_js_1 = require("./risk/scoring.js");
const config_js_1 = require("./config/config.js");
Object.defineProperty(exports, "DEFAULT_CONFIG", { enumerable: true, get: function () { return config_js_1.DEFAULT_CONFIG; } });
const logging_js_1 = require("./logging.js");
const errors_js_1 = require("./errors.js");
class CustomsShield {
    config;
    logger;
    constructor(config) {
        this.config = (0, config_js_1.mergeConfig)(config);
        this.logger = this.config.logger ?? (this.config.logLevel === 'silent' ? new logging_js_1.SilentLogger() : new logging_js_1.ConsoleLogger(this.config.logLevel));
    }
    /** Screen a shipment end-to-end. */
    screen(shipment) {
        if (!shipment)
            throw new errors_js_1.CustomsShieldError('Shipment is required');
        if (!shipment.id)
            throw new errors_js_1.CustomsShieldError('Shipment ID is required');
        if (!Array.isArray(shipment.items))
            throw new errors_js_1.CustomsShieldError('Shipment items must be array');
        const start = Date.now();
        this.logger.debug('screen: starting', { shipmentId: shipment.id, itemCount: shipment.items.length });
        const findings = [];
        // 1. HS code validation per item.
        for (const item of shipment.items) {
            const v = (0, catalog_js_1.validate)(item.hsCode);
            if (!v.valid) {
                findings.push({
                    category: 'hs_code_invalid',
                    severity: 'high',
                    message: `Invalid HS code '${item.hsCode}' on item '${item.description.slice(0, 40)}': ${v.reason}`,
                    ref: item.hsCode,
                    remediation: 'Provide a valid 6-to-10-digit HS code.',
                    confidence: 0.95,
                });
            }
            else if (v.partial) {
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
        findings.push(...(0, screener_js_1.screenParties)(parties, this.config.sanctionsThreshold));
        if (shipment.transshipmentCountries) {
            for (const tc of shipment.transshipmentCountries) {
                findings.push(...(0, screener_js_1.screenParties)([{ name: tc, country: tc }], this.config.sanctionsThreshold));
            }
        }
        // 3. Embargoes.
        findings.push(...(0, rules_js_1.checkEmbargoes)(shipment));
        // 4. Licenses.
        findings.push(...(0, rules_js_1.checkLicenses)(shipment));
        // 5. Restricted origins.
        findings.push(...(0, rules_js_1.checkRestrictedOrigins)(shipment));
        // 6. Product restrictions.
        findings.push(...(0, rules_js_2.checkShipment)(shipment));
        // 7. Risk indicators + vulnerabilities.
        findings.push(...(0, scoring_js_1.detectIndicators)(shipment));
        findings.push(...(0, scoring_js_1.analyzeVulnerabilities)(shipment));
        // 8. Score.
        const { score, band, holdForReview } = (0, scoring_js_1.scoreFrom)(findings);
        const hold = holdForReview || score >= this.config.holdThreshold;
        // 9. Duty computation.
        let duty;
        if (this.config.computeDuty) {
            const d = (0, rules_js_1.calculateDuty)(shipment);
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
                const reScore = (0, scoring_js_1.scoreFrom)(findings);
                return this.buildReport(shipment.id, findings, reScore.score, reScore.band, hold || reScore.holdForReview, duty, start);
            }
        }
        return this.buildReport(shipment.id, findings, score, band, hold, duty, start);
    }
    buildReport(shipmentId, findings, score, band, holdForReview, duty, start) {
        const counts = {};
        for (const f of findings)
            counts[f.category] = (counts[f.category] ?? 0) + 1;
        const elapsedMs = Date.now() - start;
        const report = {
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
exports.CustomsShield = CustomsShield;
/** Convenience: screen a shipment with default config. */
function screen(shipment, config) {
    return new CustomsShield(config).screen(shipment);
}
//# sourceMappingURL=shield.js.map