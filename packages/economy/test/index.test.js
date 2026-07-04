import { test } from 'node:test';
import assert from 'node:assert/strict';
import { memory } from '@manya/memory';
import { economy } from '../src/index.js';

function setup(startingBalance = 1000) {
  const store = memory.createMemoryStore('ara');
  return { store, eco: economy.createEconomy('ara', store, startingBalance) };
}

test('tracks usage and decrements balance', () => {
  const { eco } = setup(1000);
  const { balance, spent } = economy.trackUsage(eco, 'ara', 200);
  assert.equal(spent, 200);
  assert.equal(balance, 800);
  assert.equal(economy.getBalance(eco), 800);
});

test('enforceBudget blocks a request that exceeds the balance', () => {
  const { eco, store } = setup(100);
  const allowed = economy.enforceBudget(eco, 50);
  const denied = economy.enforceBudget(eco, 500);
  assert.equal(allowed, true);
  assert.equal(denied, false);

  const events = memory.recallEpisodes(store, { agent: 'Economy' });
  assert.ok(events.some((e) => /Blocked action requiring 500/.test(e.event)));
});

test('routeTier uses the caller-supplied tier map, not a hardcoded one', () => {
  const { eco } = setup();
  const tiers = { low: 'tier-a', medium: 'tier-b', high: 'tier-c' };
  assert.equal(economy.routeTier(eco, 'high', tiers), 'tier-c');
  assert.throws(() => economy.routeTier(eco, 'ultra', tiers), /No tier configured/);
});

test('usage ledger is tamper-evident', () => {
  const { eco } = setup(1000);
  economy.trackUsage(eco, 'ara', 100);
  economy.trackUsage(eco, 'atlas', 50);
  assert.equal(economy.verifyLedger(eco).valid, true);

  eco.ledger.chain[1].previousHash = 'tampered';
  assert.equal(economy.verifyLedger(eco).valid, false);
});
