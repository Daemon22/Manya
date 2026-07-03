import { test } from 'node:test';
import assert from 'node:assert/strict';
import { attest } from '../src/index.js';
import { signal } from '@manya/signal';

test('registers a device and captures a fingerprint', () => {
  const registry = attest.createRegistry('test-app');
  const record = attest.registerDevice(registry, 'device-1');
  assert.equal(record.deviceId, 'device-1');
  assert.ok(record.fingerprint.hash);
});

test('verifies a device that presents a valid signed challenge and matching fingerprint', () => {
  const registry = attest.createRegistry('test-app');
  const keys = signal.generateSigningKeys();
  attest.registerDevice(registry, 'device-2');

  const challenge = attest.issueChallenge(registry, 'device-2', keys);
  const result = attest.verifyDevice(registry, 'device-2', challenge, keys.publicKey);

  assert.equal(result.signatureValid, true);
  assert.equal(result.fingerprintMatch, true);
  assert.equal(result.attested, true);
});

test('rejects verification for an unregistered device', () => {
  const registry = attest.createRegistry('test-app');
  const keys = signal.generateSigningKeys();
  const envelope = signal.sign(signal.compose('challenge:ghost'), keys.privateKey);
  const result = attest.verifyDevice(registry, 'ghost', envelope, keys.publicKey);
  assert.equal(result.attested, false);
  assert.equal(result.reason, 'Device not registered');
});

test('grants and checks access for an attested device', () => {
  const registry = attest.createRegistry('test-app');
  attest.registerDevice(registry, 'device-3');
  const result = attest.grantAndCheck(registry, 'device-3', 'account:settings', 'write', [
    { resource: 'account:settings', actions: ['write'] },
  ]);
  assert.equal(result.allowed, true);
});
