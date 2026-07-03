/**
 * Comprehensive test suite for @manya/lens.
 * Uses the Node.js built-in test runner.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  detect,
  redact,
  scan,
  classify,
  profile,
  PRESETS,
  LEVELS,
  lens,
} from '../src/index.js';

// ---------------------------------------------------------------------------
// detect
// ---------------------------------------------------------------------------

test('detect: identifies JSON data', () => {
  const data = Buffer.from('{"name":"Alice","age":30}');
  const result = detect(data);
  assert.equal(result.format, 'json');
  assert.equal(result.encoding, 'utf8');
  assert.equal(result.binary, false);
  assert.ok(result.confidence >= 0.9);
  assert.equal(result.size, data.length);
});

test('detect: identifies JSON array', () => {
  const data = Buffer.from('[1,2,3]');
  const result = detect(data);
  assert.equal(result.format, 'json');
  assert.equal(result.encoding, 'utf8');
});

test('detect: identifies XML data', () => {
  const data = Buffer.from('<?xml version="1.0"?><root><item>test</item></root>');
  const result = detect(data);
  assert.equal(result.format, 'xml');
  assert.equal(result.encoding, 'utf8');
  assert.equal(result.binary, false);
});

test('detect: identifies CSV data', () => {
  const data = Buffer.from('name,age,city\nAlice,30,NYC\nBob,25,LA');
  const result = detect(data);
  assert.equal(result.format, 'csv');
  assert.equal(result.encoding, 'utf8');
  assert.equal(result.binary, false);
});

test('detect: identifies PDF by magic bytes', () => {
  const data = Buffer.from('%PDF-1.4 rest of pdf content here');
  const result = detect(data);
  assert.equal(result.format, 'pdf');
  assert.equal(result.encoding, 'binary');
  assert.equal(result.binary, true);
  assert.ok(result.confidence >= 0.95);
});

test('detect: identifies PNG by magic bytes', () => {
  const data = Buffer.alloc(16);
  data[0] = 0x89;
  data.write('PNG', 1, 'ascii');
  const result = detect(data);
  assert.equal(result.format, 'png');
  assert.equal(result.binary, true);
});

test('detect: identifies JPEG by magic bytes', () => {
  const data = Buffer.alloc(4);
  data[0] = 0xFF;
  data[1] = 0xD8;
  const result = detect(data);
  assert.equal(result.format, 'jpeg');
  assert.equal(result.binary, true);
});

test('detect: identifies binary data with null bytes', () => {
  const data = Buffer.alloc(100, 0);
  const result = detect(data);
  assert.equal(result.format, 'binary');
  assert.equal(result.binary, true);
});

test('detect: falls back to plain text for unrecognized text', () => {
  const data = Buffer.from('Hello, this is just some plain text without special format.');
  const result = detect(data);
  assert.equal(result.format, 'text');
  assert.equal(result.encoding, 'utf8');
  assert.equal(result.binary, false);
});

test('detect: throws on non-Buffer input', () => {
  assert.throws(() => detect('not a buffer'), /non-empty Buffer/);
});

test('detect: throws on empty Buffer', () => {
  assert.throws(() => detect(Buffer.alloc(0)), /non-empty Buffer/);
});

// ---------------------------------------------------------------------------
// redact
// ---------------------------------------------------------------------------

test('redact: redacts email addresses', () => {
  const text = 'Contact us at john@example.com for details.';
  const result = redact(text, { rules: ['pii'] });
  assert.ok(result.redacted.includes('[REDACTED](EMAIL)'));
  assert.ok(!result.redacted.includes('john@example.com'));
  assert.ok(result.count >= 1);
  assert.ok(result.found.some(f => f.type === 'EMAIL'));
});

test('redact: redacts phone numbers', () => {
  const text = 'Call me at 555-123-4567 today.';
  const result = redact(text, { rules: ['pii'] });
  assert.ok(result.redacted.includes('[REDACTED](PHONE)'));
  assert.ok(!result.redacted.includes('555-123-4567'));
});

test('redact: redacts SSN', () => {
  const text = 'SSN: 123-45-6789';
  const result = redact(text, { rules: ['ssn'] });
  assert.ok(result.redacted.includes('[REDACTED](SSN)'));
  assert.ok(!result.redacted.includes('123-45-6789'));
});

test('redact: redacts credit card numbers', () => {
  const text = 'Card: 4111-1111-1111-1111';
  const result = redact(text, { rules: ['financial'] });
  assert.ok(result.redacted.includes('[REDACTED](CREDIT_CARD)'));
});

test('redact: redacts PHI patterns (MRN)', () => {
  const text = 'Patient MRN-123456 needs follow-up';
  const result = redact(text, { rules: ['phi'] });
  assert.ok(result.redacted.includes('[REDACTED](MRN)'));
  assert.ok(!result.redacted.includes('MRN-123456'));
});

test('redact: supports custom patterns', () => {
  const text = 'Project X-777 is classified';
  const result = redact(text, {
    rules: [],
    custom: [{ pattern: /X-777/g, label: 'PROJECT_CODE' }],
  });
  assert.ok(result.redacted.includes('[REDACTED](PROJECT_CODE)'));
  assert.ok(!result.redacted.includes('X-777'));
});

test('redact: supports custom replacement text', () => {
  const text = 'Email: test@test.com';
  const result = redact(text, { rules: ['email'], replacement: '***' });
  assert.ok(result.redacted.includes('***(EMAIL)'));
  assert.ok(!result.redacted.includes('test@test.com'));
});

test('redact: resolves preset names', () => {
  const text = 'Email: a@b.com and SSN: 111-22-3333';
  const result = redact(text, { rules: ['pii'] });
  assert.ok(result.count >= 2, `Expected at least 2 redactions, got ${result.count}`);
});

test('redact: throws on non-string input', () => {
  assert.throws(() => redact(123), /string/);
});

// ---------------------------------------------------------------------------
// scan
// ---------------------------------------------------------------------------

test('scan: finds PII without redacting', () => {
  const text = 'Email: user@example.com and another@domain.org';
  const result = scan(text, ['email']);
  assert.ok(result.total >= 2, `Expected at least 2, got ${result.total}`);
  assert.ok(result.findings.some(f => f.type === 'EMAIL'));
  assert.ok(result.findings.some(f => f.matches.includes('user@example.com')));
  // Original text should be unchanged
  assert.ok(text.includes('user@example.com'));
});

test('scan: returns match values for findings', () => {
  const text = 'SSN: 123-45-6789 and 987-65-4321';
  const result = scan(text, ['ssn']);
  const ssnFinding = result.findings.find(f => f.type === 'SSN');
  assert.ok(ssnFinding, 'Should find SSN');
  assert.ok(ssnFinding.matches.length >= 2, 'Should find at least 2 SSNs');
});

test('scan: throws on non-string input', () => {
  assert.throws(() => scan(42), /string/);
});

// ---------------------------------------------------------------------------
// classify
// ---------------------------------------------------------------------------

test('classify: classifies public content', () => {
  const result = classify('This is a public press release about our marketing brochure.');
  assert.equal(result.level, 'public');
  assert.ok(result.recommendations.includes('No special handling required'));
});

test('classify: classifies internal content', () => {
  const result = classify('This document is for internal employee only use.');
  assert.ok(['internal', 'confidential', 'restricted'].includes(result.level));
});

test('classify: classifies confidential content', () => {
  const result = classify('This document is confidential and contains trade secret information.');
  assert.ok(result.level === 'confidential' || result.level === 'restricted');
  assert.ok(result.score >= 55);
});

test('classify: classifies restricted content with HIPAA keywords', () => {
  const result = classify('Patient medical record containing PHI data under HIPAA regulations.');
  assert.equal(result.level, 'restricted');
  assert.ok(result.score >= 85);
  assert.ok(result.recommendations.includes('Encrypt at rest and in transit'));
  assert.ok(result.recommendations.includes('Implement role-based access control'));
  assert.ok(result.recommendations.includes('Audit all access attempts'));
});

test('classify: hint can raise classification level', () => {
  const result = classify('This is a regular document.', { hint: 'confidential' });
  assert.ok(['confidential', 'restricted'].includes(result.level));
});

test('classify: hint does not lower classification level', () => {
  const result = classify('Top secret classified document', { hint: 'public' });
  assert.equal(result.level, 'restricted');
});

test('classify: accepts Buffer input', () => {
  const result = classify(Buffer.from('This is a public announcement.'));
  assert.equal(result.level, 'public');
});

test('classify: throws on empty input', () => {
  assert.throws(() => classify(''), /non-empty/);
});

// ---------------------------------------------------------------------------
// profile
// ---------------------------------------------------------------------------

test('profile: calculates entropy and size for text data', () => {
  const data = Buffer.from('Hello, World! This is a test string for profiling.');
  const result = profile(data);
  assert.equal(result.size, data.length);
  assert.ok(result.entropy > 0, 'Entropy should be positive');
  assert.ok(result.entropy <= 8, 'Entropy should be <= 8');
  assert.equal(result.format, 'text');
  assert.equal(result.encoding, 'utf8');
  assert.equal(result.nullByteRatio, 0);
  assert.ok(result.printableRatio > 0.9);
});

test('profile: detects binary data', () => {
  const data = Buffer.alloc(1000, 0);
  const result = profile(data);
  assert.equal(result.format, 'binary');
  assert.equal(result.encoding, 'binary');
  assert.ok(result.nullByteRatio > 0.5);
  assert.equal(result.printableRatio, 0);
});

test('profile: throws on non-Buffer input', () => {
  assert.throws(() => profile('not a buffer'), /non-empty Buffer/);
});

test('profile: throws on empty Buffer', () => {
  assert.throws(() => profile(Buffer.alloc(0)), /non-empty Buffer/);
});

// ---------------------------------------------------------------------------
// LEVELS & PRESETS
// ---------------------------------------------------------------------------

test('LEVELS: contains the four sensitivity levels in order', () => {
  assert.deepEqual(LEVELS, ['public', 'internal', 'confidential', 'restricted']);
});

test('PRESETS: contains pii, phi, financial, and all presets', () => {
  assert.ok(Array.isArray(PRESETS.pii));
  assert.ok(Array.isArray(PRESETS.phi));
  assert.ok(Array.isArray(PRESETS.financial));
  assert.ok(Array.isArray(PRESETS.all));
  assert.ok(PRESETS.pii.includes('email'));
  assert.ok(PRESETS.phi.includes('mrn'));
  assert.ok(PRESETS.financial.includes('creditCard'));
  assert.ok(PRESETS.all.length > PRESETS.pii.length);
});

// ---------------------------------------------------------------------------
// lens unified object
// ---------------------------------------------------------------------------

test('lens: unified object exposes all methods and constants', () => {
  assert.equal(typeof lens.detect, 'function');
  assert.equal(typeof lens.redact, 'function');
  assert.equal(typeof lens.scan, 'function');
  assert.equal(typeof lens.classify, 'function');
  assert.equal(typeof lens.profile, 'function');
  assert.ok(lens.PRESETS);
  assert.ok(lens.LEVELS);
});

test('lens: default export works as unified API', () => {
  const det = lens.detect(Buffer.from('{"a":1}'));
  assert.equal(det.format, 'json');

  const red = lens.redact('Email: x@y.com', { rules: ['email'] });
  assert.ok(red.count >= 1);

  const scn = lens.scan('SSN: 111-22-3333', ['ssn']);
  assert.ok(scn.total >= 1);

  const cls = lens.classify('Public brochure');
  assert.equal(cls.level, 'public');

  const prf = lens.profile(Buffer.from('test data'));
  assert.equal(prf.size, 9);
});

// ---------------------------------------------------------------------------
// Integration tests
// ---------------------------------------------------------------------------

test('integration: healthcare EHR redaction pipeline', () => {
  const ehrText = `
    Patient: Jane Doe
    MRN-123456
    Email: jane.doe@hospital.org
    Phone: 555-987-6543
    Diagnosis: J18.9 (Pneumonia)
    HIPAA-2024 compliance required
    Contains PHI data
    Doctor NPI: 1234567890
  `;
  // Redact with PHI preset
  const result = redact(ehrText, { rules: ['phi'] });
  assert.ok(!result.redacted.includes('jane.doe@hospital.org'), 'Email should be redacted');
  assert.ok(!result.redacted.includes('MRN-123456'), 'MRN should be redacted');
  assert.ok(!result.redacted.includes('555-987-6543'), 'Phone should be redacted');
  assert.ok(result.count >= 4, `Expected at least 4 redactions, got ${result.count}`);

  // Classify the EHR data
  const classification = classify(ehrText);
  assert.equal(classification.level, 'restricted');
  assert.ok(classification.matchedRules.some(r => r.keyword === 'HIPAA'));
  assert.ok(classification.matchedRules.some(r => r.keyword === 'PHI' || r.keyword === 'HIPAA'));
});

test('integration: financial statement scan pipeline', () => {
  const financialText = `
    Confidential statement for bank account 12345678901234
    Routing: 021000021
    Credit Card: 4111-1111-1111-1111
    SWIFT: CHASUS33
    Total balance: $5,000.00
  `;
  const scanResult = scan(financialText, ['financial']);
  assert.ok(scanResult.findings.some(f => f.type === 'CREDIT_CARD'), 'Should find credit card');
  assert.ok(scanResult.findings.some(f => f.type === 'SWIFT_CODE'), 'Should find SWIFT code');
  assert.ok(scanResult.total >= 2, `Expected at least 2 findings, got ${scanResult.total}`);

  // Classify
  const classification = classify(financialText);
  assert.ok(['confidential', 'restricted'].includes(classification.level),
    `Expected confidential or restricted, got ${classification.level}`);
});

test('integration: legal privilege classification pipeline', () => {
  const legalText = `
    ATTORNEY-CLIENT PRIVILEGE
    CONFIDENTIAL — DO NOT DISTRIBUTE
    This memorandum contains proprietary trade secret analysis
    and is classified as top secret under company policy.
  `;
  const classification = classify(legalText);
  assert.equal(classification.level, 'restricted');
  assert.ok(classification.score >= 85, `Expected score >= 85, got ${classification.score}`);
  assert.ok(classification.matchedRules.some(r => r.keyword === 'classified' || r.keyword === 'top secret'));
  assert.ok(classification.recommendations.includes('Encrypt at rest and in transit'));
  assert.ok(classification.recommendations.includes('Audit all access attempts'));
});
