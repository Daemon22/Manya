/**
 * @manya/customs-shield — typed error hierarchy.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

export class CustomsShieldError extends Error {
  public readonly code: string;
  public override readonly cause?: unknown;
  constructor(message: string, code?: string, cause?: unknown) {
    super(message);
    this.name = new.target.name;
    this.code = code ?? new.target.name;
    if (cause !== undefined) this.cause = cause;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class HSCodeError extends CustomsShieldError {
  constructor(message: string, cause?: unknown) { super(message, 'HS_CODE_ERROR', cause); }
}
export class SanctionsError extends CustomsShieldError {
  constructor(message: string, cause?: unknown) { super(message, 'SANCTIONS_ERROR', cause); }
}
export class ComplianceError extends CustomsShieldError {
  constructor(message: string, cause?: unknown) { super(message, 'COMPLIANCE_ERROR', cause); }
}
export class RestrictionError extends CustomsShieldError {
  constructor(message: string, cause?: unknown) { super(message, 'RESTRICTION_ERROR', cause); }
}
export class RiskError extends CustomsShieldError {
  constructor(message: string, cause?: unknown) { super(message, 'RISK_ERROR', cause); }
}
export class ReportingError extends CustomsShieldError {
  constructor(message: string, cause?: unknown) { super(message, 'REPORTING_ERROR', cause); }
}
