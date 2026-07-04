import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateRule, RULE_CATEGORIES } from '../dist/cjs/index.js';

// Smoke test for the pre-built dist/ as consumed from the manya workspace.
// The authoritative, full test suite (tests/constitution.spec.ts, run via
// Jest) lives in this package's origin repo, manya-intelligence-os.

function ctx(action, extra = {}) {
  return { subject: 'tester', action, timestamp: new Date().toISOString(), metadata: extra };
}

const harmRule = {
  id: 'harm.no-physical-harm',
  name: 'No physical harm',
  description: 'do not harm a person',
  category: 'harm',
  forbidden: true,
  severity: 'critical',
};

test('RULE_CATEGORIES declares the expected ethical categories', () => {
  assert.deepEqual(RULE_CATEGORIES, [
    'harm', 'deception', 'privacy', 'fairness', 'autonomy', 'transparency',
  ]);
});

test('a forbidden rule triggers when the action matches its intent', () => {
  const triggered = evaluateRule(harmRule, ctx('harm the user'));
  const clear = evaluateRule(harmRule, ctx('help the user'));
  assert.equal(triggered.violated, true);
  assert.equal(clear.violated, false);
});
