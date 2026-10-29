/**
 * Manya Anonymize — Redact a dataset, then certify it's actually fit to publish.
 *
 * Composes:
 *   - lens              detects, redacts, and classifies sensitive data
 *   - research-academic  produces a reproducibility manifest and a FAIR assessment
 *
 * The goal is a single pipeline: take raw records in, get back redacted
 * records plus a report on whether they're actually safe and well-formed
 * enough to publish as a research dataset.
 */

import { redact, classify } from '@manya/lens';
import { createManifest, assessFAIR } from '@manya/research-academic';

/**
 * Redacts every string field of every record in a dataset.
 * @param {Array<object>} records
 * @param {object} [options] - Passed through to lens.redact (e.g. { rules, replacement }).
 * @returns {{ records: Array<object>, totalRedactions: number, findings: Array }}
 */
export function redactDataset(records, options = {}) {
  if (!Array.isArray(records)) {
    throw new Error('records must be an array');
  }
  let totalRedactions = 0;
  const findings = [];
  const redacted = records.map((record, i) => {
    const out = {};
    for (const [key, value] of Object.entries(record)) {
      if (typeof value === 'string') {
        const result = redact(value, options);
        out[key] = result.redacted;
        totalRedactions += result.count;
        if (result.found.length) findings.push({ record: i, field: key, found: result.found });
      } else {
        out[key] = value;
      }
    }
    return out;
  });
  return { records: redacted, totalRedactions, findings };
}

/**
 * Classifies the overall sensitivity of a dataset by concatenating and
 * classifying the (pre-redaction) records.
 * @param {Array<object>} records
 */
export function classifyDataset(records) {
  const text = records.map((r) => JSON.stringify(r)).join('\n');
  return classify(text);
}

/**
 * Runs the full pipeline: redact, classify, build a reproducibility
 * manifest over the redacted output, and assess FAIR compliance.
 * @param {Array<object>} records - Raw records.
 * @param {object} manifestInput - Passed to research-academic.createManifest
 *   (experimentId and software are required; see that tool's docs).
 * @param {object} fairArtifact - Passed to research-academic.assessFAIR
 *   (doi/persistentId, repository, format, metadataStandard, license, provenance).
 * @param {object} [redactOptions] - Passed through to lens.redact.
 */
export function prepareForPublication(records, manifestInput, fairArtifact, redactOptions = {}) {
  const { records: redactedRecords, totalRedactions, findings } = redactDataset(records, redactOptions);
  const sensitivity = classifyDataset(records);
  const manifest = createManifest({
    ...manifestInput,
    inputs: [
      { name: 'redacted-dataset', content: Buffer.from(JSON.stringify(redactedRecords)), type: 'application/json' },
    ],
  });
  const fair = assessFAIR(fairArtifact);

  return {
    records: redactedRecords,
    redaction: { totalRedactions, findings },
    sensitivity,
    manifest,
    fair,
    readyToPublish: fair.fair,
  };
}

export const anonymize = {
  redactDataset,
  classifyDataset,
  prepareForPublication,
};

export default anonymize;
