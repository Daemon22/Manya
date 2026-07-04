import { test } from 'node:test';
import assert from 'node:assert/strict';
import { memory } from '@manya/memory';
import { perception } from '../src/index.js';

test('ingestText redacts PII before it reaches working memory', () => {
  const store = memory.createMemoryStore('ara');
  const p = perception.createPerception(store);

  const result = perception.ingestText(p, 'sms', 'call me at 555-123-4567 or jane@example.com');
  assert.ok(result.redactionCount >= 2);
  assert.ok(!result.stored.includes('555-123-4567'));
  assert.ok(!result.stored.includes('jane@example.com'));

  const stored = memory.recallWorking(store, 'perception:text:sms');
  assert.equal(stored, result.stored);
});

test('ingestText classifies sensitivity', () => {
  const store = memory.createMemoryStore('ara');
  const p = perception.createPerception(store);
  const result = perception.ingestText(p, 'doc', 'this document is confidential and proprietary');
  assert.equal(result.sensitivity.level, 'confidential');
});

test('ingestStructured stores JSON-serializable data', () => {
  const store = memory.createMemoryStore('ara');
  const p = perception.createPerception(store);
  const ok = perception.ingestStructured(p, 'sensor', { temp: 21.5, unit: 'C' });
  assert.equal(ok, true);
  assert.deepEqual(memory.recallWorking(store, 'perception:data:sensor'), { temp: 21.5, unit: 'C' });
});

test('ingestStructured fails gracefully on circular data', () => {
  const store = memory.createMemoryStore('ara');
  const p = perception.createPerception(store);
  const circular = {};
  circular.self = circular;
  const ok = perception.ingestStructured(p, 'bad', circular);
  assert.equal(ok, false);
});

test('perceiveEnvironment stores a device snapshot', () => {
  const store = memory.createMemoryStore('ara');
  const p = perception.createPerception(store);
  const snapshot = perception.perceiveEnvironment(p, {});
  assert.ok(snapshot.device);
  assert.ok(snapshot.fingerprint);
  assert.deepEqual(memory.recallWorking(store, 'perception:environment'), snapshot);
});

test('every ingestion is remembered episodically', () => {
  const store = memory.createMemoryStore('ara');
  const p = perception.createPerception(store);
  perception.ingestText(p, 'sms', 'hello there');
  const episodes = memory.recallEpisodes(store, { agent: 'Perception' });
  assert.equal(episodes.length, 1);
  assert.match(episodes[0].event, /Ingested text from sms/);
});
