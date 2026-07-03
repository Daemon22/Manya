import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ledger } from '../src/index.js';

test('records events and delivers them to subscribers', () => {
  const led = ledger.create({ name: 'test-ledger' });
  const received = [];
  ledger.onTopic(led, 'topic.a', (event) => received.push(event));

  ledger.record(led, 'topic.a', { sourceToolId: 'test', payload: { n: 1 } });
  ledger.record(led, 'topic.a', { sourceToolId: 'test', payload: { n: 2 } });

  assert.equal(received.length, 2);
  assert.equal(received[1].payload.n, 2);
});

test('chains entries and verifies the resulting chain', () => {
  const led = ledger.create();
  ledger.record(led, 'topic.b', { sourceToolId: 'test', payload: { step: 1 } });
  ledger.record(led, 'topic.b', { sourceToolId: 'test', payload: { step: 2 } });
  ledger.record(led, 'topic.b', { sourceToolId: 'test', payload: { step: 3 } });

  assert.equal(led.chain.length, 3);
  assert.equal(led.chain[0].previousHash, null);
  assert.equal(led.chain[1].previousHash, led.chain[0].hash);

  const result = ledger.verify(led);
  assert.equal(result.valid, true);
});

test('detects tampering in the chain', () => {
  const led = ledger.create();
  ledger.record(led, 'topic.c', { sourceToolId: 'test', payload: { step: 1 } });
  ledger.record(led, 'topic.c', { sourceToolId: 'test', payload: { step: 2 } });

  // Simulate tampering: swap the hash of the first entry
  led.chain[0].hash = 'tampered-hash';

  const result = ledger.verify(led);
  assert.equal(result.valid, false);
});

test('an empty ledger verifies as valid', () => {
  const led = ledger.create();
  const result = ledger.verify(led);
  assert.equal(result.valid, true);
});
