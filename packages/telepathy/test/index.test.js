import { test } from 'node:test';
import assert from 'node:assert/strict';
import { keyring } from '@manya/keyring';
import { memory } from '@manya/memory';
import { unify } from '@manya/unify';
import { telepathy } from '../src/index.js';

function setup(ownerId) {
  const kr = keyring.create(ownerId, 'a-strong-passphrase');
  const store = memory.createMemoryStore(ownerId);
  return { kr, store, tp: telepathy.createTelepathy(kr, store) };
}

test('delivers a verified message to a known contact', () => {
  const ara = setup('ara');
  const atlas = setup('atlas');

  telepathy.registerContact(ara.tp, 'atlas', atlas.kr.signingKeys.publicKey);
  telepathy.registerContact(atlas.tp, 'ara', ara.kr.signingKeys.publicKey);

  atlas.tp.bus = ara.tp.bus;

  const received = [];
  telepathy.listen(atlas.tp, (msg) => received.push(msg));
  telepathy.send(ara.tp, 'atlas', { note: 'device provisioned' });

  assert.equal(received.length, 1);
  assert.equal(received[0].from, 'ara');
  assert.deepEqual(received[0].payload, { note: 'device provisioned' });
});

test('blocks a message from an unregistered sender', () => {
  const ara = setup('ara');
  const stranger = setup('stranger');
  stranger.tp.bus = ara.tp.bus;

  const received = [];
  telepathy.listen(ara.tp, (msg) => received.push(msg));
  telepathy.send(stranger.tp, 'ara', { note: 'should be blocked' });

  assert.equal(received.length, 0);
  const blocked = memory.recallEpisodes(ara.store, { agent: 'Telepathy' });
  assert.equal(blocked.length, 1);
  assert.match(blocked[0].event, /unknown sender/);
});

test('blocks a message with a forged sender field', () => {
  const ara = setup('ara');
  const atlas = setup('atlas');
  const impostor = setup('impostor');
  atlas.tp.bus = ara.tp.bus;

  telepathy.registerContact(atlas.tp, 'ara', ara.kr.signingKeys.publicKey);

  const genuineEnvelope = keyring.signMessage(impostor.kr, JSON.stringify({ note: 'forged' }), {
    recipients: ['atlas'],
  });
  const forgedEnvelope = { ...genuineEnvelope, sender: 'ara' };

  const received = [];
  telepathy.listen(atlas.tp, (msg) => received.push(msg));
  unify.publish(atlas.tp.bus, 'telepathy:atlas', { type: 'telepathy', payload: forgedEnvelope });

  assert.equal(received.length, 0);
  const blocked = memory.recallEpisodes(atlas.store, { agent: 'Telepathy' });
  assert.ok(blocked.some((e) => /unverified message from ara/.test(e.event)));
});

test("sends are remembered in the sender's episodic memory", () => {
  const ara = setup('ara');
  const atlas = setup('atlas');
  telepathy.registerContact(ara.tp, 'atlas', atlas.kr.signingKeys.publicKey);
  telepathy.send(ara.tp, 'atlas', { note: 'hello' });

  const sent = memory.recallEpisodes(ara.store, { agent: 'ara' });
  assert.equal(sent.length, 1);
  assert.match(sent[0].event, /sent to atlas/);
});
