/**
 * @manya/contracts — validation reports.
 *
 * Aggregates per-section validation results into a single `ValidationReport`,
 * serializes reports to JSON, and produces one-line summaries for log lines
 * and dashboards.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
import type { ValidationReport, ValidationReportSection } from '../types.js';
/**
 * Builds a `ValidationReport` from a name and a list of section results.
 * `passed` is computed as the AND of every section's `passed`. `generatedAt`
 * is set to the current ISO timestamp unless provided.
 */
export declare function buildReport(name: string, sections: ValidationReportSection[], generatedAt?: string): ValidationReport;
/**
 * Aggregates multiple `ValidationReport`s into a single report. The merged
 * report is named `aggregate` (or the provided `name`), its `passed` flag is
 * the AND of all input reports' `passed` flags, and its `sections` array is
 * the concatenation of every input's sections (prefixed with the source
 * report name to keep section names unique). `generatedAt` is set to now.
 */
export declare function aggregateReports(reports: ReadonlyArray<ValidationReport>, name?: string): ValidationReport;
/**
 * Serializes a `ValidationReport` to a stable, indented JSON string. Throws
 * `ReportingError` if the report contains a value that JSON cannot encode.
 */
export declare function serializeReport(report: ValidationReport): string;
/**
 * Returns a single-line summary of a `ValidationReport`, e.g.
 *   `my-contract: PASS (3/3 sections) at 2024-01-15T12:34:56.000Z`
 *   `my-contract: FAIL (1/3 sections, 4 errors) at 2024-01-15T12:34:56.000Z`
 */
export declare function summarizeReport(report: ValidationReport): string;
//# sourceMappingURL=reporting.d.ts.map