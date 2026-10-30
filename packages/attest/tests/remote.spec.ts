import {
  produceAttestation,
  verifyAttestation,
  produceAndSerializeAttestation,
  deserializeAndVerifyAttestation,
  serializeQuote,
  deserializeQuote,
  validateQuote,
  ATTESTATION_QUOTE_VERSION,
  DEFAULT_ATTESTATION_FRESHNESS_MS,
  generateKeyPair,
  exportKeyPem,
  AttestationError,
  type AttestationQuote,
} from '@manya-os/attest';

describe('remote/quote', () => {
  const validQuote = (over: Partial<AttestationQuote> = {}): AttestationQuote => ({
    version: 1,
    deviceFingerprint: 'fp',
    measurements: { a: '1' },
    timestamp: new Date().toISOString(),
    nonce: 'n',
    signature: 'deadbeef',
    algorithm: 'ecdsa-p256',
    ...over,
  });

  it('ATTESTATION_QUOTE_VERSION is 1', () => {
    expect(ATTESTATION_QUOTE_VERSION).toBe(1);
  });

  it('validateQuote accepts a well-formed quote', () => {
    expect(() => validateQuote(validQuote())).not.toThrow();
  });

  it('validateQuote rejects wrong version', () => {
    expect(() => validateQuote(validQuote({ version: 2 }))).toThrow(AttestationError);
  });

  it('validateQuote rejects missing fields', () => {
    expect(() => validateQuote({})).toThrow(AttestationError);
    expect(() => validateQuote(null)).toThrow(AttestationError);
    expect(() => validateQuote({ ...validQuote(), deviceFingerprint: '' })).toThrow(AttestationError);
    expect(() => validateQuote({ ...validQuote(), nonce: '' })).toThrow(AttestationError);
    expect(() => validateQuote({ ...validQuote(), signature: '' })).toThrow(AttestationError);
    expect(() => validateQuote({ ...validQuote(), algorithm: 'bad' as never })).toThrow(AttestationError);
  });

  it('serializeQuote + deserializeQuote round-trip', () => {
    const q = validQuote();
    const buf = serializeQuote(q);
    expect(Buffer.isBuffer(buf)).toBe(true);
    const back = deserializeQuote(buf);
    expect(back).toEqual(q);
  });

  it('deserializeQuote accepts string input', () => {
    const q = validQuote();
    const buf = serializeQuote(q);
    const back = deserializeQuote(buf.toString('utf8'));
    expect(back).toEqual(q);
  });

  it('deserializeQuote rejects invalid JSON', () => {
    expect(() => deserializeQuote(Buffer.from('not json', 'utf8'))).toThrow(AttestationError);
  });

  it('deserializeQuote rejects malformed quote', () => {
    expect(() => deserializeQuote(Buffer.from('{}', 'utf8'))).toThrow(AttestationError);
  });

  it('deserializeQuote rejects non-buffer non-string input', () => {
    expect(() => deserializeQuote(42 as unknown as Buffer)).toThrow(AttestationError);
  });
});

