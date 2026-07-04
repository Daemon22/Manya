import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateManifest, isValidManifest } from '../dist/cjs/index.js';

// Smoke test for the pre-built dist/ as consumed from the manya workspace.
// The authoritative, full test suite (tests/contracts.spec.ts, run via
// Jest) lives in this package's origin repo, manya-intelligence-os.

test('validateManifest accepts a well-formed manifest', () => {
  const manifest = {
    name: '@manya/contracts',
    version: '1.0.0',
    dependencies: { '@manya/keyring': '^1.0.0' },
    exports: ['./src/index.js'],
    imports: ['@manya/keyring'],
    capabilities: ['crypto'],
  };
  const result = validateManifest(manifest);
  assert.equal(result.valid, true);
  assert.equal(result.errors.length, 0);
  assert.equal(isValidManifest(manifest), true);
});

test('validateManifest rejects a non-object manifest', () => {
  const result = validateManifest('not a manifest');
  assert.equal(result.valid, false);
  assert.ok(result.errors.length > 0);
});
