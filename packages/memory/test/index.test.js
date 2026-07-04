import { test } from 'node:test';
import assert from 'node:assert/strict';
import { memory } from '../src/index.js';

test('records and recalls episodic events', () => {
  const store = memory.createMemoryStore('ara');
  memory.remember(store, 'ara', 'observed a new file in downloads');
  memory.remember(store, 'atlas', 'verified the file checksum');
  const all = memory.recallEpisodes(store, { limit: 5 });
  assert.equal(all.length, 2);
  const araOnly = memory.recallEpisodes(store, { agent: 'ara' });
  assert.equal(araOnly.length, 1);
  assert.equal(araOnly[0].event, 'observed a new file in downloads');
});

test('episodic chain is tamper-evident', () => {
  const store = memory.createMemoryStore('ara');
  memory.remember(store, 'ara', 'first event');
  memory.remember(store, 'ara', 'second event');
  const before = memory.verifyEpisodicIntegrity(store);
  assert.equal(before.valid, true);

  // Tamper with the chain directly
  store.episodicChain.entries[1].previousHash = 'not-the-real-hash';
  const after = memory.verifyEpisodicIntegrity(store);
  assert.equal(after.valid, false);
  assert.equal(after.brokenAt, 1);
});

test('working memory respects TTL expiry', async () => {
  const store = memory.createMemoryStore('ara');
  memory.rememberWorking(store, 'session', { step: 1 }, 10);
  assert.deepEqual(memory.recallWorking(store, 'session'), { step: 1 });
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(memory.recallWorking(store, 'session'), undefined);
});

test('semantic and procedural memory store and recall', () => {
  const store = memory.createMemoryStore('ara');
  memory.learnFact(store, 'owner', 'prefers dark mode', 0.9);
  assert.equal(memory.recallFact(store, 'owner').fact, 'prefers dark mode');

  memory.learnSkill(store, 'double', (n) => n * 2);
  assert.equal(memory.executeSkill(store, 'double', 21), 42);
});

test('archival memory persists via vault', () => {
  const store = memory.createMemoryStore('ara');
  memory.archive(store, 'family-rules', { bedtime: '9pm' });
  assert.deepEqual(memory.retrieveArchive(store, 'family-rules'), { bedtime: '9pm' });
});

test('sharing is opt-in per channel, not global', () => {
  const store = memory.createMemoryStore('ara');
  const received = [];
  memory.subscribeOn(store, 'household-updates', (evt) => received.push(evt.payload));

  memory.shareOn(store, 'household-updates', { note: 'groceries low' });
  memory.shareOn(store, 'other-channel', { note: 'should not arrive' });

  assert.equal(received.length, 1);
  assert.deepEqual(received[0], { note: 'groceries low' });
});
