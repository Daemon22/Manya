/**
 * @manya/upmp — Integration tests.
 */

import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createAdapter,
  createSessionStartedEvent,
  createStuckPointEvent,
  createDiscoveryEvent,
  UPMP_SYNC_CHANNELS,
  UPMP_CAPABILITIES,
  DEFAULT_INTELLIGENCES,
} from '../index.js';
import { upmpManifest } from '@manya/toolkit';
import { createBus, subscribe } from '@manya/unify';

// -- Constants --

test('UPMP: UPMP_SYNC_CHANNELS has 7 channels', () => {
  assert.equal(UPMP_SYNC_CHANNELS.length, 7);
  assert.ok(UPMP_SYNC_CHANNELS.includes('upmp:session-started'));
  assert.ok(UPMP_SYNC_CHANNELS.includes('upmp:stuck-point'));
  assert.ok(UPMP_SYNC_CHANNELS.includes('upmp:breakthrough'));
});

test('UPMP: UPMP_CAPABILITIES has 6 capabilities', () => {
  assert.equal(UPMP_CAPABILITIES.length, 6);
  assert.ok(UPMP_CAPABILITIES.includes('activityTracking'));
  assert.ok(UPMP_CAPABILITIES.includes('stuckPointDetection'));
  assert.ok(UPMP_CAPABILITIES.includes('intelligenceEngagement'));
});

test('UPMP: DEFAULT_INTELLIGENCES has 9 intelligences', () => {
  assert.equal(DEFAULT_INTELLIGENCES.length, 9);
  assert.ok(DEFAULT_INTELLIGENCES.some(i => i.key === 'linguistic'));
  assert.ok(DEFAULT_INTELLIGENCES.some(i => i.key === 'existential'));
});

test('UPMP: upmpManifest has correct identity and capabilities', () => {
  assert.equal(upmpManifest.id, 'upmp');
  assert.equal(upmpManifest.name, 'UPMP');
  assert.equal(upmpManifest.foundation, 'Manya');
  assert.ok(upmpManifest.owns.includes('activityTracking'));
  assert.ok(upmpManifest.owns.includes('intelligenceEngagement'));
  assert.ok(upmpManifest.syncChannels.includes('upmp:session-started'));
});

// -- Adapter --

test('UPMP/Adapter: createAdapter returns adapter with sessionId and bus', () => {
  const bus = createBus();
  const adapter = createAdapter({ bus });
  assert.ok(adapter.sessionId.startsWith('upmp-'));
  assert.equal(adapter.bus, bus);
});

test('UPMP/Adapter: createAdapter rejects missing bus', () => {
  assert.throws(() => createAdapter({}), /requires a bus/);
});

// -- Sessions --

test('UPMP/Adapter: startSession creates an active session', () => {
  const bus = createBus();
  const adapter = createAdapter({ bus });
  const session = adapter.startSession({
    activityType: 'writing',
    intelligence: 'linguistic',
    context: 'blog post',
    intent: 'Write 500 words',
    goals: ['Outline', 'Intro', 'Body'],
  });
  assert.equal(session.status, 'active');
  assert.equal(session.activityType, 'writing');
  assert.equal(session.intelligence, 'linguistic');
  assert.equal(session.goals.length, 3);
  assert.equal(adapter.getActiveSession().id, session.id);
});

test('UPMP/Adapter: startSession rejects missing activityType', () => {
  const bus = createBus();
  const adapter = createAdapter({ bus });
  assert.throws(() => adapter.startSession({}), /requires an activityType/);
});

test('UPMP/Adapter: startSession rejects when session already active', () => {
  const bus = createBus();
  const adapter = createAdapter({ bus });
  adapter.startSession({ activityType: 'writing' });
  assert.throws(() => adapter.startSession({ activityType: 'coding' }), /Session already active/);
});

test('UPMP/Adapter: endSession ends the active session', () => {
  const bus = createBus();
  const adapter = createAdapter({ bus });
  adapter.startSession({ activityType: 'writing' });
  const session = adapter.endSession('Done');
  assert.equal(session.status, 'ended');
  assert.ok(session.endedAt);
  assert.equal(session.summary, 'Done');
  assert.equal(adapter.getActiveSession(), null);
});

test('UPMP/Adapter: endSession rejects when no active session', () => {
  const bus = createBus();
  const adapter = createAdapter({ bus });
  assert.throws(() => adapter.endSession(), /No active session/);
});

// -- Stuck points --

