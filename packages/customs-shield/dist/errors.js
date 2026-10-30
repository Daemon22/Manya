"use strict";
/**
 * @manya-os/customs-shield — typed error hierarchy.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportingError = exports.RiskError = exports.RestrictionError = exports.ComplianceError = exports.SanctionsError = exports.HSCodeError = exports.CustomsShieldError = void 0;
class CustomsShieldError extends Error {
    code;
    cause;
    constructor(message, code, cause) {
        super(message);
        this.name = new.target.name;
        this.code = code ?? new.target.name;
        if (cause !== undefined)
            this.cause = cause;
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
exports.CustomsShieldError = CustomsShieldError;
class HSCodeError extends CustomsShieldError {
    constructor(message, cause) { super(message, 'HS_CODE_ERROR', cause); }
}
exports.HSCodeError = HSCodeError;
class SanctionsError extends CustomsShieldError {
    constructor(message, cause) { super(message, 'SANCTIONS_ERROR', cause); }
}
exports.SanctionsError = SanctionsError;
class ComplianceError extends CustomsShieldError {
    constructor(message, cause) { super(message, 'COMPLIANCE_ERROR', cause); }
}
exports.ComplianceError = ComplianceError;
class RestrictionError extends CustomsShieldError {
    constructor(message, cause) { super(message, 'RESTRICTION_ERROR', cause); }
}
exports.RestrictionError = RestrictionError;
class RiskError extends CustomsShieldError {
    constructor(message, cause) { super(message, 'RISK_ERROR', cause); }
}
exports.RiskError = RiskError;
class ReportingError extends CustomsShieldError {
    constructor(message, cause) { super(message, 'REPORTING_ERROR', cause); }
}
exports.ReportingError = ReportingError;
//# sourceMappingURL=errors.js.map