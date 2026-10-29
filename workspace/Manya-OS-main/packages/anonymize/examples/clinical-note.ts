/**
 * @manya-os/anonymize — example: anonymize a clinical note.
 *
 * Run with: npx ts-node examples/clinical-note.ts
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import { Anonymizer } from '../src/index.js';

const note = `
Clinical Note — 2024-01-15
Patient: Mr John Smith (ID 8801235111088)
DOB: 1990-05-15
Address: 123 Main Street, Johannesburg
Contact: alice@example.com, +27-11-555-1234

Diagnosis: Type 2 diabetes, hypertension.
Medication: metformin 500mg BID, lisinopril 10mg daily.
Provider: Dr Sarah Williams, Sandton Clinic.

Next review: 2024-04-15.
`;

const anon = new Anonymizer({
  defaultStrategy: 'mask',
  strategyByCategory: {
    national_id: 'redact',
    credit_card: 'redact',
    person_name: 'token',
    health_condition: 'token',
    medication: 'token',
  },
  logLevel: 'silent',
});

const { result, report } = anon.anonymize(note);
console.log('--- ANONYMIZED ---');
console.log(result.output);
console.log('--- FINDINGS ---');
for (const f of result.findings) {
  console.log(`  [${f.severity}] ${f.category} (conf=${f.confidence.toFixed(2)}): "${f.text}"`);
}
console.log('--- REPORT ---');
console.log(`Passed: ${report.passed}`);
console.log(`Residual risk: ${report.residualRisk.toFixed(3)}`);
console.log(`Elapsed: ${result.elapsedMs}ms`);
