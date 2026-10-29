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
import type { Shipment, ShieldFinding } from '../types.js';
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
export declare const DEFAULT_PRODUCT_RESTRICTIONS: ProductRestriction[];
export declare function setRestrictions(list: ProductRestriction[]): void;
export declare function getRestrictions(): ProductRestriction[];
/** Check a shipment against product restrictions. */
export declare function checkShipment(shipment: Shipment): ShieldFinding[];
//# sourceMappingURL=rules.d.ts.map