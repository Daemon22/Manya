/**
 * Comprehensive test suite for @manya/signal.
 * Uses the Node.js built-in test runner.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';

import {
  compose, seal, open, sign, verifySignature,
  hmac, verifyHmac, generateSigningKeys,
  signal,
} from '../src/index.js';

// ---------------------------------------------------------------------------
// compose
// ---------------------------------------------------------------------------

test('compose: creates envelope with all fields', () => {
  const env = compose('Hello, world!', {
    sender: 'alice',
    recipients: ['bob'],
    channel: 'general',
    priority: 'high',
    type: 'greeting',
    headers: { 'x-trace-id': '123' },
  });
  assert.ok(env.id, 'Should have an id');
  assert.equal(env.payload, 'Hello, world!');
  assert.equal(env.sender, 'alice');
  assert.deepEqual(env.recipients, ['bob']);
  assert.equal(env.channel, 'general');
  assert.equal(env.priority, 'high');
  assert.equal(env.type, 'greeting');
  assert.deepEqual(env.headers, { 'x-trace-id': '123' });
  assert.ok(env.createdAt);
  assert.equal(env.version, 1);
});

test('compose: uses defaults when no options are provided', () => {
  const env = compose('test payload');
  assert.equal(env.sender, 'anonymous');
  assert.deepEqual(env.recipients, []);
  assert.equal(env.channel, null);
  assert.equal(env.priority, 'normal');
  assert.equal(env.type, 'message');
  assert.deepEqual(env.headers, {});
});

test('compose: converts Buffer payload to base64', () => {
  const buf = Buffer.from('binary data here');
  const env = compose(buf);
  assert.equal(env.payload, buf.toString('base64'));
});

test('compose: throws when payload is missing', () => {
  assert.throws(() => compose(), /Payload is required/);
  assert.throws(() => compose(null), /Payload is required/);
  assert.throws(() => compose(''), /Payload is required/);
});

test('compose: generates unique ids for different envelopes', () => {
  const a = compose('msg-a');
  const b = compose('msg-b');
  assert.notEqual(a.id, b.id, 'Each envelope should have a unique id');
});

// ---------------------------------------------------------------------------
// seal + open
// ---------------------------------------------------------------------------

test('seal + open: roundtrip encryption preserves envelope', () => {
  const original = compose('Secret message', {
    sender: 'alice',
    recipients: ['bob'],
    priority: 'critical',
    type: 'alert',
  });
  const sealed = seal(original, 'my-secure-passphrase');
  assert.ok(Buffer.isBuffer(sealed), 'seal should return a Buffer');
  const { envelope, metadata } = open(sealed, 'my-secure-passphrase');
  assert.equal(envelope.id, original.id);
  assert.equal(envelope.payload, original.payload);
  assert.equal(envelope.sender, original.sender);
  assert.deepEqual(envelope.recipients, original.recipients);
  assert.equal(envelope.priority, original.priority);
  assert.equal(envelope.type, original.type);
  assert.equal(metadata.id, original.id);
  assert.equal(metadata.sender, original.sender);
  assert.equal(metadata.priority, 'critical');
  assert.equal(metadata.type, 'alert');
});

test('seal: throws on invalid envelope', () => {
  assert.throws(() => seal({}, 'passphrase123'), /Invalid envelope/);
  assert.throws(() => seal({ id: 'x' }, 'passphrase123'), /Invalid envelope/);
});

test('seal: throws on short passphrase', () => {
  const env = compose('test');
  assert.throws(() => seal(env, 'short'), /Passphrase must be at least 8 characters/);
});

test('open: throws on wrong passphrase', () => {
  const env = compose('secret stuff');
  const sealed = seal(env, 'correct-passphrase');
  assert.throws(() => open(sealed, 'wrong-passphrase'), /Failed to decrypt envelope/);
});

test('open: throws on corrupted data', () => {
  const env = compose('test data');
  const sealed = seal(env, 'valid-passphrase');
  // Corrupt the encrypted payload (last byte)
  const corrupted = Buffer.from(sealed);
  corrupted[corrupted.length - 1] ^= 0xff;
  assert.throws(() => open(corrupted, 'valid-passphrase'), /Failed to decrypt envelope/);
});

test('open: throws on invalid buffer', () => {
  assert.throws(() => open(Buffer.from('too-short'), 'passphrase123'), /Invalid sealed envelope buffer/);
  assert.throws(() => open('not a buffer', 'passphrase123'), /Invalid sealed envelope buffer/);
});

test('open: throws on invalid magic bytes', () => {
  const env = compose('test');
  const sealed = seal(env, 'passphrase123');
  // Overwrite magic bytes
  const badMagic = Buffer.from(sealed);
  badMagic.write('XXXXXXX', 0, 'utf8');
  assert.throws(() => open(badMagic, 'passphrase123'), /Invalid envelope magic bytes/);
});

// ---------------------------------------------------------------------------
// sign + verifySignature
// ---------------------------------------------------------------------------

test('sign + verifySignature: roundtrip signing validates correctly', () => {
  const keys = generateSigningKeys();
  const env = compose('Signed message', { sender: 'alice' });
  const signed = sign(env, keys.privateKey);
  assert.ok(signed.signature, 'Should have a signature');
  assert.equal(signed.signature.algorithm, 'RSA-SHA256');
  assert.ok(signed.signature.value, 'Should have a signature value');
  assert.ok(signed.signature.signedAt, 'Should have a signedAt timestamp');
  const result = verifySignature(signed, keys.publicKey);
  assert.equal(result.valid, true);
  assert.equal(result.algorithm, 'RSA-SHA256');
  assert.equal(result.signedAt, signed.signature.signedAt);
});

test('sign: preserves original envelope fields', () => {
  const keys = generateSigningKeys();
  const env = compose('preserve test', { sender: 'bob', priority: 'high' });
  const signed = sign(env, keys.privateKey);
  assert.equal(signed.id, env.id);
  assert.equal(signed.payload, env.payload);
  assert.equal(signed.sender, env.sender);
  assert.equal(signed.priority, env.priority);
});

test('sign: throws on invalid envelope', () => {
  const keys = generateSigningKeys();
  assert.throws(() => sign({}, keys.privateKey), /Invalid envelope/);
  assert.throws(() => sign(null, keys.privateKey), /Invalid envelope/);
});

test('sign: throws when private key is missing', () => {
  const env = compose('test');
  assert.throws(() => sign(env), /Private key is required/);
  assert.throws(() => sign(env, ''), /Private key is required/);
});

test('verifySignature: returns false with wrong public key', () => {
  const signingKeys = generateSigningKeys();
  const otherKeys = generateSigningKeys();
  const env = compose('tamper test', { sender: 'alice' });
  const signed = sign(env, signingKeys.privateKey);
  const result = verifySignature(signed, otherKeys.publicKey);
  assert.equal(result.valid, false);
});

test('verifySignature: returns false when envelope content is tampered', () => {
  const keys = generateSigningKeys();
  const env = compose('original content', { sender: 'alice' });
  const signed = sign(env, keys.privateKey);
  // Tamper with the payload
  signed.payload = 'tampered content';
  const result = verifySignature(signed, keys.publicKey);
  assert.equal(result.valid, false);
});

test('verifySignature: throws on envelope without signature', () => {
  const keys = generateSigningKeys();
  const env = compose('unsigned');
  assert.throws(() => verifySignature(env, keys.publicKey), /Envelope has no signature/);
});

test('verifySignature: throws when public key is missing', () => {
  const keys = generateSigningKeys();
  const env = compose('test');
  const signed = sign(env, keys.privateKey);
  assert.throws(() => verifySignature(signed), /Public key is required/);
});

// ---------------------------------------------------------------------------
// hmac + verifyHmac
// ---------------------------------------------------------------------------

test('hmac + verifyHmac: roundtrip HMAC validates correctly', () => {
  const secret = 'shared-hmac-secret-key';
  const env = compose('Integrity check', { sender: 'system' });
  const hmacEnv = hmac(env, secret);
  assert.ok(hmacEnv.hmac, 'Should have an hmac');
  assert.equal(hmacEnv.hmac.algorithm, 'HMAC-SHA256');
  assert.ok(hmacEnv.hmac.value, 'Should have an hmac value');
  const result = verifyHmac(hmacEnv, secret);
  assert.equal(result.valid, true);
  assert.equal(result.algorithm, 'HMAC-SHA256');
});

test('hmac: preserves original envelope fields', () => {
  const env = compose('hmac preserve', { sender: 'charlie', type: 'event' });
  const hmacEnv = hmac(env, 'my-secret');
  assert.equal(hmacEnv.id, env.id);
  assert.equal(hmacEnv.payload, env.payload);
  assert.equal(hmacEnv.sender, env.sender);
  assert.equal(hmacEnv.type, env.type);
});

test('verifyHmac: returns false with wrong secret', () => {
  const env = compose('hmac test');
  const hmacEnv = hmac(env, 'correct-secret');
  const result = verifyHmac(hmacEnv, 'wrong-secret');
  assert.equal(result.valid, false);
});

test('verifyHmac: returns false when content is tampered', () => {
  const env = compose('original hmac content');
  const hmacEnv = hmac(env, 'my-secret');
  hmacEnv.payload = 'tampered hmac content';
  const result = verifyHmac(hmacEnv, 'my-secret');
  assert.equal(result.valid, false);
});

test('hmac: throws on invalid envelope', () => {
  assert.throws(() => hmac({}, 'secret'), /Invalid envelope/);
  assert.throws(() => hmac(null, 'secret'), /Invalid envelope/);
});

test('hmac: throws when secret is missing', () => {
  const env = compose('test');
  assert.throws(() => hmac(env), /Secret is required/);
});

test('verifyHmac: throws on envelope without HMAC', () => {
  const env = compose('no hmac');
  assert.throws(() => verifyHmac(env, 'secret'), /Envelope has no HMAC/);
});

test('verifyHmac: throws when secret is missing', () => {
  const env = compose('test');
  const hmacEnv = hmac(env, 'some-secret');
  assert.throws(() => verifyHmac(hmacEnv), /Secret is required/);
});

// ---------------------------------------------------------------------------
// generateSigningKeys
// ---------------------------------------------------------------------------

test('generateSigningKeys: generates valid RSA key pair', () => {
  const keys = generateSigningKeys();
  assert.ok(keys.privateKey, 'Should have a private key');
  assert.ok(keys.publicKey, 'Should have a public key');
  assert.ok(keys.privateKey.includes('BEGIN PRIVATE KEY'), 'Private key should be PEM format');
  assert.ok(keys.publicKey.includes('BEGIN PUBLIC KEY'), 'Public key should be PEM format');
});

test('generateSigningKeys: respects modulusLength option', () => {
  const keys = generateSigningKeys({ modulusLength: 4096 });
  assert.ok(keys.privateKey, 'Should generate 4096-bit key');
  assert.ok(keys.publicKey, 'Should generate 4096-bit public key');
});

// ---------------------------------------------------------------------------
// signal unified API
// ---------------------------------------------------------------------------

test('signal: unified object exposes all methods', () => {
  assert.equal(typeof signal.compose, 'function');
  assert.equal(typeof signal.seal, 'function');
  assert.equal(typeof signal.open, 'function');
  assert.equal(typeof signal.sign, 'function');
  assert.equal(typeof signal.verifySignature, 'function');
  assert.equal(typeof signal.hmac, 'function');
  assert.equal(typeof signal.verifyHmac, 'function');
  assert.equal(typeof signal.generateSigningKeys, 'function');
});

// ---------------------------------------------------------------------------
// Integration scenarios
// ---------------------------------------------------------------------------

test('integration: Healthcare secure message workflow', () => {
  const keys = generateSigningKeys();
  const patientData = JSON.stringify({
    patientId: 'P-12345',
    vitals: { heartRate: 72, bloodPressure: '120/80' },
    note: 'Patient stable, continue monitoring.',
  });
  // Compose
  const env = compose(patientData, {
    sender: 'dr-smith@hospital',
    recipients: ['nurse-jones@hospital', 'cardiology@hospital'],
    channel: 'patient-alerts',
    priority: 'high',
    type: 'healthcare-record',
    headers: { 'hipaa-protected': 'true', 'department': 'cardiology' },
  });
  // Sign
  const signed = sign(env, keys.privateKey);
  // Seal
  const sealed = seal(signed, 'hospital-encryption-key');
  // ... transmit sealed buffer over the network ...
  // Open
  const { envelope } = open(sealed, 'hospital-encryption-key');
  // Verify signature
  const verification = verifySignature(envelope, keys.publicKey);
  assert.equal(verification.valid, true);
  assert.equal(envelope.type, 'healthcare-record');
  assert.equal(envelope.priority, 'high');
  assert.deepEqual(envelope.recipients, ['nurse-jones@hospital', 'cardiology@hospital']);
  assert.equal(envelope.headers['hipaa-protected'], 'true');
  // Verify payload is intact
  const parsed = JSON.parse(envelope.payload);
  assert.equal(parsed.patientId, 'P-12345');
  assert.equal(parsed.vitals.heartRate, 72);
});

test('integration: Finance trade signal workflow', () => {
  const tradeSecret = 'trading-desk-shared-secret';
  const tradeData = JSON.stringify({
    symbol: 'AAPL',
    action: 'BUY',
    quantity: 1000,
    priceLimit: 185.50,
    orderId: 'ORD-98765',
  });
  const env = compose(tradeData, {
    sender: 'algorithmic-trader-01',
    recipients: ['execution-engine'],
    channel: 'trade-signals',
    priority: 'critical',
    type: 'trade-signal',
    headers: { 'risk-level': 'medium', 'strategy': 'momentum' },
  });
  // HMAC for lightweight integrity
  const hmacEnv = hmac(env, tradeSecret);
  // Seal for encryption
  const sealed = seal(hmacEnv, 'finance-encryption-key');
  // Open
  const { envelope } = open(sealed, 'finance-encryption-key');
  // Verify HMAC
  const hmacResult = verifyHmac(envelope, tradeSecret);
  assert.equal(hmacResult.valid, true);
  assert.equal(envelope.priority, 'critical');
  assert.equal(envelope.type, 'trade-signal');
  const parsed = JSON.parse(envelope.payload);
  assert.equal(parsed.symbol, 'AAPL');
  assert.equal(parsed.action, 'BUY');
  assert.equal(parsed.quantity, 1000);
});

test('integration: IoT device command workflow', () => {
  const deviceSecret = 'iot-hub-secret-key';
  const command = JSON.stringify({
    deviceId: 'thermostat-living-room-01',
    command: 'set_temperature',
    params: { temperature: 22, unit: 'celsius' },
  });
  const env = compose(command, {
    sender: 'iot-hub',
    recipients: ['thermostat-living-room-01'],
    channel: 'device-commands',
    priority: 'normal',
    type: 'iot-command',
    headers: { 'qos': '1', 'retry': '3' },
  });
  // HMAC for lightweight device verification
  const hmacEnv = hmac(env, deviceSecret);
  // Seal
  const sealed = seal(hmacEnv, 'iot-network-key!!');
  // Open
  const { envelope, metadata } = open(sealed, 'iot-network-key!!');
  // Verify HMAC
  const hmacResult = verifyHmac(envelope, deviceSecret);
  assert.equal(hmacResult.valid, true);
  assert.equal(metadata.type, 'iot-command');
  assert.equal(envelope.sender, 'iot-hub');
  const parsed = JSON.parse(envelope.payload);
  assert.equal(parsed.command, 'set_temperature');
  assert.equal(parsed.params.temperature, 22);
});

test('integration: Team notification workflow with full pipeline', () => {
  const keys = generateSigningKeys();
  const teamSecret = 'team-shared-hmac-key';
  const notification = 'Deploy v2.5.0 to production — all hands stand by.';
  // Compose
  const env = compose(notification, {
    sender: 'devops-lead',
    recipients: ['engineering', 'sre-team'],
    channel: 'deployments',
    priority: 'high',
    type: 'team-notification',
    headers: { 'urgency': 'action-required' },
  });
  // Sign for non-repudiation
  const signed = sign(env, keys.privateKey);
  // HMAC for quick integrity check
  const hmacEnv = hmac(signed, teamSecret);
  // Seal
  const sealed = seal(hmacEnv, 'team-encryption-key');
  // ... transmit ...
  // Open
  const { envelope } = open(sealed, 'team-encryption-key');
  // Verify HMAC
  const hmacResult = verifyHmac(envelope, teamSecret);
  assert.equal(hmacResult.valid, true);
  // Verify signature
  const sigResult = verifySignature(envelope, keys.publicKey);
  assert.equal(sigResult.valid, true);
  assert.equal(envelope.sender, 'devops-lead');
  assert.equal(envelope.priority, 'high');
  assert.equal(envelope.payload, notification);
  assert.deepEqual(envelope.recipients, ['engineering', 'sre-team']);
});
