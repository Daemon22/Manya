import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { memory } from '@manya/memory';
import { unify, _resetMesh } from '@manya/unify';
import { cortex } from '../src/index.js';

beforeEach(() => {
  _resetMesh();
});

test('classifies intent from free text', () => {
  assert.equal(cortex.classifyIntent('what is the wifi password'), 'recall');
  assert.equal(cortex.classifyIntent('run the backup script'), 'execution');
  assert.equal(cortex.classifyIntent('send a message to Atlas'), 'communication');
  assert.equal(cortex.classifyIntent('figure out the weekend trip'), 'planning');
});

test('resolves an unregistered capability as unowned but declared', () => {
  const result = cortex.resolveCapability('keyDerivation');
  assert.equal(result.toolId, 'forge');
  assert.equal(result.registered, false);
  assert.equal(result.api, null);
});

test('plan reflects a registered owner once the mesh knows about it', () => {
  unify.registerTool({
    manifest: { id: 'forge', owns: ['keyDerivation'] },
    api: { deriveKey: () => 'derived-key' },
  });

  const store = memory.createMemoryStore('ara');
  const c = cortex.createCortex(store);
  const result = cortex.plan(c, 'run key derivation for the new device', { capability: 'keyDerivation' });

  assert.equal(result.intent, 'execution');
  assert.equal(result.owner, 'forge');
  assert.ok(result.steps.some((s) => s.includes('forge')));
  assert.ok(result.confidence > 0.4);
});

test('plan gates on authorization when requester/resource/action are given', () => {
  const store = memory.createMemoryStore('ara');
  const c = cortex.createCortex(store);
  cortex.authorize(c, 'atlas', 'operator', [{ resource: 'device:*', actions: ['provision'] }]);

  const allowed = cortex.plan(c, 'provision the new device', {
    requesterId: 'atlas',
    resource: 'device:phone-1',
    action: 'provision',
  });
  assert.equal(allowed.authorized, true);

  const denied = cortex.plan(c, 'provision the new device', {
    requesterId: 'nova',
    resource: 'device:phone-1',
    action: 'provision',
  });
  assert.equal(denied.authorized, false);
  assert.ok(denied.confidence < allowed.confidence);
});

test('dispatchPlan refuses to run an unauthorized plan', () => {
  unify.registerTool({
    manifest: { id: 'forge', owns: ['keyDerivation'] },
    api: { deriveKey: () => 'derived-key' },
  });
  const store = memory.createMemoryStore('ara');
  const c = cortex.createCortex(store);
  const denied = cortex.plan(c, 'derive a key', {
    capability: 'keyDerivation',
    requesterId: 'stranger',
    resource: 'device:*',
    action: 'provision',
  });

  assert.throws(() => cortex.dispatchPlan(c, denied, 'keyDerivation', 'deriveKey', []), /unauthorized/);
});

test('dispatchPlan runs the owning tool method when authorized', () => {
  unify.registerTool({
    manifest: { id: 'forge', owns: ['keyDerivation'] },
    api: { deriveKey: () => 'derived-key' },
  });
  const store = memory.createMemoryStore('ara');
  const c = cortex.createCortex(store);
  const okPlan = cortex.plan(c, 'derive a key', { capability: 'keyDerivation' });

  const value = cortex.dispatchPlan(c, okPlan, 'keyDerivation', 'deriveKey', []);
  assert.equal(value, 'derived-key');
});

test('decision trail is tamper-evident and independent of episodic memory', () => {
  const store = memory.createMemoryStore('ara');
  const c = cortex.createCortex(store);
  cortex.plan(c, 'first task');
  cortex.plan(c, 'second task');

  assert.equal(cortex.verifyDecisionTrail(c).valid, true);
  c.decisionChain.entries[1].previousHash = 'tampered';
  assert.equal(cortex.verifyDecisionTrail(c).valid, false);
});
