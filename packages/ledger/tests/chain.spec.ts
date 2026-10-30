import {
  LedgerChain,
  verifyChain,
  createEvent,
  generateKeyPair,
  signEvent,
  LedgerError,
  ChainError,
  GENESIS_PREV_HASH,
} from '@manya-os/ledger';

describe('LedgerChain', () => {
  describe('genesis behavior', () => {
    it('starts empty', () => {
      const chain = new LedgerChain();
      expect(chain.length()).toBe(0);
      expect(chain.head()).toBeUndefined();
      expect(chain.tail()).toBeUndefined();
    });

    it('genesis event has GENESIS_PREV_HASH', () => {
      const chain = new LedgerChain();
      const ev = chain.append('test.event', 'actor', { value: 1 });
      expect(ev.prevHash).toBe(GENESIS_PREV_HASH);
      expect(ev.seq).toBe(1);
    });
  });

  describe('append', () => {
    it('appends events with correct sequencing', () => {
      const chain = new LedgerChain();
      const e1 = chain.append('event.a', 'alice', { a: 1 });
      const e2 = chain.append('event.b', 'bob', { b: 2 });
      const e3 = chain.append('event.c', 'carol', { c: 3 });

      expect(e1.seq).toBe(1);
      expect(e2.seq).toBe(2);
      expect(e3.seq).toBe(3);
      expect(e2.prevHash).toBe(e1.hash);
      expect(e3.prevHash).toBe(e2.hash);
    });

    it('generates unique hashes for each event', () => {
      const chain = new LedgerChain();
      const e1 = chain.append('event.a', 'alice', { a: 1 });
      const e2 = chain.append('event.b', 'alice', { a: 1 });
      expect(e1.hash).not.toBe(e2.hash);
    });

    it('accepts explicit id and timestamp', () => {
      const chain = new LedgerChain();
      const ev = chain.append('evt', 'actor', { x: 1 }, {
        id: 'custom-id',
        timestamp: '2025-01-01T00:00:00.000Z',
      });
      expect(ev.id).toBe('custom-id');
      expect(ev.timestamp).toBe('2025-01-01T00:00:00.000Z');
    });

    it('accepts metadata', () => {
      const chain = new LedgerChain();
      const ev = chain.append('evt', 'actor', { x: 1 }, {
        metadata: { traceId: 'abc' },
      });
      expect(ev.metadata).toEqual({ traceId: 'abc' });
    });

    it('signs event when privateKey is provided', () => {
      const { privateKey } = generateKeyPair('ecdsa');
      const chain = new LedgerChain();
      const ev = chain.append('evt', 'actor', { x: 1 }, { privateKey });
      expect(ev.signature).toBeDefined();
      expect(ev.signatureAlgorithm).toBe('ecdsa-p256');
    });

    it('rejects empty type', () => {
      const chain = new LedgerChain();
      expect(() => chain.append('', 'actor', {})).toThrow(ChainError);
    });

    it('rejects empty actor', () => {
      const chain = new LedgerChain();
      expect(() => chain.append('evt', '', {})).toThrow(ChainError);
    });

    it('rejects null payload', () => {
      const chain = new LedgerChain();
      expect(() => chain.append('evt', 'actor', null as any)).toThrow(ChainError);
    });

    it('rejects array payload', () => {
      const chain = new LedgerChain();
      expect(() => chain.append('evt', 'actor', [1, 2] as any)).toThrow(ChainError);
    });
  });

  describe('appendEvent', () => {
    it('appends a pre-built event with correct seq and prevHash', () => {
      const chain = new LedgerChain();
      const ev = createEvent({
        type: 'evt',
        actor: 'a',
        payload: { x: 1 },
        seq: 1,
        prevHash: GENESIS_PREV_HASH,
      });
      const result = chain.appendEvent(ev);
      expect(result.seq).toBe(1);
      expect(chain.length()).toBe(1);
    });

    it('rejects event with wrong seq', () => {
      const chain = new LedgerChain();
      const ev = createEvent({
        type: 'evt',
        actor: 'a',
        payload: { x: 1 },
        seq: 5,
        prevHash: GENESIS_PREV_HASH,
      });
      expect(() => chain.appendEvent(ev)).toThrow(ChainError);
    });

    it('rejects event with wrong prevHash', () => {
      const chain = new LedgerChain();
      chain.append('evt', 'a', { x: 1 });
      const ev = createEvent({
        type: 'evt2',
        actor: 'a',
        payload: { x: 2 },
        seq: 2,
        prevHash: '0'.repeat(64),
      });
      expect(() => chain.appendEvent(ev)).toThrow(ChainError);
    });

    it('rejects malformed event', () => {
      const chain = new LedgerChain();
      expect(() => chain.appendEvent(null as any)).toThrow(ChainError);
    });
  });

  describe('head/tail', () => {
    it('head returns the first event (genesis)', () => {
      const chain = new LedgerChain();
      const e1 = chain.append('a', 'actor', { x: 1 });
      chain.append('b', 'actor', { x: 2 });
      expect(chain.head()).toBe(e1);
    });

    it('tail returns the last event', () => {
      const chain = new LedgerChain();
      chain.append('a', 'actor', { x: 1 });
      const e2 = chain.append('b', 'actor', { x: 2 });
      expect(chain.tail()).toBe(e2);
    });
  });

  describe('get and getById', () => {
    it('get by seq returns correct event', () => {
      const chain = new LedgerChain();
      const e1 = chain.append('a', 'actor', { x: 1 });
      const e2 = chain.append('b', 'actor', { x: 2 });
      expect(chain.get(1)).toBe(e1);
      expect(chain.get(2)).toBe(e2);
    });

    it('get out of range returns undefined', () => {
      const chain = new LedgerChain();
      expect(chain.get(1)).toBeUndefined();
      expect(chain.get(0)).toBeUndefined();
      expect(chain.get(-1)).toBeUndefined();
    });

    it('getById returns correct event', () => {
      const chain = new LedgerChain();
      const e1 = chain.append('a', 'actor', { x: 1 }, { id: 'my-id' });
      expect(chain.getById('my-id')).toBe(e1);
      expect(chain.getById('nonexistent')).toBeUndefined();
    });
  });

  describe('all', () => {
    it('returns a shallow copy', () => {
      const chain = new LedgerChain();
      chain.append('a', 'actor', { x: 1 });
      const events = chain.all();
      expect(events.length).toBe(1);
      events.push(null as any);
      expect(chain.length()).toBe(1);
    });
  });

  describe('replaceAll', () => {
    it('replaces chain contents', () => {
      const chain = new LedgerChain();
      chain.append('a', 'actor', { x: 1 });
      const newEvents = [
        createEvent({ type: 'new', actor: 'b', payload: { y: 2 }, seq: 1, prevHash: GENESIS_PREV_HASH }),
      ];
      chain.replaceAll(newEvents);
      expect(chain.length()).toBe(1);
      expect(chain.head()!.type).toBe('new');
    });

    it('rejects non-array', () => {
      const chain = new LedgerChain();
      expect(() => chain.replaceAll(null as any)).toThrow(ChainError);
    });
  });

  describe('length', () => {
    it('returns 0 for empty chain', () => {
      expect(new LedgerChain().length()).toBe(0);
    });

    it('increments with each append', () => {
      const chain = new LedgerChain();
      chain.append('a', 'actor', { x: 1 });
      expect(chain.length()).toBe(1);
      chain.append('b', 'actor', { x: 2 });
      expect(chain.length()).toBe(2);
    });
  });
});

