import { test } from 'node:test';
import assert from 'node:assert/strict';
import { anonymize } from '../src/index.js';

const records = [
  { name: 'Jane Doe', email: 'jane@example.com', note: 'Follow up next week' },
  { name: 'John Roe', email: 'john@example.com', note: 'call 555-123-4567 tomorrow' },
];

test('redacts sensitive fields across all records', () => {
  const { records: redacted, totalRedactions } = anonymize.redactDataset(records);
  assert.ok(totalRedactions >= 2);
  assert.ok(!redacted[0].email.includes('jane@example.com'));
  assert.ok(!redacted[1].note.includes('555-123-4567'));
});

test('classifies dataset sensitivity', () => {
  const result = anonymize.classifyDataset(records);
  assert.ok(result.level);
  assert.ok(typeof result.score === 'number');
});

test('runs the full publication pipeline', () => {
  const result = anonymize.prepareForPublication(
    records,
    { experimentId: 'test-study', software: { name: 'pipeline', version: '1.0.0' } },
    {
      doi: '10.1234/test-study',
      repository: 'https://data.example.org/test-study',
      format: 'CSV',
      metadataStandard: 'DataCite',
      license: 'CC-BY-4.0',
      provenance: 'test-review',
    }
  );

  assert.ok(result.manifest.manifestHash);
  assert.equal(result.fair.fair, true);
  assert.equal(result.readyToPublish, true);
  assert.ok(!result.records[0].email.includes('jane@example.com'));
});

test('flags a dataset as not ready when FAIR fields are missing', () => {
  const result = anonymize.prepareForPublication(
    records,
    { experimentId: 'test-study-2', software: { name: 'pipeline', version: '1.0.0' } },
    { repository: 'https://data.example.org/test-study-2' } // missing doi, format, license, provenance
  );
  assert.equal(result.fair.fair, false);
  assert.equal(result.readyToPublish, false);
});
