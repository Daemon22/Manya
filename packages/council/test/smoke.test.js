import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matchScore, SpecialistRegistry } from '../dist/cjs/index.js';

// Smoke test for the pre-built dist/ as consumed from the manya workspace.
// The authoritative, full test suite (tests/council.spec.ts, run via Jest)
// lives in this package's origin repo, manya-intelligence-os.

function specialist(id, expertise, weight = 1) {
  return { id, name: id, expertise, weight };
}
function problem(id, description, domain) {
  return { id, description, domain, createdAt: new Date().toISOString() };
}

test('matchScore reflects expertise overlap with a problem', () => {
  const s = specialist('a', ['security', 'crypto']);
  const noMatch = problem('p1', 'audit the budget', 'finance');
  const match = problem('p2', 'audit the crypto security', 'security');

  assert.equal(matchScore(match, s), matchScore(match, s)); // deterministic
  assert.equal(matchScore(noMatch, s), 0);
  assert.ok(matchScore(match, s) > 0);
});

test('SpecialistRegistry registers, retrieves, and lists specialists', () => {
  const registry = new SpecialistRegistry();
  const a = specialist('a', ['x']);
  registry.register(a);

  assert.equal(registry.get('a'), a);
  assert.equal(registry.list().length, 1);
  registry.unregister('a');
  assert.equal(registry.list().length, 0);
});
