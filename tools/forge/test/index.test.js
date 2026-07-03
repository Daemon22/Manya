/**
 * Comprehensive test suite for @manya/forge.
 * Uses the Node.js built-in test runner.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';

import {
  scorePassphrase,
  deriveKeyPair,
  deriveKeyPairAsync,
  rotateKey,
  hash,
  hashWithSalt,
  timingSafeEqual,
  timingSafeCompare,
  forge,
} from '../src/index.js';

// ---------------------------------------------------------------------------
// scorePassphrase
// ---------------------------------------------------------------------------

test('scorePassphrase: weak password scores low and is classified as weak', () => {
  const result = scorePassphrase('password');
  assert.ok(result.score <= 20, `Expected score <= 20, got ${result.score}`);
  assert.equal(result.level, 'weak');
  assert.equal(result.checks.noCommonPattern, false);
  assert.ok(result.suggestions.length > 0, 'Should have improvement suggestions');
});

test('scorePassphrase: strong password scores high and is classified as strong or excellent', () => {
  const result = scorePassphrase('K#9m$Xv2!pL@nQ8rZ5w');
  assert.ok(result.score >= 60, `Expected score >= 60, got ${result.score}`);
  assert.ok(['strong', 'excellent'].includes(result.level));
  assert.equal(result.checks.length, true);
  assert.equal(result.checks.uppercase, true);
  assert.equal(result.checks.lowercase, true);
  assert.equal(result.checks.numbers, true);
  assert.equal(result.checks.symbols, true);
  assert.equal(result.checks.noCommonPattern, true);
  assert.equal(result.checks.noRepeatedChars, true);
});

test('scorePassphrase: all checks are correct for a mixed passphrase', () => {
  const result = scorePassphrase('Zephyr49!');
  assert.equal(result.checks.lowercase, true);
  assert.equal(result.checks.uppercase, true);
  assert.equal(result.checks.numbers, true);
  assert.equal(result.checks.symbols, true);
  assert.equal(result.checks.length, false); // only 9 chars
  assert.equal(result.checks.noCommonPattern, true);
  assert.equal(result.checks.noRepeatedChars, true);
});

test('scorePassphrase: entropy is calculated and positive for non-empty passphrase', () => {
  const result = scorePassphrase('Ab1!');
  assert.ok(result.entropy > 0, 'Entropy should be positive');
  assert.ok(result.crackTimeSeconds > 0, 'crackTimeSeconds should be positive');
  assert.ok(typeof result.crackTime === 'string' && result.crackTime.length > 0);
});

test('scorePassphrase: common pattern "123456" is flagged', () => {
  const result = scorePassphrase('123456');
  assert.equal(result.checks.noCommonPattern, false);
  assert.ok(result.score <= 20, 'Common patterns should yield low scores');
  assert.ok(result.suggestions.some((s) => s.includes('common')), 'Should suggest avoiding common patterns');
});

test('scorePassphrase: repeated chars are flagged', () => {
  const result = scorePassphrase('aaaa1234!@#Q');
  assert.equal(result.checks.noRepeatedChars, false);
  assert.ok(result.suggestions.some((s) => s.includes('repeating')), 'Should suggest avoiding repeated chars');
});

// ---------------------------------------------------------------------------
// deriveKeyPair
// ---------------------------------------------------------------------------

test('deriveKeyPair: produces a 32-byte key', () => {
  const result = deriveKeyPair('my-secret-passphrase');
  assert.equal(result.key.length, 32);
  assert.equal(result.salt.length, 16);
  assert.equal(result.iterations, 600_000);
  assert.ok(result.derivedAt);
});

test('deriveKeyPair: different salts produce different keys', () => {
  const salt1 = randomBytes(16);
  const salt2 = randomBytes(16);
  const a = deriveKeyPair('same-passphrase', salt1);
  const b = deriveKeyPair('same-passphrase', salt2);
  assert.ok(!a.key.equals(b.key), 'Different salts must yield different keys');
});

test('deriveKeyPair: same passphrase and salt produce the same key', () => {
  const salt = randomBytes(16);
  const a = deriveKeyPair('repeatable', salt);
  const b = deriveKeyPair('repeatable', salt);
  assert.ok(a.key.equals(b.key), 'Same inputs must yield the same key');
});

// ---------------------------------------------------------------------------
// deriveKeyPairAsync
// ---------------------------------------------------------------------------

test('deriveKeyPairAsync: produces the same result as sync version', async () => {
  const salt = randomBytes(16);
  const sync = deriveKeyPair('async-test', salt);
  const async = await deriveKeyPairAsync('async-test', salt);
  assert.ok(sync.key.equals(async.key), 'Async key should match sync key');
  assert.equal(async.salt.length, 16);
  assert.equal(async.iterations, 600_000);
});

// ---------------------------------------------------------------------------
// rotateKey
// ---------------------------------------------------------------------------

test('rotateKey: produces both old and new keys from the same salt', () => {
  const salt = randomBytes(16);
  const result = rotateKey('old-pass', 'new-pass', salt);
  assert.equal(result.oldKey.length, 32);
  assert.equal(result.newKey.length, 32);
  assert.ok(!result.oldKey.equals(result.newKey), 'Old and new keys must differ');
  assert.ok(result.salt.equals(salt), 'Salt should be returned unchanged');
});

test('rotateKey: old key matches deriveKeyPair with same inputs', () => {
  const salt = randomBytes(16);
  const rotated = rotateKey('old-pass', 'new-pass', salt);
  const derived = deriveKeyPair('old-pass', salt);
  assert.ok(rotated.oldKey.equals(derived.key), 'Rotated old key should match derived key');
});

// ---------------------------------------------------------------------------
// hash
// ---------------------------------------------------------------------------

test('hash: works for all supported algorithms', () => {
  const algorithms = ['sha256', 'sha384', 'sha512', 'sha3-256', 'sha3-512', 'blake2b512'];
  const data = Buffer.from('forge-hash-test');
  for (const algo of algorithms) {
    const result = hash(data, algo);
    assert.equal(result.algorithm, algo);
    assert.ok(result.digest.length > 0, `${algo} should produce a digest`);
    assert.equal(result.length, result.digest.length / 2, 'Length should match hex digest / 2');
  }
});

test('hash: throws on unsupported algorithm', () => {
  assert.throws(() => hash(Buffer.from('x'), 'md5'), /Unsupported algorithm/);
});

test('hash: produces deterministic results', () => {
  const data = Buffer.from('deterministic');
  const a = hash(data, 'sha256');
  const b = hash(data, 'sha256');
  assert.equal(a.digest, b.digest);
});

// ---------------------------------------------------------------------------
// hashWithSalt
// ---------------------------------------------------------------------------

test('hashWithSalt: includes salt in the result', () => {
  const data = Buffer.from('salted-hash-test');
  const result = hashWithSalt(data, 'sha256');
  assert.ok(result.salt, 'Should include salt');
  assert.ok(result.digest, 'Should include digest');
  assert.equal(result.algorithm, 'sha256');
  assert.equal(result.length, 32);
});

test('hashWithSalt: different salts produce different hashes for same data', () => {
  const data = Buffer.from('same-data');
  const s1 = randomBytes(16);
  const s2 = randomBytes(16);
  const a = hashWithSalt(data, 'sha256', s1);
  const b = hashWithSalt(data, 'sha256', s2);
  assert.notEqual(a.digest, b.digest, 'Different salts must yield different digests');
});

test('hashWithSalt: same salt produces same hash', () => {
  const data = Buffer.from('same-data');
  const salt = randomBytes(16);
  const a = hashWithSalt(data, 'sha256', salt);
  const b = hashWithSalt(data, 'sha256', salt);
  assert.equal(a.digest, b.digest);
  assert.equal(a.salt, b.salt);
});

// ---------------------------------------------------------------------------
// timingSafeEqual
// ---------------------------------------------------------------------------

test('timingSafeEqual: returns true for identical buffers', () => {
  const buf = Buffer.from('match');
  assert.equal(timingSafeEqual(buf, buf), true);
});

test('timingSafeEqual: returns false for different buffers of same length', () => {
  const a = Buffer.from('aaaaa');
  const b = Buffer.from('bbbbb');
  assert.equal(timingSafeEqual(a, b), false);
});

test('timingSafeEqual: returns false for different-length buffers', () => {
  const a = Buffer.from('short');
  const b = Buffer.from('longer-buffer');
  assert.equal(timingSafeEqual(a, b), false);
});

// ---------------------------------------------------------------------------
// timingSafeCompare
// ---------------------------------------------------------------------------

test('timingSafeCompare: returns true for identical strings', () => {
  assert.equal(timingSafeCompare('hello', 'hello'), true);
});

test('timingSafeCompare: returns false for different strings', () => {
  assert.equal(timingSafeCompare('hello', 'world'), false);
});

// ---------------------------------------------------------------------------
// forge unified object
// ---------------------------------------------------------------------------

test('forge: unified object exposes all methods', () => {
  assert.equal(typeof forge.strength, 'function');
  assert.equal(typeof forge.derive, 'function');
  assert.equal(typeof forge.deriveAsync, 'function');
  assert.equal(typeof forge.rotateKey, 'function');
  assert.equal(typeof forge.hash, 'function');
  assert.equal(typeof forge.hashWithSalt, 'function');
  assert.equal(typeof forge.timingSafeEqual, 'function');
  assert.equal(typeof forge.timingSafeCompare, 'function');
});

test('forge: default export works as a unified API', () => {
  // Use the forge object to exercise the full pipeline
  const strength = forge.strength('Test!1234');
  assert.ok(typeof strength.score === 'number');

  const salt = randomBytes(16);
  const derived = forge.derive('test', salt, 1000); // low iterations for speed
  assert.equal(derived.key.length, 32);

  const hashed = forge.hash(Buffer.from('hello'), 'sha256');
  assert.ok(hashed.digest.length > 0);

  assert.equal(forge.timingSafeCompare('abc', 'abc'), true);
});
