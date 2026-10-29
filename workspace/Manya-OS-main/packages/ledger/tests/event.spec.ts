import * as crypto from 'crypto';
import {
  createEvent,
  computeEventHash,
  signEvent,
  verifyEventSignature,
  eventKeyId,
  generateKeyPair,
  exportKeyPem,
  canonicalSerialize,
  canonicalSerializeToString,
  GENESIS_PREV_HASH,
  EventError,
  LedgerError,
} from '@manya-os/ledger';

describe('createEvent', () => {
  it('creates an event with default values', () => {
    const ev = createEvent({
      type: 'test',
      actor: 'alice',
      payload: { x: 1 },
    });
    expect(ev.type).toBe('test');
    expect(ev.actor).toBe('alice');
    expect(ev.payload).toEqual({ x: 1 });
    expect(ev.seq).toBe(1);
    expect(ev.prevHash).toBe(GENESIS_PREV_HASH);
    expect(ev.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(ev.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    );
    expect(ev.signature).toBeUndefined();
    expect(ev.metadata).toBeUndefined();
  });

  it('accepts explicit id, seq, timestamp, prevHash', () => {
    const ev = createEvent({
      type: 't',
      actor: 'a',
      payload: {},
      id: 'my-id',
      seq: 42,
      timestamp: '2025-06-15T12:00:00.000Z',
      prevHash: 'ab'.repeat(32),
    });
    expect(ev.id).toBe('my-id');
    expect(ev.seq).toBe(42);
    expect(ev.timestamp).toBe('2025-06-15T12:00:00.000Z');
    expect(ev.prevHash).toBe('ab'.repeat(32));
  });

  it('includes metadata when provided', () => {
    const ev = createEvent({
      type: 't',
      actor: 'a',
      payload: { v: 1 },
      metadata: { traceId: '123' },
    });
    expect(ev.metadata).toEqual({ traceId: '123' });
  });

  it('rejects missing type', () => {
    expect(() => createEvent({ actor: 'a', payload: {} } as any)).toThrow(EventError);
  });

  it('rejects empty type', () => {
    expect(() => createEvent({ type: '', actor: 'a', payload: {} })).toThrow(EventError);
  });

  it('rejects missing actor', () => {
    expect(() => createEvent({ type: 't', payload: {} } as any)).toThrow(EventError);
  });

  it('rejects null payload', () => {
    expect(() => createEvent({ type: 't', actor: 'a', payload: null as any })).toThrow(EventError);
  });

  it('rejects array payload', () => {
    expect(() => createEvent({ type: 't', actor: 'a', payload: [1] as any })).toThrow(EventError);
  });

  it('rejects non-hex prevHash', () => {
    expect(() =>
      createEvent({ type: 't', actor: 'a', payload: {}, prevHash: 'not-hex' })
    ).toThrow(EventError);
  });

  it('rejects non-positive seq', () => {
    expect(() =>
      createEvent({ type: 't', actor: 'a', payload: {}, seq: 0 })
    ).toThrow(EventError);
  });

  it('rejects non-serializable payload', () => {
    expect(() =>
      createEvent({ type: 't', actor: 'a', payload: { fn: (() => {}) as any } })
    ).toThrow(EventError);
  });
});

describe('computeEventHash', () => {
  it('produces a 64-char hex SHA-256', () => {
    const hash = computeEventHash({
      id: 'test-id',
      seq: 1,
      type: 'evt',
      actor: 'a',
      payload: { x: 1 },
      timestamp: '2025-01-01T00:00:00.000Z',
      prevHash: GENESIS_PREV_HASH,
    });
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is deterministic', () => {
    const fields = {
      id: 'id',
      seq: 1,
      type: 't',
      actor: 'a',
      payload: { a: 1 },
      timestamp: '2025-01-01T00:00:00.000Z',
      prevHash: GENESIS_PREV_HASH,
    };
    expect(computeEventHash(fields)).toBe(computeEventHash(fields));
  });

  it('changes when payload changes', () => {
    const base = { id: 'id', seq: 1, type: 't', actor: 'a', timestamp: 't', prevHash: 'h' };
    const h1 = computeEventHash({ ...base, payload: { a: 1 } });
    const h2 = computeEventHash({ ...base, payload: { a: 2 } });
    expect(h1).not.toBe(h2);
  });

  it('is key-order independent (canonical)', () => {
    const h1 = computeEventHash({
      id: 'id', seq: 1, type: 't', actor: 'a',
      payload: { b: 2, a: 1 }, timestamp: 't', prevHash: 'h',
    });
    const h2 = computeEventHash({
      id: 'id', seq: 1, type: 't', actor: 'a',
      payload: { a: 1, b: 2 }, timestamp: 't', prevHash: 'h',
    });
    expect(h1).toBe(h2);
  });
});

describe('signEvent', () => {
  it('adds signature and algorithm to event', () => {
    const { privateKey } = generateKeyPair('ecdsa');
    const ev = createEvent({ type: 't', actor: 'a', payload: { x: 1 } });
    const signed = signEvent(ev, privateKey, 'ecdsa-p256');
    expect(signed.signature).toMatch(/^[0-9a-f]+$/);
    expect(signed.signatureAlgorithm).toBe('ecdsa-p256');
    expect(signed.hash).toBe(ev.hash);
  });

  it('infers ECDSA algorithm from EC key', () => {
    const { privateKey } = generateKeyPair('ecdsa');
    const ev = createEvent({ type: 't', actor: 'a', payload: {} });
    const signed = signEvent(ev, privateKey);
    expect(signed.signatureAlgorithm).toBe('ecdsa-p256');
  });

  it('infers RSA-PSS algorithm from RSA key', () => {
    const { privateKey } = generateKeyPair('rsa');
    const ev = createEvent({ type: 't', actor: 'a', payload: {} });
    const signed = signEvent(ev, privateKey);
    expect(signed.signatureAlgorithm).toBe('rsa-pss');
  });

  it('rejects event without valid hash', () => {
    const { privateKey } = generateKeyPair('ecdsa');
    expect(() => signEvent({ hash: '' } as any, privateKey)).toThrow(EventError);
  });

  it('does not mutate original event', () => {
    const { privateKey } = generateKeyPair('ecdsa');
    const ev = createEvent({ type: 't', actor: 'a', payload: {} });
    const signed = signEvent(ev, privateKey);
    expect(ev.signature).toBeUndefined();
    expect(signed.signature).toBeDefined();
  });
});

describe('verifyEventSignature', () => {
  it('returns true for valid signature', () => {
    const { publicKey, privateKey } = generateKeyPair('ecdsa');
    const ev = createEvent({ type: 't', actor: 'a', payload: { x: 1 } });
    const signed = signEvent(ev, privateKey, 'ecdsa-p256');
    expect(verifyEventSignature(signed, publicKey)).toBe(true);
  });

  it('returns false for wrong public key', () => {
    const { privateKey } = generateKeyPair('ecdsa');
    const { publicKey: wrongKey } = generateKeyPair('ecdsa');
    const ev = createEvent({ type: 't', actor: 'a', payload: { x: 1 } });
    const signed = signEvent(ev, privateKey, 'ecdsa-p256');
    expect(verifyEventSignature(signed, wrongKey)).toBe(false);
  });

  it('returns true for unsigned event when allowUnsigned is true', () => {
    const { publicKey } = generateKeyPair('ecdsa');
    const ev = createEvent({ type: 't', actor: 'a', payload: {} });
    expect(verifyEventSignature(ev, publicKey, true)).toBe(true);
  });

  it('returns false for unsigned event when allowUnsigned is false', () => {
    const { publicKey } = generateKeyPair('ecdsa');
    const ev = createEvent({ type: 't', actor: 'a', payload: {} });
    expect(verifyEventSignature(ev, publicKey, false)).toBe(false);
  });

  it('works with PEM string keys', () => {
    const kp = generateKeyPair('ecdsa');
    const pubPem = exportKeyPem(kp.publicKey, 'public');
    const ev = createEvent({ type: 't', actor: 'a', payload: {} });
    const signed = signEvent(ev, kp.privateKey, 'ecdsa-p256');
    expect(verifyEventSignature(signed, pubPem)).toBe(true);
  });

  it('rejects event with malformed hash', () => {
    const { publicKey } = generateKeyPair('ecdsa');
    expect(() =>
      verifyEventSignature({ hash: 'not-hex', signature: 'abc' } as any, publicKey)
    ).toThrow(EventError);
  });
});

describe('eventKeyId', () => {
  it('returns 64-char hex key id', () => {
    const { publicKey } = generateKeyPair('ecdsa');
    const id = eventKeyId(publicKey);
    expect(id).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is deterministic', () => {
    const { publicKey } = generateKeyPair('ecdsa');
    expect(eventKeyId(publicKey)).toBe(eventKeyId(publicKey));
  });
});

describe('canonicalSerialize', () => {
  it('sorts object keys', () => {
    const buf = canonicalSerialize({ b: 2, a: 1 });
    expect(buf.toString('utf8')).toBe('{"a":1,"b":2}');
  });

  it('omits undefined values', () => {
    const buf = canonicalSerialize({ a: 1, b: undefined, c: 3 });
    expect(buf.toString('utf8')).toBe('{"a":1,"c":3}');
  });

  it('preserves null', () => {
    const buf = canonicalSerialize({ a: null });
    expect(buf.toString('utf8')).toBe('{"a":null}');
  });

  it('rejects NaN', () => {
    expect(() => canonicalSerialize({ a: NaN })).toThrow(LedgerError);
  });

  it('rejects Infinity', () => {
    expect(() => canonicalSerialize({ a: Infinity })).toThrow(LedgerError);
  });

  it('rejects bigint', () => {
    expect(() => canonicalSerialize({ a: BigInt(1) })).toThrow(LedgerError);
  });

  it('rejects cycles', () => {
    const obj: any = { a: 1 };
    obj.self = obj;
    expect(() => canonicalSerialize(obj)).toThrow(LedgerError);
  });

  it('handles nested objects', () => {
    const buf = canonicalSerialize({ x: { b: 2, a: 1 } });
    expect(buf.toString('utf8')).toBe('{"x":{"a":1,"b":2}}');
  });

  it('handles arrays', () => {
    const buf = canonicalSerialize({ arr: [3, 1, 2] });
    expect(buf.toString('utf8')).toBe('{"arr":[3,1,2]}');
  });
});

describe('canonicalSerializeToString', () => {
  it('returns a string', () => {
    const s = canonicalSerializeToString({ a: 1 });
    expect(typeof s).toBe('string');
    expect(s).toBe('{"a":1}');
  });
});
