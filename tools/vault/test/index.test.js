/**
 * Comprehensive test suite for @manya/vault.
 * Uses the Node.js built-in test runner.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  create,
  put,
  get,
  del,
  keys,
  has,
  size,
  seal,
  open,
  inspect,
  search,
  vault,
} from '../src/index.js';

// ---------------------------------------------------------------------------
// create
// ---------------------------------------------------------------------------

test('create: creates a vault with the given name', () => {
  const v = create('test-vault');
  assert.equal(v.name, 'test-vault');
  assert.ok(v.entries instanceof Map);
  assert.equal(v.entries.size, 0);
  assert.equal(v.version, 1);
  assert.ok(v.createdAt);
});

test('create: throws if name is missing', () => {
  assert.throws(() => create(), /Vault name is required/);
  assert.throws(() => create(''), /Vault name is required/);
  assert.throws(() => create(123), /Vault name is required/);
});

// ---------------------------------------------------------------------------
// put
// ---------------------------------------------------------------------------

test('put: stores a string value', () => {
  const v = create('store-test');
  const result = put(v, 'secret-key', 'secret-value');
  assert.equal(result.key, 'secret-key');
  assert.ok(result.createdAt);
  assert.ok(result.updatedAt);
  assert.equal(get(v, 'secret-key'), 'secret-value');
});

test('put: stores an object value (deep clone)', () => {
  const v = create('obj-test');
  const obj = { host: 'db.example.com', port: 5432 };
  put(v, 'db-config', obj);
  // Mutating the original should not affect the stored value
  obj.port = 9999;
  assert.equal(get(v, 'db-config').port, 5432);
});

test('put: stores a Buffer value', () => {
  const v = create('buf-test');
  const buf = Buffer.from('binary-data');
  put(v, 'bin', buf);
  const stored = get(v, 'bin');
  assert.ok(Buffer.isBuffer(stored));
  assert.equal(stored.toString(), 'binary-data');
});

test('put: updates an existing entry and preserves createdAt', () => {
  const v = create('update-test');
  const r1 = put(v, 'key1', 'v1');
  // Ensure updatedAt is different by waiting at least 1ms
  const before = r1.updatedAt;
  // Manually set a different updatedAt to simulate a time gap
  const entry = v.entries.get('key1');
  entry.updatedAt = new Date(Date.now() + 1).toISOString();
  const r2 = put(v, 'key1', 'v2');
  assert.equal(r1.createdAt, r2.createdAt, 'createdAt should be preserved');
  assert.equal(get(v, 'key1'), 'v2', 'value should be updated');
  assert.ok(r2.updatedAt >= before, 'updatedAt should be updated');
});

test('put: accepts tags and metadata', () => {
  const v = create('tags-test');
  const result = put(v, 'api-key', 'abc123', {
    tags: ['production', 'api'],
    metadata: { service: 'stripe', rotated: false },
  });
  assert.deepEqual(result.tags, ['production', 'api']);
  assert.deepEqual(result.metadata, { service: 'stripe', rotated: false });
});

test('put: throws on invalid vault or key', () => {
  assert.throws(() => put(null, 'k', 'v'), /Invalid vault instance/);
  const v = create('x');
  assert.throws(() => put(v, '', 'v'), /Key must be a non-empty string/);
  assert.throws(() => put(v, 42, 'v'), /Key must be a non-empty string/);
});

// ---------------------------------------------------------------------------
// get
// ---------------------------------------------------------------------------

test('get: returns undefined for missing keys', () => {
  const v = create('get-test');
  assert.equal(get(v, 'nope'), undefined);
});

test('get: throws on invalid vault', () => {
  assert.throws(() => get({}, 'k'), /Invalid vault instance/);
});

// ---------------------------------------------------------------------------
// del
// ---------------------------------------------------------------------------

test('del: removes an entry and returns true', () => {
  const v = create('del-test');
  put(v, 'remove-me', 'gone');
  assert.equal(del(v, 'remove-me'), true);
  assert.equal(get(v, 'remove-me'), undefined);
});

test('del: returns false for missing keys', () => {
  const v = create('del-miss');
  assert.equal(del(v, 'ghost'), false);
});

// ---------------------------------------------------------------------------
// keys
// ---------------------------------------------------------------------------

test('keys: lists all keys in the vault', () => {
  const v = create('keys-test');
  put(v, 'a', '1');
  put(v, 'b', '2');
  put(v, 'c', '3');
  assert.deepEqual(keys(v).sort(), ['a', 'b', 'c']);
});

// ---------------------------------------------------------------------------
// has
// ---------------------------------------------------------------------------

test('has: returns true for existing keys and false otherwise', () => {
  const v = create('has-test');
  put(v, 'exists', 'yes');
  assert.equal(has(v, 'exists'), true);
  assert.equal(has(v, 'missing'), false);
});

// ---------------------------------------------------------------------------
// size
// ---------------------------------------------------------------------------

test('size: returns the correct entry count', () => {
  const v = create('size-test');
  assert.equal(size(v), 0);
  put(v, 'a', '1');
  assert.equal(size(v), 1);
  put(v, 'b', '2');
  assert.equal(size(v), 2);
  del(v, 'a');
  assert.equal(size(v), 1);
});

// ---------------------------------------------------------------------------
// seal + open
// ---------------------------------------------------------------------------

test('seal + open: roundtrip encryption and decryption', () => {
  const v = create('roundtrip');
  put(v, 'db-password', 'super-secret-123', { tags: ['database'], metadata: { env: 'prod' } });
  put(v, 'api-token', 'tok_abc', { tags: ['api', 'production'] });

  const sealed = seal(v, 'correct-passphrase');
  assert.ok(Buffer.isBuffer(sealed));
  assert.ok(sealed.length > 51); // minimum header size

  const { vault: reopened, metadata } = open(sealed, 'correct-passphrase');
  assert.equal(reopened.name, 'roundtrip');
  assert.equal(get(reopened, 'db-password'), 'super-secret-123');
  assert.equal(get(reopened, 'api-token'), 'tok_abc');
  assert.equal(metadata.entryCount, 2);
  assert.equal(metadata.name, 'roundtrip');
});

test('seal + open: wrong passphrase throws decryption error', () => {
  const v = create('wrong-pass');
  put(v, 'secret', 'classified');
  const sealed = seal(v, 'right-passphrase');
  assert.throws(() => open(sealed, 'wrong-passphrase'), /Failed to decrypt vault/);
});

test('seal + open: corrupted buffer throws error', () => {
  assert.throws(() => open(Buffer.from('garbage-data-here'), 'somepass12'), /Invalid/);
});

test('seal + open: truncated buffer throws error', () => {
  const shortBuf = Buffer.alloc(10);
  assert.throws(() => open(shortBuf, 'somepass12'), /Invalid sealed vault buffer/);
});

test('seal + open: bad magic bytes throws error', () => {
  const v = create('bad-magic');
  put(v, 'k', 'v');
  const sealed = seal(v, 'passphrase1');
  // Corrupt the magic bytes
  sealed[0] = 0x00;
  assert.throws(() => open(sealed, 'passphrase1'), /Invalid vault magic bytes/);
});

test('seal: throws on short passphrase', () => {
  const v = create('short-pass');
  assert.throws(() => seal(v, 'short'), /Passphrase must be at least 8 characters/);
});

test('open: throws on short passphrase', () => {
  const v = create('short-open');
  put(v, 'k', 'v');
  const sealed = seal(v, 'long-enough-pass');
  assert.throws(() => open(sealed, 'short'), /Passphrase must be at least 8 characters/);
});

// ---------------------------------------------------------------------------
// inspect
// ---------------------------------------------------------------------------

test('inspect: returns metadata without the value', () => {
  const v = create('inspect-test');
  put(v, 'api-key', 'sk_live_123', { tags: ['api'], metadata: { env: 'prod' } });
  const info = inspect(v, 'api-key');
  assert.equal(info.key, 'api-key');
  assert.equal(info.tags.length, 1);
  assert.deepEqual(info.metadata, { env: 'prod' });
  // Ensure 'value' is not in the returned object
  assert.equal('value' in info, false);
});

test('inspect: returns undefined for missing keys', () => {
  const v = create('inspect-miss');
  assert.equal(inspect(v, 'ghost'), undefined);
});

// ---------------------------------------------------------------------------
// search
// ---------------------------------------------------------------------------

test('search: finds entries matching any tag', () => {
  const v = create('search-test');
  put(v, 'db-pass', 'secret1', { tags: ['database', 'prod'] });
  put(v, 'api-key', 'secret2', { tags: ['api', 'prod'] });
  put(v, 'ssh-key', 'secret3', { tags: ['ssh', 'dev'] });

  const results = search(v, ['prod']);
  assert.equal(results.length, 2);
  assert.ok(results.some(r => r.key === 'db-pass'));
  assert.ok(results.some(r => r.key === 'api-key'));
});

test('search: matches multiple tags (OR logic)', () => {
  const v = create('search-multi');
  put(v, 'a', '1', { tags: ['database'] });
  put(v, 'b', '2', { tags: ['api'] });
  put(v, 'c', '3', { tags: ['ssh'] });

  const results = search(v, ['database', 'ssh']);
  assert.equal(results.length, 2);
  assert.ok(results.some(r => r.key === 'a'));
  assert.ok(results.some(r => r.key === 'c'));
});

test('search: throws on invalid tags argument', () => {
  const v = create('search-err');
  assert.throws(() => search(v, 'not-array'), /Tags must be a non-empty array/);
  assert.throws(() => search(v, []), /Tags must be a non-empty array/);
});

// ---------------------------------------------------------------------------
// vault unified API
// ---------------------------------------------------------------------------

test('vault: unified object exposes all methods', () => {
  assert.equal(typeof vault.create, 'function');
  assert.equal(typeof vault.put, 'function');
  assert.equal(typeof vault.get, 'function');
  assert.equal(typeof vault.del, 'function');
  assert.equal(typeof vault.keys, 'function');
  assert.equal(typeof vault.has, 'function');
  assert.equal(typeof vault.size, 'function');
  assert.equal(typeof vault.seal, 'function');
  assert.equal(typeof vault.open, 'function');
  assert.equal(typeof vault.inspect, 'function');
  assert.equal(typeof vault.search, 'function');
});

test('vault: default export works as a unified API', () => {
  const v = vault.create('unified-test');
  vault.put(v, 'key1', 'val1', { tags: ['test'] });
  assert.equal(vault.get(v, 'key1'), 'val1');
  assert.equal(vault.has(v, 'key1'), true);
  assert.equal(vault.size(v), 1);
  assert.deepEqual(vault.keys(v), ['key1']);
  const info = vault.inspect(v, 'key1');
  assert.equal(info.key, 'key1');
  const results = vault.search(v, ['test']);
  assert.equal(results.length, 1);
  assert.equal(vault.del(v, 'key1'), true);
  assert.equal(vault.size(v), 0);
});

// ---------------------------------------------------------------------------
// Integration: Industry-specific scenarios
// ---------------------------------------------------------------------------

test('integration: DevOps secrets management', () => {
  const v = create('devops-vault');
  // Store CI/CD secrets
  put(v, 'github-token', 'ghp_xxxxxxxxxxxx', { tags: ['ci', 'github'], metadata: { team: 'platform', expires: '2025-12-01' } });
  put(v, 'docker-registry', 'drc_token_yyyyy', { tags: ['ci', 'docker'], metadata: { team: 'platform' } });
  put(v, 'aws-access-key', 'AKIAZZZZZZZZZZZZZZZZ', { tags: ['cloud', 'aws'], metadata: { team: 'infra', region: 'us-east-1' } });
  put(v, 'kube-config', { cluster: 'prod-us', context: 'admin' }, { tags: ['k8s', 'prod'], metadata: { team: 'sre' } });

  // Seal and reopen
  const sealed = seal(v, 'devops-master-key-2024');
  const { vault: reopened } = open(sealed, 'devops-master-key-2024');

  // Verify all secrets
  assert.equal(get(reopened, 'github-token'), 'ghp_xxxxxxxxxxxx');
  assert.equal(get(reopened, 'aws-access-key'), 'AKIAZZZZZZZZZZZZZZZZ');
  assert.deepEqual(get(reopened, 'kube-config'), { cluster: 'prod-us', context: 'admin' });

  // Search by tag
  const ciSecrets = search(reopened, ['ci']);
  assert.equal(ciSecrets.length, 2);

  // Inspect without revealing value
  const info = inspect(reopened, 'aws-access-key');
  assert.equal(info.metadata.region, 'us-east-1');
  assert.equal('value' in info, false);
});

test('integration: Healthcare configuration management (HIPAA)', () => {
  const v = create('healthcare-vault');
  // Store FHIR endpoint configs and HL7 credentials
  put(v, 'fhir-endpoint', { url: 'https://fhir.hospital.org', version: 'R4' }, { tags: ['fhir', 'api'], metadata: { compliance: 'hipaa', dept: 'informatics' } });
  put(v, 'hl7-credentials', { username: 'hl7_service', system: 'Epic' }, { tags: ['hl7', 'prod'], metadata: { compliance: 'hipaa', dept: 'integration' } });
  put(v, 'db-connection', { host: '10.0.1.50', port: 5432, ssl: true }, { tags: ['database', 'phi'], metadata: { compliance: 'hipaa', encryption: 'aes-256' } });

  // Seal with strong passphrase
  const sealed = seal(v, 'hipaa-compliance-2024!');

  // Reopen and verify
  const { vault: reopened, metadata } = open(sealed, 'hipaa-compliance-2024!');
  assert.equal(metadata.entryCount, 3);
  assert.equal(get(reopened, 'fhir-endpoint').version, 'R4');
  assert.equal(get(reopened, 'db-connection').ssl, true);

  // All entries should be HIPAA tagged
  const hipaaEntries = search(reopened, ['phi', 'fhir', 'hl7']);
  assert.equal(hipaaEntries.length, 3);
});

test('integration: Financial credentials management (PCI-DSS)', () => {
  const v = create('finance-vault');
  // Store payment gateway and banking credentials
  put(v, 'stripe-live-key', 'sk_live_51xxxxxxxxxxxx', { tags: ['payment', 'stripe', 'prod'], metadata: { pci: true, rotated: '2024-06-01' } });
  put(v, 'plaid-client-id', 'abc123def456', { tags: ['banking', 'plaid'], metadata: { pci: false, env: 'production' } });
  put(v, 'vault-master-key', { algorithm: 'aes-256-gcm', keyId: 'mk-001' }, { tags: ['encryption', 'hsm'], metadata: { pci: true, hsm: 'thales' } });
  put(v, 'kms-api-key', 'kms_key_zzzzz', { tags: ['cloud', 'kms'], metadata: { pci: true, provider: 'aws' } });

  // Seal
  const sealed = seal(v, 'pci-dss-master-2024!');

  // Reopen
  const { vault: reopened } = open(sealed, 'pci-dss-master-2024!');

  // Verify PCI-scoped entries
  const pciEntries = search(reopened, ['payment', 'encryption', 'kms']);
  assert.equal(pciEntries.length, 3);

  // Inspect metadata without exposing values
  const stripeInfo = inspect(reopened, 'stripe-live-key');
  assert.equal(stripeInfo.metadata.pci, true);
  assert.equal(stripeInfo.tags.includes('prod'), true);
  assert.equal('value' in stripeInfo, false);

  // Verify all keys
  assert.deepEqual(keys(reopened).sort(), ['kms-api-key', 'plaid-client-id', 'stripe-live-key', 'vault-master-key']);
});
