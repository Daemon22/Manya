/**
 * @manya/customs-shield — typed error hierarchy.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
export declare class CustomsShieldError extends Error {
    readonly code: string;
    readonly cause?: unknown;
    constructor(message: string, code?: string, cause?: unknown);
}
export declare class HSCodeError extends CustomsShieldError {
    constructor(message: string, cause?: unknown);
}
export declare class SanctionsError extends CustomsShieldError {
    constructor(message: string, cause?: unknown);
}
export declare class ComplianceError extends CustomsShieldError {
    constructor(message: string, cause?: unknown);
}
export declare class RestrictionError extends CustomsShieldError {
    constructor(message: string, cause?: unknown);
}
export declare class RiskError extends CustomsShieldError {
    constructor(message: string, cause?: unknown);
}
export declare class ReportingError extends CustomsShieldError {
    constructor(message: string, cause?: unknown);
}
//# sourceMappingURL=errors.d.ts.map