test('UPMP/Adapter: recordStuckPoint adds to session and forwards event', () => {
  const bus = createBus();
  const adapter = createAdapter({ bus });
  let received = null;
  subscribe(bus, 'upmp:stuck-point', (e) => { received = e; });
  adapter.startSession({ activityType: 'writing', intelligence: 'linguistic' });
  const stuck = adapter.recordStuckPoint('Can\'t find the hook');
  assert.ok(stuck.id);
  assert.equal(stuck.description, 'Can\'t find the hook');
  assert.equal(stuck.resolved, false);
  assert.ok(received);
  assert.equal(received.payload.description, 'Can\'t find the hook');
});

test('UPMP/Adapter: resolveStuckPoint marks resolved and forwards event', () => {
  const bus = createBus();
  const adapter = createAdapter({ bus });
  let resolved = null;
  subscribe(bus, 'upmp:stuck-resolved', (e) => { resolved = e; });
  adapter.startSession({ activityType: 'writing', intelligence: 'linguistic' });
  const stuck = adapter.recordStuckPoint('stuck');
  adapter.resolveStuckPoint(stuck.id, { strategy: 'took a walk', resolutionType: 'breakthrough' });
  assert.equal(stuck.resolved, true);
  assert.equal(stuck.resolution, 'took a walk');
  assert.equal(stuck.resolutionType, 'breakthrough');
  assert.ok(resolved);
});

test('UPMP/Adapter: resolveStuckPoint with "latest" resolves most recent', () => {
  const bus = createBus();
  const adapter = createAdapter({ bus });
  adapter.startSession({ activityType: 'writing' });
  adapter.recordStuckPoint('stuck 1');
  const stuck2 = adapter.recordStuckPoint('stuck 2');
  adapter.resolveStuckPoint('latest', { strategy: 'figured it out' });
  assert.equal(stuck2.resolved, true);
});

test('UPMP/Adapter: resolveStuckPoint fires breakthrough event', () => {
  const bus = createBus();
  const adapter = createAdapter({ bus });
  let breakthrough = null;
  subscribe(bus, 'upmp:breakthrough', (e) => { breakthrough = e; });
  adapter.startSession({ activityType: 'writing', intelligence: 'linguistic' });
  const stuck = adapter.recordStuckPoint('stuck');
  adapter.resolveStuckPoint(stuck.id, { resolutionType: 'breakthrough' });
  assert.ok(breakthrough);
  assert.equal(breakthrough.payload.intelligence, 'linguistic');
});

// -- Discoveries --

test('UPMP/Adapter: recordDiscovery adds to session and forwards event', () => {
  const bus = createBus();
  const adapter = createAdapter({ bus });
  let received = null;
  subscribe(bus, 'upmp:discovery', (e) => { received = e; });
  adapter.startSession({ activityType: 'writing' });
  const discovery = adapter.recordDiscovery({
    type: 'post',
    url: 'https://example.com/article',
    note: 'Great technique',
  });
  assert.ok(discovery.id);
  assert.equal(discovery.type, 'post');
  assert.equal(discovery.url, 'https://example.com/article');
  assert.ok(received);
  assert.equal(received.payload.type, 'post');
  assert.equal(received.payload.url, 'https://example.com/article');
});

test('UPMP/Adapter: recordDiscovery without active session still works', () => {
  const bus = createBus();
  const adapter = createAdapter({ bus });
  const discovery = adapter.recordDiscovery({ type: 'snippet', text: 'hello', note: 'test' });
  assert.ok(discovery.id);
  assert.equal(discovery.sessionId, null);
});

// -- Intelligence --

test('UPMP/Adapter: startSession increments intelligence session count', () => {
  const bus = createBus();
  const adapter = createAdapter({ bus });
  adapter.startSession({ activityType: 'writing', intelligence: 'linguistic' });
  adapter.endSession();
  adapter.startSession({ activityType: 'writing', intelligence: 'linguistic' });
  adapter.endSession();
  const intel = adapter.getIntelligences().find(i => i.key === 'linguistic');
  assert.equal(intel.sessions, 2);
});

test('UPMP/Adapter: addIntelligence adds a custom intelligence', () => {
  const bus = createBus();
  const adapter = createAdapter({ bus });
  const intel = adapter.addIntelligence({ key: 'creative_writing', name: 'Creative Writing', engagedBy: 'fiction,poetry' });
  assert.equal(intel.key, 'creative_writing');
  assert.equal(intel.name, 'Creative Writing');
  assert.ok(adapter.getIntelligences().some(i => i.key === 'creative_writing'));
});

test('UPMP/Adapter: addIntelligence rejects duplicate key', () => {
  const bus = createBus();
  const adapter = createAdapter({ bus });
  assert.throws(() => adapter.addIntelligence({ key: 'linguistic', name: 'X' }), /already exists/);
});

// -- Intelligence → Identity linking --