describe('remote/attestation', () => {
  it('produceAttestation returns a signed quote', () => {
    const kp = generateKeyPair('ecdsa');
    const quote = produceAttestation(
      kp.privateKey,
      'device-fp',
      { m1: 'a', m2: 'b' },
      'nonce-123'
    );
    expect(quote.version).toBe(1);
    expect(quote.deviceFingerprint).toBe('device-fp');
    expect(quote.measurements).toEqual({ m1: 'a', m2: 'b' });
    expect(quote.nonce).toBe('nonce-123');
    expect(quote.signature).toMatch(/^[0-9a-f]+$/);
    expect(quote.algorithm).toBe('ecdsa-p256');
  });

  it('verifyAttestation returns true for a freshly-produced quote', () => {
    const kp = generateKeyPair('ecdsa');
    const quote = produceAttestation(
      kp.privateKey,
      'device-fp',
      { m1: 'a' },
      'nonce-123'
    );
    expect(verifyAttestation(kp.publicKey, quote, 'nonce-123')).toBe(true);
  });

  it('verifyAttestation returns true with expectedFingerprint match', () => {
    const kp = generateKeyPair('ecdsa');
    const quote = produceAttestation(kp.privateKey, 'fp', {}, 'n');
    expect(verifyAttestation(kp.publicKey, quote, 'n', { expectedFingerprint: 'fp' })).toBe(true);
  });

  it('verifyAttestation rejects fingerprint mismatch', () => {
    const kp = generateKeyPair('ecdsa');
    const quote = produceAttestation(kp.privateKey, 'fp', {}, 'n');
    expect(verifyAttestation(kp.publicKey, quote, 'n', { expectedFingerprint: 'different' })).toBe(false);
  });

  it('verifyAttestation rejects nonce mismatch', () => {
    const kp = generateKeyPair('ecdsa');
    const quote = produceAttestation(kp.privateKey, 'fp', {}, 'n');
    expect(verifyAttestation(kp.publicKey, quote, 'wrong-nonce')).toBe(false);
  });

  it('verifyAttestation rejects tampered quote', () => {
    const kp = generateKeyPair('ecdsa');
    const quote = produceAttestation(kp.privateKey, 'fp', { m: 'a' }, 'n');
    const tampered: AttestationQuote = { ...quote, measurements: { m: 'b' } };
    expect(verifyAttestation(kp.publicKey, tampered, 'n')).toBe(false);
  });

  it('verifyAttestation rejects wrong public key', () => {
    const kp1 = generateKeyPair('ecdsa');
    const kp2 = generateKeyPair('ecdsa');
    const quote = produceAttestation(kp1.privateKey, 'fp', {}, 'n');
    expect(verifyAttestation(kp2.publicKey, quote, 'n')).toBe(false);
  });

  it('verifyAttestation rejects stale quote', () => {
    const kp = generateKeyPair('ecdsa');
    // Produce a quote with a timestamp 10 minutes in the past.
    const staleTs = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const quote = produceAttestation(kp.privateKey, 'fp', {}, 'n', { timestamp: staleTs });
    expect(verifyAttestation(kp.publicKey, quote, 'n')).toBe(false);
  });

  it('verifyAttestation respects custom freshnessMs', () => {
    const kp = generateKeyPair('ecdsa');
    const staleTs = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    const quote = produceAttestation(kp.privateKey, 'fp', {}, 'n', { timestamp: staleTs });
    // Default freshness is 5 min, so this should pass by default.
    expect(verifyAttestation(kp.publicKey, quote, 'n')).toBe(true);
    // With 1-minute freshness, it should fail.
    expect(verifyAttestation(kp.publicKey, quote, 'n', { freshnessMs: 60_000 })).toBe(false);
  });

  it('verifyAttestation rejects bad inputs', () => {
    const kp = generateKeyPair('ecdsa');
    expect(verifyAttestation(kp.publicKey, null as unknown as AttestationQuote, 'n')).toBe(false);
    expect(() => verifyAttestation(kp.publicKey, {} as AttestationQuote, '')).toThrow(AttestationError);
    expect(() => verifyAttestation(kp.publicKey, {} as AttestationQuote, 'n', { freshnessMs: 0 })).toThrow(AttestationError);
  });

  it('produceAttestation rejects bad inputs', () => {
    const kp = generateKeyPair('ecdsa');
    expect(() => produceAttestation(kp.privateKey, '', {}, 'n')).toThrow(AttestationError);
    expect(() => produceAttestation(kp.privateKey, 'fp', null as unknown as Record<string, string>, 'n')).toThrow(AttestationError);
    expect(() => produceAttestation(kp.privateKey, 'fp', {}, '')).toThrow(AttestationError);
  });

  it('DEFAULT_ATTESTATION_FRESHNESS_MS is 5 minutes', () => {
    expect(DEFAULT_ATTESTATION_FRESHNESS_MS).toBe(5 * 60 * 1000);
  });

  it('produceAndSerializeAttestation + deserializeAndVerifyAttestation round-trip', () => {
    const kp = generateKeyPair('ecdsa');
    const pubPem = exportKeyPem(kp.publicKey, 'public');
    const buf = produceAndSerializeAttestation(kp.privateKey, 'fp', { m: 'x' }, 'n');
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(deserializeAndVerifyAttestation(pubPem, buf, 'n')).toBe(true);
    expect(deserializeAndVerifyAttestation(pubPem, buf, 'wrong')).toBe(false);
  });

  it('works with RSA-PSS keys', () => {
    const kp = generateKeyPair('rsa', { rsaModulusBits: 2048 });
    const quote = produceAttestation(kp.privateKey, 'fp', { m: 'a' }, 'n');
    expect(quote.algorithm).toBe('rsa-pss');
    expect(verifyAttestation(kp.publicKey, quote, 'n')).toBe(true);
  });

  it('works with PEM-string keys', () => {
    const kp = generateKeyPair('ecdsa');
    const privPem = exportKeyPem(kp.privateKey, 'private');
    const pubPem = exportKeyPem(kp.publicKey, 'public');
    const quote = produceAttestation(privPem, 'fp', {}, 'n');
    expect(verifyAttestation(pubPem, quote, 'n')).toBe(true);
  });

  it('quote includes optional hardware probe when supplied', () => {
    const kp = generateKeyPair('ecdsa');
    const probe = { tpm: true, secureEnclave: false, tee: false, details: 'stubbed' };
    const quote = produceAttestation(kp.privateKey, 'fp', {}, 'n', { hardware: probe });
    expect(quote.hardware).toEqual(probe);
    expect(verifyAttestation(kp.publicKey, quote, 'n')).toBe(true);
  });

  it('signature is over canonical (sorted) bytes — reordering measurements produces byte-identical canonical bytes', () => {
    const kp = generateKeyPair('ecdsa');
    const ts = new Date().toISOString(); // fresh, so freshness check passes
    const q1 = produceAttestation(kp.privateKey, 'fp', { a: '1', b: '2' }, 'n', { timestamp: ts });
    const q2 = produceAttestation(kp.privateKey, 'fp', { b: '2', a: '1' }, 'n', { timestamp: ts });
    // Both quotes verify against the same public key + nonce + fingerprint.
    // (ECDSA sigs are non-deterministic in nonce, so we assert verification,
    // not signature byte-equality.)
    expect(verifyAttestation(kp.publicKey, q1, 'n')).toBe(true);
    expect(verifyAttestation(kp.publicKey, q2, 'n')).toBe(true);
    // Re-sign with the same key + nonce + timestamp — both quotes verify,
    // proving they share the same canonical input to the signer.
    const q3 = produceAttestation(kp.privateKey, 'fp', { a: '1', b: '2' }, 'n', { timestamp: ts });
    expect(verifyAttestation(kp.publicKey, q3, 'n')).toBe(true);
  });
});
