import { test } from 'node:test';
import assert from 'node:assert/strict';
import { keyring } from '../src/index.js';

test('creates a keyring with derived key material and an empty vault', () => {
  const kr = keyring.create('owner-1', 'a-strong-passphrase');
  assert.equal(kr.ownerId, 'owner-1');
  assert.ok(Buffer.isBuffer(kr.derived.key));
  assert.ok(kr.signingKeys.privateKey.includes('PRIVATE KEY'));
});

test('stores and retrieves a secret', () => {
  const kr = keyring.create('owner-2', 'a-strong-passphrase');
  keyring.storeSecret(kr, 'api-key', 'sk-12345');
  assert.equal(keyring.retrieveSecret(kr, 'api-key'), 'sk-12345');
});

test('seals and reopens a keyring vault', () => {
  const kr = keyring.create('owner-3', 'a-strong-passphrase');
  keyring.storeSecret(kr, 'token', 'abc');
  const sealed = keyring.seal(kr);
  const { vault } = keyring.open(sealed, 'a-strong-passphrase');
  assert.equal(vault.entries.get('token').value, 'abc');
});

test('signs and verifies a message', () => {
  const kr = keyring.create('owner-4', 'a-strong-passphrase');
  const signed = keyring.signMessage(kr, 'hello world');
  const result = keyring.verifyMessage(kr, signed);
  assert.equal(result.valid, true);
});

test('grants and checks scoped access', () => {
  const kr = keyring.create('owner-5', 'a-strong-passphrase');
  keyring.grantAccess(kr, 'ci-bot', 'deployer', [
    { resource: 'secrets:token', actions: ['read'] },
  ]);
  const result = keyring.checkAccess(kr, 'ci-bot', 'secrets:token', 'read');
  assert.equal(result.allowed, true);
});
