"use strict";
/**
 * @manya-os/customs-shield — trade restrictions module.
 *
 * Encodes country-level and product-level restrictions, including dual-use
 * goods controls (Wassenaar), drug precursor controls, and cultural-property
 * restrictions.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_PRODUCT_RESTRICTIONS = void 0;
exports.setRestrictions = setRestrictions;
exports.getRestrictions = getRestrictions;
exports.checkShipment = checkShipment;
const catalog_js_1 = require("../hscode/catalog.js");
const errors_js_1 = require("../errors.js");
/** Built-in starter restrictions. */
exports.DEFAULT_PRODUCT_RESTRICTIONS = [
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
let globalRestrictions = [...exports.DEFAULT_PRODUCT_RESTRICTIONS];
function setRestrictions(list) {
    if (!Array.isArray(list))
        throw new errors_js_1.RestrictionError('Restrictions must be an array');
    globalRestrictions = list;
}
function getRestrictions() {
    return globalRestrictions;
}
/** Check a shipment against product restrictions. */
function checkShipment(shipment) {
    const out = [];
    for (const item of shipment.items) {
        const ch = (0, catalog_js_1.chapter)(item.hsCode);
        for (const r of globalRestrictions) {
            if (r.destinationCountry !== '*' && r.destinationCountry !== shipment.destinationCountry)
                continue;
            if (!r.hsChapters.includes(ch))
                continue;
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
//# sourceMappingURL=rules.js.map