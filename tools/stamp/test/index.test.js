/**
 * Comprehensive test suite for @manya/stamp
 * Tests tamper-proof timestamping, audit trails, and provenance chains.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import {
  stamp,
  verify,
  chainEntry,
  buildChain,
  verifyChain,
  audit,
  buildTrail,
  verifyTrail,
  stampApi,
} from '../src/index.js';

// ─── stamp() ────────────────────────────────────────────────────────────────

describe('stamp()', () => {
  it('creates a proof with correct structure', () => {
    const data = Buffer.from('hello world');
    const proof = stamp(data);
    assert.equal(typeof proof.hash, 'string');
    assert.equal(proof.hash.length, 64); // sha256 hex
    assert.equal(proof.algorithm, 'sha256');
    assert.equal(typeof proof.timestamp, 'string');
    assert.ok(Date.parse(proof.timestamp) > 0);
    assert.equal(typeof proof.nonce, 'string');
    assert.equal(proof.issuer, 'manya');
    assert.equal(proof.version, 1);
  });

  it('uses a custom algorithm when specified', () => {
    const data = Buffer.from('test data');
    const proof = stamp(data, { algorithm: 'sha512' });
    assert.equal(proof.algorithm, 'sha512');
    assert.equal(proof.hash.length, 128); // sha512 hex
  });

  it('uses a custom issuer when specified', () => {
    const data = Buffer.from('test data');
    const proof = stamp(data, { issuer: 'acme-corp' });
    assert.equal(proof.issuer, 'acme-corp');
  });

  it('uses a custom nonce when specified', () => {
    const data = Buffer.from('test data');
    const nonce = 'my-custom-nonce-1234';
    const proof = stamp(data, { nonce });
    assert.equal(proof.nonce, nonce);
    // Verify the hash is deterministic with known nonce
    const expectedHash = createHash('sha256').update(data).update(nonce).digest('hex');
    assert.equal(proof.hash, expectedHash);
  });

  it('throws on empty buffer', () => {
    assert.throws(() => stamp(Buffer.alloc(0)), /non-empty Buffer/);
  });

  it('throws on non-buffer input', () => {
    assert.throws(() => stamp('not a buffer'), /non-empty Buffer/);
    assert.throws(() => stamp(null), /non-empty Buffer/);
    assert.throws(() => stamp(undefined), /non-empty Buffer/);
  });
});

// ─── verify() ───────────────────────────────────────────────────────────────

describe('verify()', () => {
  it('returns valid=true for matching data', () => {
    const data = Buffer.from('verify me');
    const proof = stamp(data);
    const result = verify(proof, data);
    assert.equal(result.valid, true);
    assert.equal(result.hash, proof.hash);
    assert.equal(result.expectedHash, proof.hash);
    assert.equal(result.timestamp, proof.timestamp);
  });

  it('returns valid=false for tampered data', () => {
    const data = Buffer.from('original data');
    const proof = stamp(data);
    const tampered = Buffer.from('tampered data');
    const result = verify(proof, tampered);
    assert.equal(result.valid, false);
    assert.equal(result.hash, proof.hash);
    assert.notEqual(result.expectedHash, proof.hash);
  });

  it('throws on invalid proof (missing fields)', () => {
    const data = Buffer.from('test');
    assert.throws(() => verify({}, data), /missing required fields/);
    assert.throws(() => verify({ hash: 'abc' }, data), /missing required fields/);
    assert.throws(() => verify(null, data), /missing required fields/);
  });

  it('throws on empty buffer data', () => {
    const data = Buffer.from('test');
    const proof = stamp(data);
    assert.throws(() => verify(proof, Buffer.alloc(0)), /non-empty Buffer/);
  });

  it('verifies deterministically with known nonce', () => {
    const data = Buffer.from('deterministic');
    const nonce = 'fixed-nonce-for-test';
    const proof = stamp(data, { nonce });
    const result = verify(proof, data);
    assert.equal(result.valid, true);
    // Re-stamping with same nonce produces same hash
    const proof2 = stamp(data, { nonce });
    assert.equal(proof.hash, proof2.hash);
  });
});

// ─── chainEntry() ───────────────────────────────────────────────────────────

describe('chainEntry()', () => {
  it('creates a genesis entry with null previousHash', () => {
    const data = Buffer.from('genesis');
    const entry = chainEntry(data);
    assert.equal(entry.previousHash, null);
    assert.equal(entry.index, 0); // default before caller sets
    assert.equal(typeof entry.hash, 'string');
    assert.equal(entry.hash.length, 64);
    assert.equal(typeof entry.nonce, 'string');
    assert.equal(entry.label, null);
    assert.deepEqual(entry.metadata, {});
  });

  it('creates an entry linked to a previous hash', () => {
    const data = Buffer.from('second entry');
    const prevHash = 'abcdef1234567890'.repeat(4);
    const entry = chainEntry(data, prevHash);
    assert.equal(entry.previousHash, prevHash);
  });

  it('includes label and metadata when provided', () => {
    const data = Buffer.from('labeled entry');
    const entry = chainEntry(data, null, {
      label: 'contract-v1',
      metadata: { department: 'legal', priority: 'high' },
    });
    assert.equal(entry.label, 'contract-v1');
    assert.deepEqual(entry.metadata, { department: 'legal', priority: 'high' });
  });

  it('throws on non-buffer data', () => {
    assert.throws(() => chainEntry('not buffer'), /non-empty Buffer/);
  });
});

// ─── buildChain() ───────────────────────────────────────────────────────────

describe('buildChain()', () => {
  it('creates a chain with correct linking', () => {
    const entries = [
      { data: Buffer.from('entry-1'), label: 'first' },
      { data: Buffer.from('entry-2'), label: 'second' },
      { data: Buffer.from('entry-3'), label: 'third' },
    ];
    const chain = buildChain(entries);
    assert.equal(chain.name, 'manya-chain');
    assert.equal(chain.algorithm, 'sha256');
    assert.equal(chain.entries.length, 3);
    assert.equal(typeof chain.rootHash, 'string');
    assert.equal(chain.rootHash, chain.entries[2].hash);
  });

  it('each entry has correct previousHash linking', () => {
    const entries = [
      { data: Buffer.from('a') },
      { data: Buffer.from('b') },
      { data: Buffer.from('c') },
    ];
    const chain = buildChain(entries);
    // Genesis entry
    assert.equal(chain.entries[0].previousHash, null);
    // Each subsequent entry links to previous
    assert.equal(chain.entries[1].previousHash, chain.entries[0].hash);
    assert.equal(chain.entries[2].previousHash, chain.entries[1].hash);
  });

  it('sets correct indices on entries', () => {
    const entries = [
      { data: Buffer.from('a') },
      { data: Buffer.from('b') },
      { data: Buffer.from('c') },
    ];
    const chain = buildChain(entries);
    for (let i = 0; i < chain.entries.length; i++) {
      assert.equal(chain.entries[i].index, i);
    }
  });

  it('accepts a custom chain name', () => {
    const chain = buildChain(
      [{ data: Buffer.from('a') }],
      { name: 'legal-custody-chain' },
    );
    assert.equal(chain.name, 'legal-custody-chain');
  });

  it('throws on empty array', () => {
    assert.throws(() => buildChain([]), /non-empty array/);
  });

  it('throws on entry without buffer data', () => {
    assert.throws(() => buildChain([{ data: 'not a buffer' }]), /non-empty Buffer/);
  });
});

// ─── verifyChain() ──────────────────────────────────────────────────────────

describe('verifyChain()', () => {
  it('validates a correct chain', () => {
    const entries = [
      { data: Buffer.from('x') },
      { data: Buffer.from('y') },
      { data: Buffer.from('z') },
    ];
    const chain = buildChain(entries);
    const result = verifyChain(chain);
    assert.equal(result.valid, true);
    assert.equal(result.brokenAt, null);
    assert.deepEqual(result.errors, []);
  });

  it('detects a modified chain (broken link)', () => {
    const entries = [
      { data: Buffer.from('x') },
      { data: Buffer.from('y') },
      { data: Buffer.from('z') },
    ];
    const chain = buildChain(entries);
    // Tamper with entry 1's hash
    chain.entries[0].hash = 'tamperedhash';
    const result = verifyChain(chain);
    assert.equal(result.valid, false);
    assert.equal(result.brokenAt, 1); // break detected at entry 1
    assert.ok(result.errors.length > 0);
  });

  it('detects incorrect indices', () => {
    const entries = [
      { data: Buffer.from('a') },
      { data: Buffer.from('b') },
    ];
    const chain = buildChain(entries);
    chain.entries[0].index = 99;
    const result = verifyChain(chain);
    assert.equal(result.valid, false);
    assert.equal(result.brokenAt, 0);
  });

  it('returns invalid for empty/null chain', () => {
    const result1 = verifyChain(null);
    assert.equal(result1.valid, false);
    const result2 = verifyChain({ entries: [] });
    assert.equal(result2.valid, false);
  });
});

// ─── audit() ────────────────────────────────────────────────────────────────

describe('audit()', () => {
  it('creates a record with correct structure', () => {
    const record = audit('user.login');
    assert.equal(typeof record.id, 'string');
    assert.equal(record.id.length, 24); // 12 bytes hex
    assert.equal(record.event, 'user.login');
    assert.equal(record.actor, 'unknown');
    assert.equal(record.resource, '');
    assert.equal(record.action, 'user.login');
    assert.deepEqual(record.metadata, {});
    assert.equal(typeof record.timestamp, 'string');
    assert.ok(Date.parse(record.timestamp) > 0);
    assert.equal(typeof record.hash, 'string');
    assert.equal(record.hash.length, 64);
    assert.equal(record.previousHash, null);
    assert.equal(record.version, 1);
  });

  it('includes actor, resource, and action', () => {
    const record = audit('document.update', {
      actor: 'alice@example.com',
      resource: 'doc-123',
      action: 'update',
      metadata: { field: 'status', oldValue: 'draft', newValue: 'published' },
    });
    assert.equal(record.actor, 'alice@example.com');
    assert.equal(record.resource, 'doc-123');
    assert.equal(record.action, 'update');
    assert.deepEqual(record.metadata, { field: 'status', oldValue: 'draft', newValue: 'published' });
  });

  it('includes previousHash for chaining', () => {
    const record = audit('test.event', { previousHash: 'prevhash123' });
    assert.equal(record.previousHash, 'prevhash123');
  });

  it('throws on missing or invalid event name', () => {
    assert.throws(() => audit(''), /required and must be a string/);
    assert.throws(() => audit(null), /required and must be a string/);
    assert.throws(() => audit(123), /required and must be a string/);
  });

  it('produces a deterministic hash for same inputs', () => {
    // While IDs are random, we can verify the hash is computed from the payload
    const record = audit('test');
    const payload = JSON.stringify({
      id: record.id, event: record.event, actor: record.actor,
      resource: record.resource, action: record.action,
      metadata: record.metadata, timestamp: record.timestamp,
      previousHash: record.previousHash,
    });
    const expectedHash = createHash('sha256').update(payload).digest('hex');
    assert.equal(record.hash, expectedHash);
  });
});

// ─── buildTrail() ───────────────────────────────────────────────────────────

describe('buildTrail()', () => {
  it('creates a linked audit trail', () => {
    const events = [
      { event: 'doc.create', actor: 'alice', resource: 'doc-1' },
      { event: 'doc.update', actor: 'bob', resource: 'doc-1' },
      { event: 'doc.delete', actor: 'alice', resource: 'doc-1' },
    ];
    const result = buildTrail(events);
    assert.equal(result.trail.length, 3);
    assert.equal(result.verified, true);
  });

  it('all records are linked correctly via previousHash', () => {
    const events = [
      { event: 'step1' },
      { event: 'step2' },
      { event: 'step3' },
    ];
    const result = buildTrail(events);
    assert.equal(result.trail[0].previousHash, null);
    assert.equal(result.trail[1].previousHash, result.trail[0].hash);
    assert.equal(result.trail[2].previousHash, result.trail[1].hash);
  });

  it('throws on empty events array', () => {
    assert.throws(() => buildTrail([]), /non-empty array/);
  });
});

// ─── verifyTrail() ──────────────────────────────────────────────────────────

describe('verifyTrail()', () => {
  it('validates a correct trail', () => {
    const events = [
      { event: 'login', actor: 'user1' },
      { event: 'upload', actor: 'user1' },
      { event: 'logout', actor: 'user1' },
    ];
    const trail = buildTrail(events);
    const result = verifyTrail(trail);
    assert.equal(result.valid, true);
    assert.equal(result.brokenAt, null);
    assert.deepEqual(result.errors, []);
  });

  it('detects tampered trail (broken hash)', () => {
    const events = [
      { event: 'login', actor: 'user1' },
      { event: 'upload', actor: 'user1' },
    ];
    const trail = buildTrail(events);
    // Tamper with record hash
    trail.trail[0].hash = 'tamperedhash';
    const result = verifyTrail(trail);
    assert.equal(result.valid, false);
    assert.ok(result.errors.length > 0);
  });

  it('detects tampered trail (broken previousHash link)', () => {
    const events = [
      { event: 'login', actor: 'user1' },
      { event: 'upload', actor: 'user1' },
    ];
    const trail = buildTrail(events);
    // Tamper with previousHash link
    trail.trail[1].previousHash = 'wrong-previous-hash';
    const result = verifyTrail(trail);
    assert.equal(result.valid, false);
    assert.ok(result.errors.length > 0);
  });

  it('returns invalid for empty/null trail', () => {
    const result1 = verifyTrail(null);
    assert.equal(result1.valid, false);
    const result2 = verifyTrail({ trail: [] });
    assert.equal(result2.valid, false);
  });

  it('detects modified record content', () => {
    const events = [
      { event: 'login', actor: 'alice' },
      { event: 'upload', actor: 'bob' },
    ];
    const trail = buildTrail(events);
    // Tamper with the event name
    trail.trail[0].event = 'logout';
    const result = verifyTrail(trail);
    assert.equal(result.valid, false);
  });
});

// ─── stampApi (unified object) ──────────────────────────────────────────────

describe('stampApi', () => {
  it('exposes all methods', () => {
    assert.equal(typeof stampApi.stamp, 'function');
    assert.equal(typeof stampApi.verify, 'function');
    assert.equal(typeof stampApi.chain, 'function');
    assert.equal(typeof stampApi.chainEntry, 'function');
    assert.equal(typeof stampApi.verifyChain, 'function');
    assert.equal(typeof stampApi.audit, 'function');
    assert.equal(typeof stampApi.buildTrail, 'function');
    assert.equal(typeof stampApi.verifyTrail, 'function');
  });

  it('stampApi.chain is an alias for buildChain', () => {
    const entries = [{ data: Buffer.from('via-api') }];
    const result = stampApi.chain(entries, { name: 'api-chain' });
    assert.equal(result.name, 'api-chain');
    assert.equal(result.entries.length, 1);
  });

  it('stampApi methods produce same results as named exports', () => {
    const data = Buffer.from('api-test');
    const proof1 = stamp(data);
    const proof2 = stampApi.stamp(data);
    // Different nonces produce different hashes, but structure matches
    assert.equal(proof1.algorithm, proof2.algorithm);
    assert.equal(proof1.issuer, proof2.issuer);
    assert.equal(proof1.version, proof2.version);
  });
});

// ─── Integration / End-to-End ───────────────────────────────────────────────

describe('integration: stamp → verify round-trip', () => {
  it('full stamp-verify cycle works for legal document', () => {
    const contractData = Buffer.from('CONTRACT: Party A agrees to terms with Party B...');
    const proof = stamp(contractData, { issuer: 'legal-dept' });
    assert.equal(proof.issuer, 'legal-dept');

    const result = verify(proof, contractData);
    assert.equal(result.valid, true);

    // Tampered contract fails
    const tamperedContract = Buffer.from('CONTRACT: Party A disagrees with Party B...');
    const tamperedResult = verify(proof, tamperedContract);
    assert.equal(tamperedResult.valid, false);
  });

  it('full chain build-and-verify cycle for healthcare records', () => {
    const entries = [
      { data: Buffer.from('Patient admitted: 2024-01-15'), label: 'admission', metadata: { facility: 'General Hospital' } },
      { data: Buffer.from('Diagnosis: routine checkup'), label: 'diagnosis', metadata: { physician: 'Dr. Smith' } },
      { data: Buffer.from('Patient discharged: 2024-01-16'), label: 'discharge', metadata: { facility: 'General Hospital' } },
    ];
    const chain = buildChain(entries, { name: 'patient-001-chain' });
    assert.equal(chain.name, 'patient-001-chain');
    assert.equal(chain.entries.length, 3);

    // Verify integrity
    const result = verifyChain(chain);
    assert.equal(result.valid, true);

    // Labels and metadata preserved
    assert.equal(chain.entries[0].label, 'admission');
    assert.deepEqual(chain.entries[1].metadata, { physician: 'Dr. Smith' });
    assert.equal(chain.entries[2].label, 'discharge');
  });

  it('full audit trail build-and-verify for financial transaction', () => {
    const events = [
      { event: 'transaction.initiated', actor: 'account-holder', resource: 'acct-123', metadata: { amount: 5000 } },
      { event: 'transaction.verified', actor: 'fraud-system', resource: 'acct-123', metadata: { riskScore: 'low' } },
      { event: 'transaction.completed', actor: 'payment-gateway', resource: 'acct-123', metadata: { confirmationId: 'TXN-999' } },
    ];
    const trail = buildTrail(events);
    assert.equal(trail.verified, true);
    assert.equal(trail.trail.length, 3);

    // Verify individual record content
    assert.equal(trail.trail[0].event, 'transaction.initiated');
    assert.equal(trail.trail[1].actor, 'fraud-system');
    assert.equal(trail.trail[2].metadata.confirmationId, 'TXN-999');

    // Full verification
    const result = verifyTrail(trail);
    assert.equal(result.valid, true);
  });
});
