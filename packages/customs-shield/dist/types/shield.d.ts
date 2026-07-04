/**
 * @manya/customs-shield — main orchestrator.
 *
 * Wires together HS-code validation, sanctions screening, compliance
 * rules, trade restrictions, risk scoring, and regulatory reporting.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
import type { Shipment, ShieldReport } from './types.js';
import { DEFAULT_CONFIG } from './config/config.js';
import type { ShieldConfig } from './config/config.js';
export declare class CustomsShield {
    private readonly config;
    private readonly logger;
    constructor(config?: ShieldConfig);
    /** Screen a shipment end-to-end. */
    screen(shipment: Shipment): ShieldReport;
    private buildReport;
}
/** Convenience: screen a shipment with default config. */
export declare function screen(shipment: Shipment, config?: ShieldConfig): ShieldReport;
export { DEFAULT_CONFIG };
//# sourceMappingURL=shield.d.ts.map