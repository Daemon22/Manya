import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isValidFormat, normalize } from '../dist/cjs/index.js';

// Smoke test for the pre-built dist/ as consumed from the manya workspace.
// The authoritative, full test suite (tests/customs-shield.spec.ts, run via
// Jest) lives in this package's origin repo, manya-intelligence-os.

test('isValidFormat accepts valid HS code formats', () => {
  assert.equal(isValidFormat('010121'), true);
  assert.equal(isValidFormat('0101.21'), true);
  assert.equal(isValidFormat('0101210000'), true);
  assert.equal(isValidFormat('abc'), false);
});

test('normalize strips HS code separators', () => {
  assert.equal(normalize('0101.21.0000'), '0101210000');
  assert.equal(normalize('0101 21'), '010121');
});
