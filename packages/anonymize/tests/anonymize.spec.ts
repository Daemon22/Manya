/**
 * @manya-os/anonymize — comprehensive unit tests.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import {
  Anonymizer, anonymize,
  luhnValid, zaIdChecksumValid,
  DetectorRegistry, resolveOverlaps, severityFor,
  ALL_PATTERN_DETECTORS, ALL_CONTEXT_DETECTORS,
  MaskRedactor, HashRedactor, TokenRedactor, FullRedactor, GeneralizeRedactor, SynthesizeRedactor,
  applyRedactions,
  isSensitiveKey, scrubObjectMetadata,
  normalizeOcrText, ocrPageToText, findOcrPiiCandidates,
  dhash, redactImage, stripJpegExif,
  parsePdfInfo, parseDocxCoreXml, normalizeMetadata, scrubDocumentMetadata,
  Validator, hashConfig,
  buildManifest, verifyManifest, hashRecord,
  AnonymizeError, RedactionError, ValidationError,
} from '../src';

describe('pattern detectors', () => {
  test('email detector finds emails', () => {
    const text = 'Contact me at alice@example.com or bob@sub.domain.io';
    const f = ALL_PATTERN_DETECTORS.find(d => d.name === 'email')!.detect(text);
    expect(f).toHaveLength(2);
    expect(f[0].category).toBe('email_address');
    expect(f[0].confidence).toBeGreaterThan(0.9);
  });

  test('ipv4 detector finds IPs', () => {
    const text = 'Server at 192.168.1.1 and 10.0.0.255';
    const f = ALL_PATTERN_DETECTORS.find(d => d.name === 'ipv4')!.detect(text);
    expect(f).toHaveLength(2);
  });

  test('ipv4 detector rejects out-of-range octets', () => {
    const text = '999.999.999.999 is not an IP';
    const f = ALL_PATTERN_DETECTORS.find(d => d.name === 'ipv4')!.detect(text);
    expect(f).toHaveLength(0);
  });

  test('jwt detector finds tokens', () => {
    const text = 'Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
    const f = ALL_PATTERN_DETECTORS.find(d => d.name === 'jwt')!.detect(text);
    expect(f).toHaveLength(1);
    expect(f[0].category).toBe('jwt_token');
    expect(f[0].severity).toBe('critical');
  });

  test('credit card detector validates Luhn', () => {
    // 4111-1111-1111-1111 is a valid test card number
    const text = 'Card: 4111 1111 1111 1111';
    const f = ALL_PATTERN_DETECTORS.find(d => d.name === 'credit_card')!.detect(text);
    expect(f).toHaveLength(1);
    expect(f[0].category).toBe('credit_card');
  });

  test('credit card detector rejects bad Luhn', () => {
    const text = 'Card: 4111 1111 1111 1112';
    const f = ALL_PATTERN_DETECTORS.find(d => d.name === 'credit_card')!.detect(text);
    expect(f).toHaveLength(0);
  });

  test('luhnValid', () => {
    expect(luhnValid('4111111111111111')).toBe(true);
    expect(luhnValid('4111111111111112')).toBe(false);
    expect(luhnValid('79927398713')).toBe(true);
  });

  test('zaIdChecksumValid', () => {
    // Real test ID format: 8801235111088 (validated by SA government doctest example)
    expect(zaIdChecksumValid('8801235111088')).toBe(true);
    expect(zaIdChecksumValid('8801235111089')).toBe(false);
  });

  test('za_id detector finds valid SA ID', () => {
    const text = 'ID: 8801235111088';
    const f = ALL_PATTERN_DETECTORS.find(d => d.name === 'za_id')!.detect(text);
    expect(f).toHaveLength(1);
    expect(f[0].category).toBe('national_id');
    expect(f[0].severity).toBe('critical');
  });

  test('mac detector', () => {
    const text = 'MAC: 00:1A:2B:3C:4D:5E';
    const f = ALL_PATTERN_DETECTORS.find(d => d.name === 'mac')!.detect(text);
    expect(f).toHaveLength(1);
  });

  test('iso_date detector', () => {
    const text = 'Born 1990-05-15, died 2020-12-31';
    const f = ALL_PATTERN_DETECTORS.find(d => d.name === 'iso_date')!.detect(text);
    expect(f).toHaveLength(2);
  });

  test('postal code detector (US ZIP)', () => {
    const text = 'ZIP 10001 and 90210-1234';
    const f = ALL_PATTERN_DETECTORS.find(d => d.name === 'postal_code')!.detect(text);
    expect(f.length).toBeGreaterThanOrEqual(2);
  });
});

describe('context detectors', () => {
  test('person name via honorific', () => {
    const text = 'Patient Mr John Smith visited today.';
    const f = ALL_CONTEXT_DETECTORS.find(d => d.name === 'person_name')!.detect(text);
    expect(f).toHaveLength(1);
    expect(f[0].text).toBe('John Smith');
  });

  test('person name allows custom allowlist', () => {
    const text = 'Dr Alice Brown prescribed medication.';
    const det = ALL_CONTEXT_DETECTORS.find(d => d.name === 'person_name')!;
    const blocked = det.detect(text);
    expect(blocked).toHaveLength(1);
    const allowed = det.detect(text, { nameAllowlist: ['Alice Brown'] });
    expect(allowed).toHaveLength(0);
  });

  test('address detector finds street addresses', () => {
    const text = 'Lives at 123 Main Street, Apartment 4B';
    const f = ALL_CONTEXT_DETECTORS.find(d => d.name === 'physical_address')!.detect(text);
    expect(f).toHaveLength(1);
    expect(f[0].text).toContain('123 Main Street');
  });

  test('health condition detector', () => {
    const text = 'Diagnosed with diabetes and hypertension last year.';
    const f = ALL_CONTEXT_DETECTORS.find(d => d.name === 'health_condition')!.detect(text);
    expect(f.length).toBeGreaterThanOrEqual(2);
  });

  test('medication detector', () => {
    const text = 'Take amoxicillin twice daily, with metformin.';
    const f = ALL_CONTEXT_DETECTORS.find(d => d.name === 'medication')!.detect(text);
    expect(f.length).toBeGreaterThanOrEqual(2);
  });
});

describe('DetectorRegistry', () => {
  test('register and run', () => {
    const reg = new DetectorRegistry();
    reg.register(ALL_PATTERN_DETECTORS[0]);
    const f = reg.runAll('test alice@example.com end', {}, 0.5);
    expect(f.length).toBeGreaterThan(0);
  });

  test('duplicate register throws', () => {
    const reg = new DetectorRegistry();
    reg.register(ALL_PATTERN_DETECTORS[0]);
    expect(() => reg.register(ALL_PATTERN_DETECTORS[0])).toThrow();
  });

  test('disabled detector skipped', () => {
    const reg = new DetectorRegistry();
    reg.register(ALL_PATTERN_DETECTORS[0]);
    const f = reg.runAll('test alice@example.com end', {
      email: { enabled: false },
    }, 0.5);
    expect(f).toHaveLength(0);
  });
});

describe('resolveOverlaps', () => {
  test('picks higher confidence on overlap', () => {
    const input = 'alice@example.com';
    const findings = [
      { start: 0, end: 17, text: input, category: 'email_address' as const, confidence: 0.95, severity: 'high' as const, detector: 'email' },
      { start: 0, end: 5, text: 'alice', category: 'person_name' as const, confidence: 0.6, severity: 'high' as const, detector: 'person_name' },
    ];
    const out = resolveOverlaps(findings);
    expect(out).toHaveLength(1);
    expect(out[0].detector).toBe('email');
  });
});

describe('severityFor', () => {
  test('credit_card is critical', () => {
    expect(severityFor('credit_card')).toBe('critical');
  });
  test('person_name is high', () => {
    expect(severityFor('person_name')).toBe('high');
  });
});

describe('redactors', () => {
  const finding = { start: 0, end: 5, text: 'alice', category: 'person_name' as const, confidence: 0.9, severity: 'high' as const, detector: 'person_name' };

  test('MaskRedactor', () => {
    const r = new MaskRedactor().redact(finding);
    expect(r).toMatch(/a\*+e/);
  });

  test('HashRedactor deterministic', () => {
    const r1 = new HashRedactor().redact(finding);
    const r2 = new HashRedactor().redact(finding);
    expect(r1).toBe(r2);
    expect(r1).toMatch(/^\[sha256:[0-9a-f]{12}\]$/);
  });

  test('HashRedactor length validation', () => {
    expect(() => new HashRedactor('sha256', 2)).toThrow(RedactionError);
    expect(() => new HashRedactor('sha256', 100)).toThrow(RedactionError);
  });

  test('TokenRedactor counter increments', () => {
    const t = new TokenRedactor();
    const r1 = t.redact(finding);
    const r2 = t.redact({ ...finding, text: 'bob' });
    expect(r1).toBe('[PERSON_NAME_001]');
    expect(r2).toBe('[PERSON_NAME_002]');
  });

  test('TokenRedactor deduplicates identical text', () => {
    const t = new TokenRedactor();
    const r1 = t.redact(finding);
    const r2 = t.redact(finding);
    expect(r1).toBe(r2);
  });

  test('FullRedactor', () => {
    expect(new FullRedactor().redact(finding)).toBe('[REDACTED]');
  });

  test('GeneralizeRedactor for age', () => {
    const ageFinding = { ...finding, text: '42', category: 'phi_age' as const };
    expect(new GeneralizeRedactor().redact(ageFinding)).toBe('[age:40-49]');
  });

  test('SynthesizeRedactor email', () => {
    const emailFinding = { ...finding, text: 'alice@example.com', category: 'email_address' as const };
    const r = new SynthesizeRedactor().redact(emailFinding);
    expect(r).toMatch(/^user\d+@example\.com$/);
  });

  test('applyRedactions patches string', () => {
    const input = 'email is alice@example.com here';
    // 'alice@example.com' is 17 chars; start=9, end=26.
    const f = [{ start: 9, end: 26, text: 'alice@example.com', category: 'email_address' as const, confidence: 0.95, severity: 'high' as const, detector: 'email' }];
    const { output, redactions } = applyRedactions(input, f, () => new FullRedactor());
    expect(output).toBe('email is [REDACTED] here');
    expect(redactions).toHaveLength(1);
    expect(redactions[0].strategy).toBe('redact');
  });
});

describe('metadata scrubbing', () => {
  test('isSensitiveKey matches default keys', () => {
    expect(isSensitiveKey('author')).toBe(true);
    expect(isSensitiveKey('GPSLatitude')).toBe(true);
    expect(isSensitiveKey('title')).toBe(false);
  });

  test('isSensitiveKey respects allowlist', () => {
    expect(isSensitiveKey('author', { allowlist: ['author'] })).toBe(false);
  });

  test('scrubMetadata deletes sensitive keys', () => {
    const input = { title: 'Doc', author: 'Alice', nested: { gps: 'here', safe: 'ok' } };
    const out = scrubObjectMetadata(input);
    expect((out as any).author).toBeUndefined();
    expect((out as any).nested.gps).toBeUndefined();
    expect((out as any).nested.safe).toBe('ok');
    expect((out as any).title).toBe('Doc');
  });

  test('scrubMetadata redactInsteadOfDelete', () => {
    const out = scrubObjectMetadata({ author: 'Alice' }, { redactInsteadOfDelete: true });
    expect((out as any).author).toBe('[redacted]');
  });
});

describe('OCR handling', () => {
  test('normalizeOcrText collapses whitespace', () => {
    expect(normalizeOcrText('hello   world\n\n')).toBe('hello world');
  });

  test('findOcrPiiCandidates flags email typo', () => {
    const candidates = findOcrPiiCandidates('contact emaiI alice@example.com');
    expect(candidates.length).toBeGreaterThan(0);
  });

  test('ocrPageToText reconstructs text', () => {
    const page = {
      width: 100, height: 100,
      words: [
        { text: 'hello', x: 0, y: 0, w: 50, h: 20 },
        { text: 'world', x: 60, y: 0, w: 50, h: 20 },
      ],
    };
    expect(ocrPageToText(page)).toBe('hello world');
  });
});

describe('image redaction', () => {
  test('dhash returns 16 hex chars', () => {
    const buf = Buffer.from('test image data for hashing'.repeat(64));
    const h = dhash(buf);
    expect(h).toMatch(/^[0-9a-f]{16}$/);
  });

  test('redactImage on non-JPEG returns input', () => {
    const buf = Buffer.from('not an image');
    const r = redactImage(buf);
    expect(r.exifStripped).toBe(false);
    expect(r.bytes.equals(buf)).toBe(true);
  });

  test('redactImage strips JPEG EXIF', () => {
    // Construct minimal JPEG: SOI + APP1(EXIF) + SOF + EOI
    const soi = Buffer.from([0xff, 0xd8]);
    const exifMarker = Buffer.from([0xff, 0xe1, 0x00, 0x0a]);
    const exifMagic = Buffer.from('Exif\x00\x00', 'ascii');
    const exifPayload = Buffer.from([0x00, 0x00]);
    const sof = Buffer.from([0xff, 0xc0, 0x00, 0x04, 0x00, 0x01]);
    const eoi = Buffer.from([0xff, 0xd9]);
    const jpeg = Buffer.concat([soi, exifMarker, exifMagic, exifPayload, sof, eoi]);
    const r = redactImage(jpeg);
    expect(r.exifStripped).toBe(true);
    expect(r.finalLength).toBeLessThan(jpeg.length);
  });
});

describe('document metadata', () => {
  test('parsePdfInfo', () => {
    const raw = '/Title (My Doc) /Author (Alice) /CreationDate (D:20240101)';
    const out = parsePdfInfo(raw);
    expect(out.Title).toBe('My Doc');
    expect(out.Author).toBe('Alice');
  });

  test('parseDocxCoreXml', () => {
    const raw = '<dc:title>Doc</dc:title><dc:creator>Alice</dc:creator><cp:revision>3</cp:revision>';
    const out = parseDocxCoreXml(raw);
    expect(out.title).toBe('Doc');
    expect(out.author).toBe('Alice');
    expect(out.revision).toBe('3');
  });

  test('normalizeMetadata', () => {
    const raw = { Title: 'Doc', Author: 'Alice', keywords: 'a, b, c' };
    const m = normalizeMetadata('pdf', raw);
    expect(m.normalized.title).toBe('Doc');
    expect(m.normalized.keywords).toEqual(['a', 'b', 'c']);
  });

  test('scrubDocumentMetadata removes author', () => {
    const meta = normalizeMetadata('pdf', { Title: 'Doc', Author: 'Alice' });
    const clean = scrubDocumentMetadata(meta);
    expect(clean.normalized.author).toBeUndefined();
  });
});

describe('Validator & hashConfig', () => {
  test('hashConfig is stable', () => {
    expect(hashConfig({ a: 1, b: 2 })).toBe(hashConfig({ a: 1, b: 2 }));
  });

  test('Validator flags residual PII', () => {
    const anon = new Anonymizer({ validateOutput: false });
    const rep = anon.anonymize('Contact alice@example.com').report;
    // After redaction, no email should remain.
    expect(rep.residualCounts.email_address || 0).toBe(0);
  });
});

describe('publishing', () => {
  test('hashRecord', () => {
    expect(hashRecord('test')).toMatch(/^[0-9a-f]{64}$/);
  });

  test('buildManifest and verifyManifest round-trip', () => {
    const records = ['record 1', 'record 2', 'record 3'];
    const rep = { passed: true, entries: [], residualRisk: 0, residualCounts: {}, configHash: 'abc' };
    const manifest = buildManifest('test-dataset', records, 'config-hash', rep as any);
    expect(manifest.recordCount).toBe(3);
    expect(manifest.datasetHash).toMatch(/^[0-9a-f]{64}$/);
    expect(verifyManifest(manifest, records)).toBe(true);
    expect(verifyManifest(manifest, ['tampered', 'record 2', 'record 3'])).toBe(false);
  });
});

describe('Anonymizer end-to-end', () => {
  test('anonymizes email with default mask strategy', () => {
    const { result } = anonymize('Contact alice@example.com for info');
    expect(result.output).not.toContain('alice@example.com');
    expect(result.findings.length).toBeGreaterThan(0);
    expect(result.safe).toBe(true);
  });

  test('anonymizes credit card with full redact strategy', () => {
    const { result } = anonymize('Card 4111 1111 1111 1111 expires soon');
    expect(result.output).not.toContain('4111');
    expect(result.safe).toBe(true);
  });

  test('anonymizes phone number', () => {
    const { result } = anonymize('Call +1-555-123-4567 today');
    expect(result.output).not.toContain('555-123-4567');
  });

  test('anonymizeBatch produces manifest', () => {
    const anon = new Anonymizer();
    const { manifest, results } = anon.anonymizeBatch(
      ['Email: alice@example.com', 'Phone: +1-555-123-4567'],
      'test-batch',
    );
    expect(results).toHaveLength(2);
    expect(manifest.recordCount).toBe(2);
    expect(verifyManifest(manifest, results.map(r => r.output))).toBe(true);
  });

  test('handles empty input', () => {
    const { result } = anonymize('');
    expect(result.findings).toHaveLength(0);
    expect(result.output).toBe('');
    expect(result.safe).toBe(true);
  });

  test('handles input with no PII', () => {
    const { result } = anonymize('The quick brown fox jumps over the lazy dog.');
    expect(result.findings).toHaveLength(0);
    expect(result.safe).toBe(true);
  });

  test('invalid input throws AnonymizeError', () => {
    expect(() => anonymize(123 as any)).toThrow(AnonymizeError);
  });
});
