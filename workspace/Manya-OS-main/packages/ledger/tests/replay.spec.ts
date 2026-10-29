import {
  EventReplayer,
  createEvent,
  GENESIS_PREV_HASH,
  ReplayError,
  LedgerEvent,
} from '@manya-os/ledger';

function makeEvents(): LedgerEvent[] {
  const events: LedgerEvent[] = [];
  let prevHash = GENESIS_PREV_HASH;
  for (let i = 1; i <= 10; i++) {
    const ev = createEvent({
      type: i <= 5 ? 'user.created' : 'config.updated',
      actor: i <= 3 ? 'alice' : i <= 6 ? 'bob' : 'carol',
      payload: { i },
      seq: i,
      prevHash,
      timestamp: `2025-01-01T00:00:${String(i).padStart(2, '0')}.000Z`,
    });
    prevHash = ev.hash;
    events.push(ev);
  }
  return events;
}

describe('EventReplayer', () => {
  describe('replay', () => {
    it('iterates all events with empty filter', () => {
      const events = makeEvents();
      const replayer = new EventReplayer(events);
      const result = [...replayer.replay()];
      expect(result.length).toBe(10);
    });

    it('filters by fromSeq', () => {
      const events = makeEvents();
      const replayer = new EventReplayer(events);
      const result = [...replayer.replay({ fromSeq: 5 })];
      expect(result.length).toBe(6);
      expect(result[0].seq).toBe(5);
    });

    it('filters by toSeq', () => {
      const events = makeEvents();
      const replayer = new EventReplayer(events);
      const result = [...replayer.replay({ toSeq: 3 })];
      expect(result.length).toBe(3);
    });

    it('filters by fromSeq and toSeq', () => {
      const events = makeEvents();
      const replayer = new EventReplayer(events);
      const result = [...replayer.replay({ fromSeq: 3, toSeq: 7 })];
      expect(result.length).toBe(5);
      expect(result[0].seq).toBe(3);
      expect(result[4].seq).toBe(7);
    });

    it('filters by type', () => {
      const events = makeEvents();
      const replayer = new EventReplayer(events);
      const result = [...replayer.replay({ type: 'user.created' })];
      expect(result.length).toBe(5);
      result.forEach((ev) => expect(ev.type).toBe('user.created'));
    });

    it('filters by actor', () => {
      const events = makeEvents();
      const replayer = new EventReplayer(events);
      const result = [...replayer.replay({ actor: 'alice' })];
      expect(result.length).toBe(3);
      result.forEach((ev) => expect(ev.actor).toBe('alice'));
    });

    it('filters by fromTime', () => {
      const events = makeEvents();
      const replayer = new EventReplayer(events);
      const result = [...replayer.replay({ fromTime: '2025-01-01T00:00:05.000Z' })];
      expect(result.length).toBe(6);
      expect(result[0].seq).toBe(5);
    });

    it('filters by toTime', () => {
      const events = makeEvents();
      const replayer = new EventReplayer(events);
      const result = [...replayer.replay({ toTime: '2025-01-01T00:00:03.000Z' })];
      expect(result.length).toBe(3);
    });

    it('accepts epoch-millis for time filters', () => {
      const events = makeEvents();
      const replayer = new EventReplayer(events);
      const fromMs = new Date('2025-01-01T00:00:08.000Z').getTime();
      const result = [...replayer.replay({ fromTime: fromMs })];
      expect(result.length).toBe(3);
    });

    it('rejects invalid fromSeq', () => {
      const replayer = new EventReplayer([]);
      expect(() => [...replayer.replay({ fromSeq: 0 })]).toThrow(ReplayError);
    });

    it('rejects toSeq < fromSeq', () => {
      const replayer = new EventReplayer([]);
      expect(() => [...replayer.replay({ fromSeq: 5, toSeq: 3 })]).toThrow(ReplayError);
    });

    it('rejects invalid fromTime', () => {
      const replayer = new EventReplayer([]);
      expect(() => [...replayer.replay({ fromTime: 'not-a-date' })]).toThrow(ReplayError);
    });

    it('rejects null events', () => {
      expect(() => new EventReplayer(null as any)).toThrow(ReplayError);
    });
  });

  describe('project', () => {
    it('folds events through a reducer', () => {
      const events = makeEvents();
      const replayer = new EventReplayer(events);
      const count = replayer.project(
        (acc, ev) => acc + 1,
        0,
        { type: 'user.created' }
      );
      expect(count).toBe(5);
    });

    it('returns initial state for empty filter', () => {
      const replayer = new EventReplayer([]);
      const result = replayer.project((s) => s, 'initial');
      expect(result).toBe('initial');
    });

    it('rejects non-function reducer', () => {
      const replayer = new EventReplayer([]);
      expect(() => replayer.project(null as any, 0)).toThrow(ReplayError);
    });

    it('wraps reducer errors in ReplayError', () => {
      const events = makeEvents();
      const replayer = new EventReplayer(events);
      expect(() =>
        replayer.project(() => { throw new Error('boom'); }, 0)
      ).toThrow(ReplayError);
    });
  });
});
