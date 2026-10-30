/**
 * @manya-os/anonymize — shared type definitions.
 *
 * Public API surface. Stable across minor versions.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
/** A category of personally identifiable information. */
export type PIICategory = 'person_name' | 'email_address' | 'phone_number' | 'physical_address' | 'postal_code' | 'national_id' | 'passport_number' | 'drivers_license' | 'credit_card' | 'bank_account' | 'date_of_birth' | 'date' | 'ip_address' | 'mac_address' | 'url' | 'username' | 'password' | 'api_key' | 'jwt_token' | 'device_id' | 'user_id' | 'religion' | 'ethnicity' | 'sexual_orientation' | 'political_affiliation' | 'health_condition' | 'medication' | 'medical_record_number';
/** A category of protected health information (HIPAA Safe-Harbor aligned). */
export type PHICategory = 'phi_diagnosis' | 'phi_procedure' | 'phi_medication' | 'phi_provider' | 'phi_facility' | 'phi_dates' | 'phi_age' | 'phi_device';
/** Severity of a finding — drives redaction strategy. */
export type Severity = 'low' | 'medium' | 'high' | 'critical';
/** A single detected sensitive span in source text. */
export interface Finding {
    /** 0-based start index, inclusive. */
    start: number;
    /** 0-based end index, exclusive. */
    end: number;
    /** The matched text. */
    text: string;
    /** PII or PHI category. */
    category: PIICategory | PHICategory;
    /** Confidence in [0,1]. */
    confidence: number;
    /** Severity. */
    severity: Severity;
    /** Name of the detector that produced this finding. */
    detector: string;
}
/** A redaction operation applied to a finding. */
export interface Redaction {
    /** The finding being redacted. */
    finding: Finding;
    /** The replacement text written into the output. */
    replacement: string;
    /** Strategy used. */
    strategy: RedactionStrategy;
}
/** Strategy used to redact a finding. */
export type RedactionStrategy = 'mask' | 'hash' | 'token' | 'redact' | 'generalize' | 'synthesize';
/** Result of running the anonymization pipeline over an input. */
export interface AnonymizationResult {
    /** The anonymized output. */
    output: string;
    /** All findings (before redaction). */
    findings: Finding[];
    /** All redactions applied. */
    redactions: Redaction[];
    /** Whether the output is considered safe to publish. */
    safe: boolean;
    /** Counts by category. */
    counts: Record<string, number>;
    /** Wall-clock time in ms. */
    elapsedMs: number;
}
/** A validation report entry. */
export interface ValidationEntry {
    level: 'info' | 'warning' | 'error';
    code: string;
    message: string;
    /** Optional finding index this entry refers to. */
    findingIndex?: number;
}
/** Full validation report. */
export interface ValidationReport {
    passed: boolean;
    entries: ValidationEntry[];
    /** Residual risk score in [0,1] (lower is better). */
    residualRisk: number;
    /** Counts of findings per category remaining in output (should be 0 for safe output). */
    residualCounts: Record<string, number>;
    /** Hash of the pipeline configuration used (for reproducibility). */
    configHash: string;
}
/** A reproducible dataset manifest. */
export interface DatasetManifest {
    /** Schema version. */
    schemaVersion: 1;
    /** Dataset name. */
    name: string;
    /** ISO-8601 creation timestamp. */
    createdAt: string;
    /** Number of records. */
    recordCount: number;
    /** SHA-256 of each record (post-anonymization). */
    recordHashes: string[];
    /** Overall SHA-256 (concatenation of recordHashes). */
    datasetHash: string;
    /** Pipeline config hash. */
    configHash: string;
    /** Validation report summary. */
    validation: {
        passed: boolean;
        residualRisk: number;
    };
}
//# sourceMappingURL=types.d.ts.map