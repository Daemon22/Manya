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
import { ReportingError } from '../errors.js';

/**
 * Builds a `ValidationReport` from a name and a list of section results.
 * `passed` is computed as the AND of every section's `passed`. `generatedAt`
 * is set to the current ISO timestamp unless provided.
 */
export function buildReport(
  name: string,
  sections: ValidationReportSection[],
  generatedAt?: string,
): ValidationReport {
  if (typeof name !== 'string' || name.length === 0) {
    throw new ReportingError('report name must be a non-empty string');
  }
  if (!Array.isArray(sections)) {
    throw new ReportingError('sections must be an array');
  }
  const passed = sections.length > 0 && sections.every(s => s.passed);
  return {
    name,
    passed,
    sections: sections.map(s => ({ ...s, errors: [...s.errors] })),
    generatedAt: generatedAt ?? new Date().toISOString(),
  };
}

/**
 * Aggregates multiple `ValidationReport`s into a single report. The merged
 * report is named `aggregate` (or the provided `name`), its `passed` flag is
 * the AND of all input reports' `passed` flags, and its `sections` array is
 * the concatenation of every input's sections (prefixed with the source
 * report name to keep section names unique). `generatedAt` is set to now.
 */
export function aggregateReports(
  reports: ReadonlyArray<ValidationReport>,
  name = 'aggregate',
): ValidationReport {
  if (!Array.isArray(reports)) {
    throw new ReportingError('reports must be an array');
  }
  const sections: ValidationReportSection[] = [];
  for (const r of reports) {
    for (const s of r.sections) {
      sections.push({
        name: reports.length > 1 ? `${r.name}:${s.name}` : s.name,
        passed: s.passed,
        errors: [...s.errors],
      });
    }
  }
  const passed = reports.length === 0 || reports.every(r => r.passed);
  return {
    name,
    passed,
    sections,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Serializes a `ValidationReport` to a stable, indented JSON string. Throws
 * `ReportingError` if the report contains a value that JSON cannot encode.
 */
export function serializeReport(report: ValidationReport): string {
  try {
    return JSON.stringify(report, null, 2);
  } catch (e) {
    throw new ReportingError('failed to serialize validation report', e);
  }
}

/**
 * Returns a single-line summary of a `ValidationReport`, e.g.
 *   `my-contract: PASS (3/3 sections) at 2024-01-15T12:34:56.000Z`
 *   `my-contract: FAIL (1/3 sections, 4 errors) at 2024-01-15T12:34:56.000Z`
 */
export function summarizeReport(report: ValidationReport): string {
  if (!report || typeof report !== 'object') {
    throw new ReportingError('report must be a ValidationReport object');
  }
  const total = report.sections.length;
  const passedCount = report.sections.filter(s => s.passed).length;
  const totalErrors = report.sections.reduce((n, s) => n + s.errors.length, 0);
  const verdict = report.passed ? 'PASS' : 'FAIL';
  const errorsPart = totalErrors > 0 ? `, ${totalErrors} error${totalErrors === 1 ? '' : 's'}` : '';
  return `${report.name}: ${verdict} (${passedCount}/${total} sections${errorsPart}) at ${report.generatedAt}`;
}
