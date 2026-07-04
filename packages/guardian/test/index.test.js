import { test } from 'node:test';
import assert from 'node:assert/strict';
import { guardian } from '../src/index.js';

test('stores and retrieves a standing principle', () => {
  const g = guardian.createGuardian('household');
  guardian.setPrinciple(g, 'quiet-hours', { start: '21:00', end: '07:00' });
  assert.deepEqual(guardian.getPrinciple(g, 'quiet-hours'), { start: '21:00', end: '07:00' });
});

test('grants a role and allows a matching action', () => {
  const g = guardian.createGuardian('household');
  guardian.grantRole(g, 'atlas', 'operator', [{ resource: 'device:*', actions: ['provision'] }]);

  const result = guardian.checkAction(g, 'atlas', 'device:phone-1', 'provision');
  assert.equal(result.allowed, true);
});

test('denies an action outside the granted role', () => {
  const g = guardian.createGuardian('household');
  guardian.grantRole(g, 'atlas', 'operator', [{ resource: 'device:*', actions: ['provision'] }]);

  const result = guardian.checkAction(g, 'atlas', 'device:phone-1', 'wipe');
  assert.equal(result.allowed, false);
});

test('every check is recorded in a tamper-evident ledger', () => {
  const g = guardian.createGuardian('household');
  guardian.grantRole(g, 'atlas', 'operator', [{ resource: 'device:*', actions: ['provision'] }]);
  guardian.checkAction(g, 'atlas', 'device:phone-1', 'provision');
  guardian.checkAction(g, 'atlas', 'device:phone-1', 'wipe');

  assert.equal(guardian.verifyAuditTrail(g).valid, true);
  g.ledger.chain[1].previousHash = 'tampered';
  assert.equal(guardian.verifyAuditTrail(g).valid, false);
});