test('UPMP/Adapter: linkIntelligenceToIdentity links and resolves', () => {
  const bus = createBus();
  const adapter = createAdapter({ bus });
  adapter.linkIntelligenceToIdentity('linguistic', 'id-josiah');
  assert.equal(adapter.resolveIntelligenceIdentity('linguistic'), 'id-josiah');
  assert.equal(adapter.resolveIntelligenceIdentity('logical_math'), null);
  const links = adapter.listIntelligenceLinks();
  assert.equal(links.length, 1);
  assert.equal(links[0].intelligenceKey, 'linguistic');
});

test('UPMP/Adapter: linkIntelligenceToIdentity rejects unknown intelligence', () => {
  const bus = createBus();
  const adapter = createAdapter({ bus });
  assert.throws(() => adapter.linkIntelligenceToIdentity('unknown', 'id-x'), /Unknown intelligence/);
});

// -- Event forwarding --

test('UPMP/Adapter: forward rejects unknown channel', () => {
  const bus = createBus();
  const adapter = createAdapter({ bus });
  assert.throws(() => adapter.forward('upmp:unknown', {}), /Unknown UPMP sync channel/);
});

test('UPMP/Adapter: forward delivers to subscribers', () => {
  const bus = createBus();
  const adapter = createAdapter({ bus });
  let received = null;
  subscribe(bus, 'upmp:session-started', (e) => { received = e; });
  adapter.forward('upmp:session-started', { activityType: 'writing' });
  assert.ok(received);
  assert.equal(received.sourceToolId, 'upmp');
  assert.equal(received.payload.activityType, 'writing');
});

// -- Event factories --

test('UPMP/Events: createSessionStartedEvent includes all fields', () => {
  const evt = createSessionStartedEvent({ activityType: 'writing', intelligence: 'linguistic', context: 'blog', intent: '500 words', goals: ['a', 'b'] });
  assert.equal(evt.type, 'session-started');
  assert.equal(evt.activityType, 'writing');
  assert.equal(evt.intelligence, 'linguistic');
  assert.equal(evt.goals.length, 2);
  assert.ok(evt.timestamp);
});

test('UPMP/Events: createStuckPointEvent includes description', () => {
  const evt = createStuckPointEvent({ description: 'stuck', intelligence: 'linguistic' });
  assert.equal(evt.type, 'stuck-point');
  assert.equal(evt.description, 'stuck');
});

test('UPMP/Events: createDiscoveryEvent includes type and url', () => {
  const evt = createDiscoveryEvent({ type: 'post', url: 'https://example.com', note: 'test' });
  assert.equal(evt.type, 'discovery');
  assert.equal(evt.discoveryType, 'post');
  assert.equal(evt.url, 'https://example.com');
});

// -- Introspection --

test('UPMP/Adapter: getSyncChannels returns all 7 channels', () => {
  const bus = createBus();
  const adapter = createAdapter({ bus });
  assert.equal(adapter.getSyncChannels().length, 7);
});

test('UPMP/Adapter: getCapabilities returns all 6 capabilities', () => {
  const bus = createBus();
  const adapter = createAdapter({ bus });
  assert.equal(adapter.getCapabilities().length, 6);
});

// -- E2E --

test('UPMP/E2E: full session with stuck + discovery + resolution', () => {
  const bus = createBus({ replay: true });
  const adapter = createAdapter({ bus });
  const received = [];
  for (const ch of UPMP_SYNC_CHANNELS) {
    subscribe(bus, ch, (e) => received.push(e));
  }
  // Start session
  adapter.startSession({ activityType: 'writing', intelligence: 'linguistic', intent: 'Write blog post' });
  // Get stuck
  const stuck = adapter.recordStuckPoint('Can\'t find the hook');
  // Discover something
  adapter.recordDiscovery({ type: 'post', url: 'https://example.com/hooks', note: 'Great hook technique', relatedStuckId: stuck.id });
  // Resolve stuck as breakthrough
  adapter.resolveStuckPoint(stuck.id, { strategy: 'Used the technique', resolutionType: 'breakthrough' });
  // End session
  adapter.endSession('Draft complete');
  // Events: session-started, intelligence-engaged, stuck-point, discovery, breakthrough, stuck-resolved, session-ended = 7
  assert.ok(received.length >= 7);
  const topics = received.map(e => e.topic);
  assert.ok(topics.includes('upmp:session-started'));
  assert.ok(topics.includes('upmp:stuck-point'));
  assert.ok(topics.includes('upmp:discovery'));
  assert.ok(topics.includes('upmp:breakthrough'));
  assert.ok(topics.includes('upmp:stuck-resolved'));
  assert.ok(topics.includes('upmp:session-ended'));
  // Intelligence profile should reflect the session
  const intel = adapter.getIntelligences().find(i => i.key === 'linguistic');
  assert.equal(intel.sessions, 1);
  assert.equal(intel.stuckCount, 1);
  assert.equal(intel.breakthroughCount, 1);
});