describe('verifyChain', () => {
  it('returns valid for empty array', () => {
    expect(verifyChain([])).toEqual({ valid: true });
  });

  it('returns valid for a single valid event', () => {
    const chain = new LedgerChain();
    chain.append('evt', 'actor', { x: 1 });
    const result = verifyChain(chain.all());
    expect(result.valid).toBe(true);
  });

  it('returns valid for a correctly chained sequence', () => {
    const chain = new LedgerChain();
    for (let i = 0; i < 5; i++) {
      chain.append('evt', 'actor', { i });
    }
    expect(verifyChain(chain.all()).valid).toBe(true);
  });

  it('detects hash tampering', () => {
    const chain = new LedgerChain();
    chain.append('a', 'actor', { x: 1 });
    chain.append('b', 'actor', { x: 2 });
    const events = chain.all();
    events[0].hash = 'ff'.repeat(32);
    const result = verifyChain(events);
    expect(result.valid).toBe(false);
    expect(result.firstBrokenIndex).toBeDefined();
  });

  it('detects broken prevHash linkage', () => {
    const chain = new LedgerChain();
    chain.append('a', 'actor', { x: 1 });
    chain.append('b', 'actor', { x: 2 });
    const events = chain.all();
    events[1].prevHash = 'ff'.repeat(32);
    const result = verifyChain(events);
    expect(result.valid).toBe(false);
  });

  it('detects out-of-order sequence numbers', () => {
    const events = [
      createEvent({ type: 'a', actor: 'x', payload: {}, seq: 1, prevHash: GENESIS_PREV_HASH }),
      createEvent({ type: 'b', actor: 'x', payload: {}, seq: 3, prevHash: '0'.repeat(64) }),
    ];
    const result = verifyChain(events, { checkSeqContiguity: true });
    expect(result.valid).toBe(false);
  });

  it('validates optional signature verification', () => {
    const { publicKey, privateKey } = generateKeyPair('ecdsa');
    const chain = new LedgerChain();
    chain.append('evt', 'alice', { x: 1 }, { privateKey });
    chain.append('evt2', 'alice', { x: 2 }, { privateKey });

    const result = verifyChain(chain.all(), {
      publicKeys: { alice: publicKey },
      requireSignatures: true,
    });
    expect(result.valid).toBe(true);
  });

  it('rejects unsigned events when requireSignatures is true', () => {
    const chain = new LedgerChain();
    chain.append('evt', 'alice', { x: 1 });

    const result = verifyChain(chain.all(), { requireSignatures: true });
    expect(result.valid).toBe(false);
  });

  it('rejects non-array input', () => {
    const result = verifyChain(null as any);
    expect(result.valid).toBe(false);
  });
});
